ALTER TABLE public.session_feedback
  ADD COLUMN IF NOT EXISTS session_log_id uuid REFERENCES public.session_logs(id) ON DELETE CASCADE;

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
  _feedback jsonb DEFAULT '[]'::jsonb,
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
  -- Validate master and lock table row
  SELECT master_id INTO v_master_id FROM public.tables WHERE id = _table_id FOR UPDATE;
  IF v_master_id IS NULL OR v_master_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized_to_close_session';
  END IF;

  IF COALESCE(trim(_title), '') = '' THEN
    RAISE EXCEPTION 'session_title_required';
  END IF;

  -- Calculate session number
  SELECT COALESCE(MAX(session_number), 0) + 1 INTO v_session_number
  FROM public.session_logs WHERE table_id = _table_id;

  -- Create session log
  INSERT INTO public.session_logs (table_id, session_number, session_date, title, master_narrative)
  VALUES (_table_id, v_session_number, COALESCE(_session_date, CURRENT_DATE), trim(_title), COALESCE(_master_narrative, ''))
  RETURNING id INTO v_session_id;

  -- Record presence
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(_presence, '[]'::jsonb)) LOOP
    v_player_id := (v_item->>'player_id')::uuid;
    v_status := v_item->>'status';
    
    IF v_status NOT IN ('attended', 'excused', 'no_show') THEN 
      RAISE EXCEPTION 'invalid_presence_status'; 
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.table_applications
      WHERE table_id = _table_id AND player_id = v_player_id AND status = 'accepted'
    ) THEN 
      RAISE EXCEPTION 'player_is_not_accepted'; 
    END IF;

    INSERT INTO public.session_presence (
      session_log_id, table_id, player_id, status, had_prior_notice, master_note, marked_by
    ) VALUES (
      v_session_id, _table_id, v_player_id, v_status,
      COALESCE((v_item->>'had_prior_notice')::boolean, false), 
      COALESCE(v_item->>'master_note', ''), 
      auth.uid()
    );
  END LOOP;

  -- Record feedback (if any)
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(_feedback, '[]'::jsonb)) LOOP
    INSERT INTO public.session_feedback (
      table_id, session_log_id, session_number, reviewer_id, reviewed_id,
      reviewer_role, rating_1, rating_2, rating_3, compliments
    ) VALUES (
      _table_id, v_session_id, v_session_number, auth.uid(), 
      (v_item->>'reviewed_id')::uuid,
      'master', 
      (v_item->>'rating_1')::int, 
      (v_item->>'rating_2')::int, 
      (v_item->>'rating_3')::int,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_item->'compliments')), '{}'::text[])
    );
  END LOOP;

  -- Handle notification suppression if needed
  -- The trigger trg_notify_new_session is AFTER INSERT on session_logs
  IF NOT _notify_players THEN
    DELETE FROM public.notifications
    WHERE related_table_id = _table_id
      AND type = 'new_session'
      AND created_at >= (SELECT created_at FROM public.session_logs WHERE id = v_session_id);
  END IF;

  RETURN jsonb_build_object('session_log_id', v_session_id, 'session_number', v_session_number);
END;
$$;

REVOKE ALL ON FUNCTION public.close_table_session(uuid, date, text, text, jsonb, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_table_session(uuid, date, text, text, jsonb, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_table_session(uuid, date, text, text, jsonb, jsonb, boolean) TO service_role;
