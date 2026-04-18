-- Tabela de notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  related_table_id UUID,
  related_user_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Habilitar realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: nova candidatura → notifica mestre
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_id UUID;
  v_table_title TEXT;
  v_player_name TEXT;
BEGIN
  SELECT master_id, title INTO v_master_id, v_table_title
  FROM public.tables WHERE id = NEW.table_id;

  SELECT COALESCE(display_name, 'Um jogador') INTO v_player_name
  FROM public.profiles WHERE id = NEW.player_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id, related_user_id)
  VALUES (
    v_master_id,
    'new_application',
    'Nova candidatura',
    v_player_name || ' se candidatou para "' || v_table_title || '"',
    '/dashboard/mesa/' || NEW.table_id::text,
    NEW.table_id,
    NEW.player_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_application
AFTER INSERT ON public.table_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

-- Trigger: status candidatura mudou → notifica jogador
CREATE OR REPLACE FUNCTION public.notify_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_title TEXT;
  v_msg TEXT;
  v_title TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_table_title FROM public.tables WHERE id = NEW.table_id;

  IF NEW.status = 'accepted' THEN
    v_title := 'Candidatura aceita!';
    v_msg := 'Você foi aceito na mesa "' || v_table_title || '"';
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'Candidatura recusada';
    v_msg := 'Sua candidatura para "' || v_table_title || '" não foi aceita';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id)
  VALUES (NEW.player_id, 'application_' || NEW.status, v_title, v_msg, '/dashboard/mesa/' || NEW.table_id::text, NEW.table_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_application_status
AFTER UPDATE ON public.table_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_application_status();

-- Trigger: nova sessão → notifica jogadores aceitos
CREATE OR REPLACE FUNCTION public.notify_new_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_title TEXT;
BEGIN
  SELECT title INTO v_table_title FROM public.tables WHERE id = NEW.table_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id)
  SELECT
    ta.player_id,
    'new_session',
    'Nova sessão registrada',
    'Sessão "' || NEW.title || '" foi criada em "' || v_table_title || '"',
    '/dashboard/mesa/' || NEW.table_id::text,
    NEW.table_id
  FROM public.table_applications ta
  WHERE ta.table_id = NEW.table_id AND ta.status = 'accepted';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_session
AFTER INSERT ON public.session_logs
FOR EACH ROW EXECUTE FUNCTION public.notify_new_session();

-- Trigger: novo relatório de jogador → notifica mestre + outros jogadores aceitos
CREATE OR REPLACE FUNCTION public.notify_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_id UUID;
  v_table_title TEXT;
  v_master_id UUID;
  v_author TEXT;
BEGIN
  SELECT sl.table_id INTO v_table_id FROM public.session_logs sl WHERE sl.id = NEW.session_log_id;
  SELECT master_id, title INTO v_master_id, v_table_title FROM public.tables WHERE id = v_table_id;
  SELECT COALESCE(display_name, NEW.character_name) INTO v_author FROM public.profiles WHERE id = NEW.player_id;

  -- Notifica mestre (se não for o autor)
  IF v_master_id <> NEW.player_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id, related_user_id)
    VALUES (v_master_id, 'new_report', 'Novo relatório', v_author || ' publicou um relatório em "' || v_table_title || '"',
      '/dashboard/mesa/' || v_table_id::text, v_table_id, NEW.player_id);
  END IF;

  -- Notifica outros jogadores aceitos
  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id, related_user_id)
  SELECT ta.player_id, 'new_report', 'Novo relatório',
    v_author || ' publicou um relatório em "' || v_table_title || '"',
    '/dashboard/mesa/' || v_table_id::text, v_table_id, NEW.player_id
  FROM public.table_applications ta
  WHERE ta.table_id = v_table_id AND ta.status = 'accepted' AND ta.player_id <> NEW.player_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_report
AFTER INSERT ON public.player_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_new_report();

-- Trigger: nova avaliação → notifica avaliado
CREATE OR REPLACE FUNCTION public.notify_new_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer_name TEXT;
BEGIN
  SELECT COALESCE(display_name, 'Alguém') INTO v_reviewer_name FROM public.profiles WHERE id = NEW.reviewer_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id, related_user_id)
  VALUES (NEW.reviewed_id, 'new_feedback', 'Nova avaliação',
    v_reviewer_name || ' deixou uma avaliação para você',
    '/dashboard/perfil', NEW.table_id, NEW.reviewer_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_feedback
AFTER INSERT ON public.session_feedback
FOR EACH ROW EXECUTE FUNCTION public.notify_new_feedback();