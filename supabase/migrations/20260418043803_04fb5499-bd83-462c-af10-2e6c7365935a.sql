-- 1. Colunas em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tokens_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signup_bonus_claimed boolean NOT NULL DEFAULT false;

-- 2. Tabela de transações
CREATE TABLE public.token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  related_table_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_transactions_user_recent
  ON public.token_transactions (user_id, created_at DESC);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.token_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
-- Sem INSERT/UPDATE/DELETE para usuários — só funções SECURITY DEFINER mexem aqui

-- 3. Função para gastar tokens (atômica)
CREATE OR REPLACE FUNCTION public.spend_tokens(
  _amount integer,
  _reason text,
  _related_table_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_new_balance integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.profiles
     SET tokens_balance = tokens_balance - _amount,
         updated_at = now()
   WHERE id = v_user
     AND tokens_balance >= _amount
  RETURNING tokens_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  INSERT INTO public.token_transactions (user_id, delta, reason, related_table_id)
  VALUES (v_user, -_amount, _reason, _related_table_id);

  RETURN v_new_balance;
END;
$$;

-- 4. Função para creditar tokens (uso interno + futura integração de compra)
CREATE OR REPLACE FUNCTION public.grant_tokens(
  _user_id uuid,
  _amount integer,
  _reason text,
  _related_table_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.profiles
     SET tokens_balance = tokens_balance + _amount,
         updated_at = now()
   WHERE id = _user_id
  RETURNING tokens_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  INSERT INTO public.token_transactions (user_id, delta, reason, related_table_id)
  VALUES (_user_id, _amount, _reason, _related_table_id);

  RETURN v_new_balance;
END;
$$;

-- 5. Atualiza handle_new_user para conceder bônus de signup (3 tokens)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, display_name, tokens_balance, signup_bonus_claimed)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'user_type')::user_type, 'player'),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    3,
    true
  );

  INSERT INTO public.token_transactions (user_id, delta, reason)
  VALUES (new.id, 3, 'signup_bonus');

  RETURN new;
END;
$$;

-- 6. Bônus retroativo para usuários existentes que ainda não receberam
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles WHERE signup_bonus_claimed = false
  LOOP
    UPDATE public.profiles
       SET tokens_balance = tokens_balance + 3,
           signup_bonus_claimed = true,
           updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.token_transactions (user_id, delta, reason)
    VALUES (r.id, 3, 'signup_bonus_retroactive');
  END LOOP;
END $$;