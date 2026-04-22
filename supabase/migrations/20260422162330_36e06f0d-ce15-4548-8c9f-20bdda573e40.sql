-- Tracks the last time a user read a table's chat, used to compute unread counts.
CREATE TABLE public.mesa_chat_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, table_id)
);

CREATE INDEX idx_mesa_chat_reads_user ON public.mesa_chat_reads (user_id);
CREATE INDEX idx_mesa_chat_reads_user_table ON public.mesa_chat_reads (user_id, table_id);

ALTER TABLE public.mesa_chat_reads ENABLE ROW LEVEL SECURITY;

-- Each user can only see/manage their own read markers
CREATE POLICY "Users view own chat reads"
  ON public.mesa_chat_reads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own chat reads"
  ON public.mesa_chat_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_table_participant(table_id, auth.uid()));

CREATE POLICY "Users update own chat reads"
  ON public.mesa_chat_reads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER mesa_chat_reads_set_updated_at
  BEFORE UPDATE ON public.mesa_chat_reads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();