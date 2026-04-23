-- Adiciona data da próxima sessão em campaign_details
ALTER TABLE public.campaign_details
  ADD COLUMN IF NOT EXISTS next_session_date timestamp with time zone;

-- Cria tabela de confirmações de presença
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id uuid NOT NULL,
  player_id uuid NOT NULL,
  next_session_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'confirmed' | 'declined' | 'pending'
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (table_id, player_id, next_session_date)
);

ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

-- Validação de status
CREATE OR REPLACE FUNCTION public.validate_attendance_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('confirmed','declined','pending') THEN
    RAISE EXCEPTION 'invalid_status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_attendance_status ON public.session_attendance;
CREATE TRIGGER trg_validate_attendance_status
  BEFORE INSERT OR UPDATE ON public.session_attendance
  FOR EACH ROW EXECUTE FUNCTION public.validate_attendance_status();

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.session_attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.session_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: jogadores aceitos podem inserir/atualizar a própria confirmação
CREATE POLICY "Accepted players manage own attendance insert"
ON public.session_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM public.table_applications ta
    WHERE ta.table_id = session_attendance.table_id
      AND ta.player_id = auth.uid()
      AND ta.status = 'accepted'
  )
);

CREATE POLICY "Players update own attendance"
ON public.session_attendance
FOR UPDATE
TO authenticated
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players delete own attendance"
ON public.session_attendance
FOR DELETE
TO authenticated
USING (auth.uid() = player_id);

-- RLS: participantes da mesa (mestre + jogadores aceitos) veem todas as confirmações
CREATE POLICY "Participants view attendance"
ON public.session_attendance
FOR SELECT
TO authenticated
USING (public.is_table_participant(table_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_attendance_table_date
  ON public.session_attendance (table_id, next_session_date);