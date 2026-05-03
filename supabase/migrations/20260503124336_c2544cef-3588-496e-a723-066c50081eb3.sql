
REVOKE EXECUTE ON FUNCTION public.grant_tokens(uuid, integer, text, uuid) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.grant_tokens(
  _user_id uuid,
  _amount integer,
  _reason text,
  _related_table_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NOT NULL AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.profiles
     SET tokens_balance = tokens_balance + _amount,
         updated_at = now()
   WHERE id = _user_id
   RETURNING tokens_balance INTO v_new_balance;

  INSERT INTO public.token_transactions (user_id, delta, reason, related_table_id)
  VALUES (_user_id, _amount, _reason, _related_table_id);

  RETURN v_new_balance;
END;
$$;

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe to allowed topics" ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to allowed topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = 'user:' || auth.uid()::text)
  OR (realtime.topic() = 'notifications:' || auth.uid()::text)
  OR (realtime.topic() IN ('global_chat', 'public', 'lobby'))
  OR (
    split_part(realtime.topic(), ':', 1) IN ('mesa','table','mesa_chat','session')
    AND EXISTS (
      SELECT 1
      FROM public.tables t
      WHERE t.id::text = split_part(realtime.topic(), ':', 2)
        AND (
          t.master_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.table_applications ta
            WHERE ta.table_id = t.id
              AND ta.player_id = auth.uid()
              AND ta.status = 'accepted'
          )
        )
    )
  )
  OR (split_part(realtime.topic(), ':', 1) = 'realtime')
);
