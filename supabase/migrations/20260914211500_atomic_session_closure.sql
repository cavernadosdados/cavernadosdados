ALTER TABLE public.session_feedback
  ADD COLUMN IF NOT EXISTS session_log_id uuid REFERENCES public.session_logs(id) ON DELETE CASCADE;

ALTER TABLE public.session_logs
  ADD COLUMN IF NOT EXISTS notify_players boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS session_logs_table_number_unique
  ON public.session_logs (table_id, session_number);

CREATE UNIQUE INDEX IF NOT EXISTS session_feedback_session_reviewer_reviewed_unique
  ON public.session_feedback (session_log_id, reviewer_id, reviewed_id)
  WHERE session_log_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.close_table_session(
  _table_id uuid,
  _session_date date,
  _title text,
  _master_narrative text,
  _presence jsonb DEFAULT '[]'::jsonb,
  _notify_players boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_id uuid;
  v_session_id uuid;
  v_session_number integer;
  v_item jsonb;
  v_player_id uuid;
  v_status text;
BEGIN
  SELECT master_id INTO v_master_id FROM public.tables WHERE id = _table_id FOR UPDATE;
  IF v_master_id IS NULL OR v_master_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized_to_close_session';
  END IF;
  IF COALESCE(trim(_title), '') = '' THEN
    RAISE EXCEPTION 'session_title_required';
  END IF;

  SELECT COALESCE(MAX(session_number), 0) + 1 INTO v_session_number
  FROM public.session_logs WHERE table_id = _table_id;

  INSERT INTO public.session_logs (table_id, session_number, session_date, title, master_narrative, notify_players)
  VALUES (_table_id, v_session_number, COALESCE(_session_date, CURRENT_DATE), trim(_title), COALESCE(_master_narrative, ''), _notify_players)
  RETURNING id INTO v_session_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(_presence, '[]'::jsonb)) LOOP
    v_player_id := (v_item->>'player_id')::uuid;
    v_status := v_item->>'status';
    IF v_status NOT IN ('attended', 'excused', 'no_show') THEN RAISE EXCEPTION 'invalid_presence_status'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.table_applications
      WHERE table_id = _table_id AND player_id = v_player_id AND status = 'accepted'
    ) THEN RAISE EXCEPTION 'player_is_not_accepted'; END IF;

    INSERT INTO public.session_presence (
      session_log_id, table_id, player_id, status, had_prior_notice, master_note, marked_by
    ) VALUES (
      v_session_id, _table_id, v_player_id, v_status,
      COALESCE((v_item->>'had_prior_notice')::boolean, false), COALESCE(v_item->>'master_note', ''), auth.uid()
    );
  END LOOP;


  RETURN jsonb_build_object('session_log_id', v_session_id, 'session_number', v_session_number);
END;
$$;

REVOKE ALL ON FUNCTION public.close_table_session(uuid, date, text, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_table_session(uuid, date, text, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_table_session(uuid, date, text, text, jsonb, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_new_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_title TEXT;
BEGIN
  IF NOT NEW.notify_players THEN RETURN NEW; END IF;
  SELECT title INTO v_table_title FROM public.tables WHERE id = NEW.table_id;
  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id)
  SELECT ta.player_id, 'new_session', 'Nova sessão registrada',
    'Sessão "' || NEW.title || '" foi criada em "' || v_table_title || '"',
    '/dashboard/mesa/' || NEW.table_id::text, NEW.table_id
  FROM public.table_applications ta
  WHERE ta.table_id = NEW.table_id AND ta.status = 'accepted';
  RETURN NEW;
END;
$$;
