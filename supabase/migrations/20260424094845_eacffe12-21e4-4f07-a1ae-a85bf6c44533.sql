-- Harden notifications: users should not forge notifications, only manage their own read state
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "Users can update own notification read state"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.prevent_notification_content_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.link IS DISTINCT FROM OLD.link
    OR NEW.related_table_id IS DISTINCT FROM OLD.related_table_id
    OR NEW.related_user_id IS DISTINCT FROM OLD.related_user_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'notification_content_is_immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_notification_content_update ON public.notifications;
CREATE TRIGGER prevent_notification_content_update
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.prevent_notification_content_update();

-- Harden session feedback creation to real table participants only
CREATE OR REPLACE FUNCTION public.can_create_session_feedback(
  _table_id uuid,
  _reviewer_id uuid,
  _reviewed_id uuid,
  _reviewer_role text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _reviewer_id = auth.uid()
    AND _reviewer_id IS NOT NULL
    AND _reviewed_id IS NOT NULL
    AND _reviewer_id <> _reviewed_id
    AND _reviewer_role IN ('player', 'master')
    AND (
      (
        _reviewer_role = 'player'
        AND EXISTS (
          SELECT 1
          FROM public.table_applications ta
          WHERE ta.table_id = _table_id
            AND ta.player_id = _reviewer_id
            AND ta.status = 'accepted'
        )
        AND EXISTS (
          SELECT 1
          FROM public.tables t
          WHERE t.id = _table_id
            AND t.master_id = _reviewed_id
        )
      )
      OR
      (
        _reviewer_role = 'master'
        AND EXISTS (
          SELECT 1
          FROM public.tables t
          WHERE t.id = _table_id
            AND t.master_id = _reviewer_id
        )
        AND EXISTS (
          SELECT 1
          FROM public.table_applications ta
          WHERE ta.table_id = _table_id
            AND ta.player_id = _reviewed_id
            AND ta.status = 'accepted'
        )
      )
    );
$$;

DROP POLICY IF EXISTS "Users can create feedback" ON public.session_feedback;
CREATE POLICY "Participants can create valid session feedback"
ON public.session_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_create_session_feedback(table_id, reviewer_id, reviewed_id, reviewer_role)
);

CREATE OR REPLACE FUNCTION public.validate_session_feedback_values()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating_1 NOT BETWEEN 1 AND 5
    OR NEW.rating_2 NOT BETWEEN 1 AND 5
    OR NEW.rating_3 NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'invalid_feedback_rating';
  END IF;

  IF NEW.session_number < 1 THEN
    RAISE EXCEPTION 'invalid_session_number';
  END IF;

  IF NOT public.can_create_session_feedback(NEW.table_id, NEW.reviewer_id, NEW.reviewed_id, NEW.reviewer_role) THEN
    RAISE EXCEPTION 'not_authorized_for_feedback';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_session_feedback_values ON public.session_feedback;
CREATE TRIGGER validate_session_feedback_values
BEFORE INSERT ON public.session_feedback
FOR EACH ROW
EXECUTE FUNCTION public.validate_session_feedback_values();

-- Helper for realtime session-log topics
CREATE OR REPLACE FUNCTION public.is_session_log_participant(_session_log_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.session_logs sl
    WHERE sl.id = _session_log_id
      AND public.is_table_participant(sl.table_id, _user_id)
  );
$$;

-- Realtime Broadcast/Presence authorization. Postgres-change payloads remain protected by table RLS.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Users can access authorized realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Users can send to authorized realtime topics" ON realtime.messages;

CREATE POLICY "Users can access authorized realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'global_chat_rt'
  OR realtime.topic() = 'table_boosts_realtime'
  OR realtime.topic() = ('notifications:' || auth.uid()::text)
  OR realtime.topic() = ('tokens_' || auth.uid()::text)
  OR realtime.topic() = ('slots_' || auth.uid()::text)
  OR realtime.topic() = ('mesa-unread-' || auth.uid()::text)
  OR (
    realtime.topic() LIKE 'mesa_chat_%'
    AND public.is_table_participant(replace(realtime.topic(), 'mesa_chat_', '')::uuid, auth.uid())
  )
  OR (
    realtime.topic() LIKE 'table-status-%'
    AND public.is_table_participant(replace(realtime.topic(), 'table-status-', '')::uuid, auth.uid())
  )
  OR (
    realtime.topic() LIKE 'diary-%'
    AND public.is_session_log_participant(replace(realtime.topic(), 'diary-', '')::uuid, auth.uid())
  )
);

CREATE POLICY "Users can send to authorized realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'global_chat_rt'
  OR realtime.topic() = 'table_boosts_realtime'
  OR realtime.topic() = ('notifications:' || auth.uid()::text)
  OR realtime.topic() = ('tokens_' || auth.uid()::text)
  OR realtime.topic() = ('slots_' || auth.uid()::text)
  OR realtime.topic() = ('mesa-unread-' || auth.uid()::text)
  OR (
    realtime.topic() LIKE 'mesa_chat_%'
    AND public.is_table_participant(replace(realtime.topic(), 'mesa_chat_', '')::uuid, auth.uid())
  )
  OR (
    realtime.topic() LIKE 'table-status-%'
    AND public.is_table_participant(replace(realtime.topic(), 'table-status-', '')::uuid, auth.uid())
  )
  OR (
    realtime.topic() LIKE 'diary-%'
    AND public.is_session_log_participant(replace(realtime.topic(), 'diary-', '')::uuid, auth.uid())
  )
);