-- 1. Tabela global_chat
CREATE TABLE public.global_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 280),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_global_chat_created_at ON public.global_chat (created_at DESC);
CREATE INDEX idx_global_chat_user_recent ON public.global_chat (user_id, created_at DESC);

-- 2. RLS
ALTER TABLE public.global_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view chat"
  ON public.global_chat FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can send own messages"
  ON public.global_chat FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- (sem update, sem delete para usuários comuns)

-- 3. Trigger: rate limit de 5 segundos por usuário (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.enforce_chat_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_at timestamptz;
BEGIN
  SELECT MAX(created_at) INTO v_last_at
  FROM public.global_chat
  WHERE user_id = NEW.user_id;

  IF v_last_at IS NOT NULL AND (now() - v_last_at) < interval '5 seconds' THEN
    RAISE EXCEPTION 'rate_limit: aguarde alguns segundos antes de enviar outra mensagem'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_chat_rate_limit
BEFORE INSERT ON public.global_chat
FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_rate_limit();

-- 4. Trigger: mantém só 50 mensagens (AFTER INSERT, statement-level)
CREATE OR REPLACE FUNCTION public.trim_global_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.global_chat
  WHERE id IN (
    SELECT id FROM public.global_chat
    ORDER BY created_at DESC
    OFFSET 50
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_trim_global_chat
AFTER INSERT ON public.global_chat
FOR EACH STATEMENT EXECUTE FUNCTION public.trim_global_chat();

-- 5. Realtime
ALTER TABLE public.global_chat REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat;