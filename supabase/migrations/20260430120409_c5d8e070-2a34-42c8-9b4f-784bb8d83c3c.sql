-- Tabela de presença por sessão
CREATE TABLE public.session_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_log_id uuid NOT NULL,
  table_id uuid NOT NULL,
  player_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'attended',
  -- attended | excused | no_show
  had_prior_notice boolean NOT NULL DEFAULT false,
  master_note text DEFAULT '',
  player_justification text DEFAULT '',
  justification_status text DEFAULT 'none',
  -- none | pending | accepted | rejected
  marked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_log_id, player_id)
);

CREATE INDEX idx_session_presence_table ON public.session_presence(table_id);
CREATE INDEX idx_session_presence_player ON public.session_presence(player_id);
CREATE INDEX idx_session_presence_status ON public.session_presence(status);

ALTER TABLE public.session_presence ENABLE ROW LEVEL SECURITY;

-- Validação de status
CREATE OR REPLACE FUNCTION public.validate_session_presence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('attended','excused','no_show') THEN
    RAISE EXCEPTION 'invalid_status: %', NEW.status;
  END IF;
  IF NEW.justification_status NOT IN ('none','pending','accepted','rejected') THEN
    RAISE EXCEPTION 'invalid_justification_status: %', NEW.justification_status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_session_presence
BEFORE INSERT OR UPDATE ON public.session_presence
FOR EACH ROW EXECUTE FUNCTION public.validate_session_presence();

-- RLS: mestre da mesa gerencia tudo
CREATE POLICY "Masters manage presence"
ON public.session_presence
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tables t WHERE t.id = session_presence.table_id AND t.master_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tables t WHERE t.id = session_presence.table_id AND t.master_id = auth.uid())
);

-- RLS: jogador vê seus próprios registros (e os da mesa)
CREATE POLICY "Participants view presence"
ON public.session_presence
FOR SELECT
TO authenticated
USING (public.is_table_participant(table_id, auth.uid()));

-- RLS: jogador pode atualizar APENAS sua justificativa quando foi marcado como no_show
CREATE POLICY "Players submit own justification"
ON public.session_presence
FOR UPDATE
TO authenticated
USING (auth.uid() = player_id AND status = 'no_show')
WITH CHECK (auth.uid() = player_id AND status = 'no_show');

-- Função: índice de confiabilidade do jogador
CREATE OR REPLACE FUNCTION public.get_player_reliability(_player_id uuid)
RETURNS TABLE(
  total_sessions integer,
  attended integer,
  excused integer,
  no_shows integer,
  reliability_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH s AS (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'attended')::int AS att,
      COUNT(*) FILTER (WHERE status = 'excused')::int AS exc,
      COUNT(*) FILTER (WHERE status = 'no_show')::int AS ns
    FROM public.session_presence
    WHERE player_id = _player_id
  )
  SELECT
    s.total,
    s.att,
    s.exc,
    s.ns,
    CASE
      WHEN (s.att + s.ns) = 0 THEN 100::numeric
      ELSE ROUND((s.att::numeric / (s.att + s.ns)::numeric) * 100, 1)
    END AS reliability_pct
  FROM s;
$$;

-- Notificação: jogador marcado como no-show
CREATE OR REPLACE FUNCTION public.notify_no_show()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_table_title text;
BEGIN
  IF NEW.status = 'no_show' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT title INTO v_table_title FROM public.tables WHERE id = NEW.table_id;
    INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id)
    VALUES (
      NEW.player_id,
      'no_show_marked',
      '⚠️ Falta registrada',
      'Você foi marcado como ausente em "' || COALESCE(v_table_title,'') || '". Você pode enviar uma justificativa.',
      '/dashboard/mesa/' || NEW.table_id::text,
      NEW.table_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_no_show
AFTER INSERT OR UPDATE ON public.session_presence
FOR EACH ROW EXECUTE FUNCTION public.notify_no_show();

-- Notificação: mestre recebe justificativa
CREATE OR REPLACE FUNCTION public.notify_justification_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_master uuid;
  v_table_title text;
  v_player_name text;
BEGIN
  IF NEW.justification_status = 'pending'
     AND (TG_OP = 'INSERT' OR OLD.justification_status IS DISTINCT FROM NEW.justification_status) THEN
    SELECT master_id, title INTO v_master, v_table_title FROM public.tables WHERE id = NEW.table_id;
    SELECT COALESCE(display_name, 'Jogador') INTO v_player_name FROM public.profiles WHERE id = NEW.player_id;
    IF v_master IS NOT NULL AND v_master <> NEW.player_id THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id, related_user_id)
      VALUES (
        v_master,
        'no_show_justification',
        '📨 Justificativa de ausência',
        v_player_name || ' enviou uma justificativa de falta em "' || COALESCE(v_table_title,'') || '"',
        '/dashboard/mesa/' || NEW.table_id::text,
        NEW.table_id,
        NEW.player_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_justification
AFTER INSERT OR UPDATE ON public.session_presence
FOR EACH ROW EXECUTE FUNCTION public.notify_justification_submitted();
