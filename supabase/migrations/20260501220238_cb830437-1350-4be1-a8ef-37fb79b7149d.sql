
-- 1. Add disabled_reason / disabled_at columns to tables
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS disabled_reason text,
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

-- 2. Function: admin disables a table with a reason
CREATE OR REPLACE FUNCTION public.admin_disable_table(_table_id uuid, _reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_master uuid;
  v_title text;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT master_id, title INTO v_master, v_title FROM public.tables WHERE id = _table_id;
  IF v_master IS NULL THEN
    RAISE EXCEPTION 'table_not_found';
  END IF;

  UPDATE public.tables
     SET status = 'under_review',
         disabled_reason = _reason,
         disabled_at = now(),
         updated_at = now()
   WHERE id = _table_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id)
  VALUES (
    v_master,
    'table_disabled_by_admin',
    '🚫 Mesa desabilitada pela moderação',
    'Sua mesa "' || COALESCE(v_title,'') || '" foi desabilitada. Motivo: ' || _reason || '. Edite a mesa para reativá-la.',
    '/dashboard/mesa/' || _table_id::text,
    _table_id
  );

  RETURN true;
END;
$$;

-- 3. Function: admin marks a report as resolved/dismissed
CREATE OR REPLACE FUNCTION public.admin_resolve_report(_report_id uuid, _new_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _new_status NOT IN ('resolved','dismissed','pending') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  UPDATE public.reports
     SET status = _new_status,
         reviewed_at = CASE WHEN _new_status = 'pending' THEN NULL ELSE now() END,
         reviewed_by = CASE WHEN _new_status = 'pending' THEN NULL ELSE v_user END
   WHERE id = _report_id;

  RETURN true;
END;
$$;

-- 4. Trigger: when master edits a disabled table, auto-reopen + clear reason
CREATE OR REPLACE FUNCTION public.auto_reopen_on_master_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when master themselves edits the table while it's disabled
  IF OLD.disabled_reason IS NOT NULL
     AND auth.uid() = OLD.master_id
     AND OLD.status = 'under_review' THEN
    -- Detect a meaningful edit (anything other than just status/disabled fields)
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.cover_url IS DISTINCT FROM OLD.cover_url
       OR NEW.system IS DISTINCT FROM OLD.system
       OR NEW.theme IS DISTINCT FROM OLD.theme
       OR NEW.is_adult_only IS DISTINCT FROM OLD.is_adult_only THEN
      NEW.status := 'open';
      NEW.disabled_reason := NULL;
      NEW.disabled_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_reopen_on_master_edit ON public.tables;
CREATE TRIGGER trg_auto_reopen_on_master_edit
BEFORE UPDATE ON public.tables
FOR EACH ROW
EXECUTE FUNCTION public.auto_reopen_on_master_edit();
