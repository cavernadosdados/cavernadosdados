
-- Trigger que notifica o mestre quando um jogador atualiza presença
CREATE OR REPLACE FUNCTION public.notify_attendance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_master_id UUID;
  v_table_title TEXT;
  v_player_name TEXT;
  v_status_label TEXT;
  v_title TEXT;
BEGIN
  -- Em UPDATE, só notifica se o status realmente mudou
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT master_id, title INTO v_master_id, v_table_title
  FROM public.tables WHERE id = NEW.table_id;

  -- Não notifica se o próprio mestre marcou presença (caso participe)
  IF v_master_id IS NULL OR v_master_id = NEW.player_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'Um jogador') INTO v_player_name
  FROM public.profiles WHERE id = NEW.player_id;

  IF NEW.status = 'confirmed' THEN
    v_title := '✅ Presença confirmada';
    v_status_label := 'confirmou presença';
  ELSIF NEW.status = 'declined' THEN
    v_title := '❌ Ausência informada';
    v_status_label := 'não vai comparecer';
  ELSE
    v_title := '🕓 Presença pendente';
    v_status_label := 'marcou presença como pendente';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id, related_user_id)
  VALUES (
    v_master_id,
    'attendance_' || NEW.status,
    v_title,
    v_player_name || ' ' || v_status_label || ' em "' || v_table_title || '"',
    '/dashboard/mesa/' || NEW.table_id::text,
    NEW.table_id,
    NEW.player_id
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_attendance_change ON public.session_attendance;
CREATE TRIGGER trg_notify_attendance_change
AFTER INSERT OR UPDATE ON public.session_attendance
FOR EACH ROW
EXECUTE FUNCTION public.notify_attendance_change();
