-- Trigger que notifica os jogadores aceitos quando o mestre define/altera a data da próxima sessão
CREATE OR REPLACE FUNCTION public.notify_next_session_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_table_title TEXT;
  v_master_id UUID;
  v_when TEXT;
BEGIN
  -- Só notifica se houver uma data futura definida
  IF NEW.next_session_date IS NULL OR NEW.next_session_date <= now() THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, só notifica se a data realmente mudou
  IF TG_OP = 'UPDATE' AND OLD.next_session_date IS NOT DISTINCT FROM NEW.next_session_date THEN
    RETURN NEW;
  END IF;

  SELECT title, master_id INTO v_table_title, v_master_id
  FROM public.tables WHERE id = NEW.table_id;

  IF v_master_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_when := to_char(NEW.next_session_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id)
  SELECT
    ta.player_id,
    'next_session_scheduled',
    '📅 Próxima sessão agendada',
    'A próxima sessão de "' || v_table_title || '" foi marcada para ' || v_when || '. Confirme sua presença!',
    '/dashboard/mesa/' || NEW.table_id::text,
    NEW.table_id
  FROM public.table_applications ta
  WHERE ta.table_id = NEW.table_id
    AND ta.status = 'accepted'
    AND ta.player_id <> v_master_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_next_session_scheduled ON public.campaign_details;
CREATE TRIGGER trg_notify_next_session_scheduled
AFTER INSERT OR UPDATE OF next_session_date ON public.campaign_details
FOR EACH ROW
EXECUTE FUNCTION public.notify_next_session_scheduled();