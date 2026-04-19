-- 1. Função security definer para checar participação (evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_table_participant(_table_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tables t
    WHERE t.id = _table_id AND t.master_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.table_applications ta
    WHERE ta.table_id = _table_id
      AND ta.player_id = _user_id
      AND ta.status = 'accepted'
  );
$$;

-- 2. Tabela de mensagens
CREATE TABLE public.mesa_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mesa_chat_table_created ON public.mesa_chat_messages(table_id, created_at DESC);

-- 3. RLS
ALTER TABLE public.mesa_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view table chat"
  ON public.mesa_chat_messages FOR SELECT
  TO authenticated
  USING (public.is_table_participant(table_id, auth.uid()));

CREATE POLICY "Participants can send messages"
  ON public.mesa_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_table_participant(table_id, auth.uid())
  );

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa_chat_messages;
ALTER TABLE public.mesa_chat_messages REPLICA IDENTITY FULL;