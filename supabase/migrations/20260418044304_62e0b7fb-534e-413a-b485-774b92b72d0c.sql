-- 1. Tabela de boosts
CREATE TABLE public.slot_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slots_added integer NOT NULL DEFAULT 3,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slot_boosts_active
  ON public.slot_boosts (user_id, expires_at);

ALTER TABLE public.slot_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own boosts"
  ON public.slot_boosts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
-- Sem INSERT/UPDATE/DELETE direto: só via função buy_slot_boost

-- 2. Função: conta slots disponíveis (3 base + 3 por boost ativo)
CREATE OR REPLACE FUNCTION public.current_pending_slots(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 3 + COALESCE((
    SELECT SUM(slots_added)::int
    FROM public.slot_boosts
    WHERE user_id = _user_id
      AND expires_at > now()
  ), 0);
$$;

-- 3. Função: conta candidaturas pendentes do usuário
CREATE OR REPLACE FUNCTION public.count_pending_applications(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.table_applications
  WHERE player_id = _user_id
    AND status = 'pending';
$$;

-- 4. Trigger BEFORE INSERT em table_applications: bloqueia se atingiu o limite
CREATE OR REPLACE FUNCTION public.enforce_pending_application_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending integer;
  v_limit integer;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  v_pending := public.count_pending_applications(NEW.player_id);
  v_limit := public.current_pending_slots(NEW.player_id);

  IF v_pending >= v_limit THEN
    RAISE EXCEPTION 'pending_limit_reached: você atingiu o limite de % candidaturas pendentes. Compre um boost de slots para aumentar.', v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_pending_limit
BEFORE INSERT ON public.table_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_pending_application_limit();

-- 5. Função para comprar boost (cobra 1 token + cria boost de 7 dias)
CREATE OR REPLACE FUNCTION public.buy_slot_boost()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_new_balance integer;
  v_boost_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Cobra 1 token (atômico)
  UPDATE public.profiles
     SET tokens_balance = tokens_balance - 1,
         updated_at = now()
   WHERE id = v_user
     AND tokens_balance >= 1
  RETURNING tokens_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  INSERT INTO public.token_transactions (user_id, delta, reason)
  VALUES (v_user, -1, 'slot_boost');

  -- Cria boost
  INSERT INTO public.slot_boosts (user_id, slots_added, expires_at)
  VALUES (v_user, 3, now() + interval '7 days')
  RETURNING id INTO v_boost_id;

  RETURN v_boost_id;
END;
$$;