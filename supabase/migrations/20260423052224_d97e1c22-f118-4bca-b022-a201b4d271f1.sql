-- 1) Adiciona coluna XP em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;

-- 2) Tabela para rastrear quais recompensas de onboarding cada usuário já reivindicou
CREATE TABLE IF NOT EXISTS public.onboarding_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  step_key text NOT NULL,
  tokens_awarded integer NOT NULL DEFAULT 0,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step_key)
);

ALTER TABLE public.onboarding_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own onboarding rewards"
ON public.onboarding_rewards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE só via SECURITY DEFINER function (sem policy = bloqueado)

-- 3) Atualiza handle_new_user para começar com 0 tokens (sem registrar transação de signup_bonus)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, user_type, display_name, tokens_balance, signup_bonus_claimed)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'user_type')::user_type, 'player'),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    0,
    false
  );
  RETURN new;
END;
$function$;

-- 4) Função para reivindicar recompensa de uma etapa do onboarding
-- Garante atomicidade e evita reivindicações duplicadas via UNIQUE constraint.
CREATE OR REPLACE FUNCTION public.claim_onboarding_reward(_step_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_tokens integer := 0;
  v_xp integer := 0;
  v_new_balance integer;
  v_new_xp integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Define recompensa por etapa (1+1+2 = 4 tokens; XP variando)
  CASE _step_key
    WHEN 'profile' THEN v_tokens := 1; v_xp := 50;
    WHEN 'table'   THEN v_tokens := 1; v_xp := 75;
    WHEN 'tokens'  THEN v_tokens := 2; v_xp := 50;
    WHEN 'explore' THEN v_tokens := 1; v_xp := 50;
    WHEN 'apply'   THEN v_tokens := 2; v_xp := 75;
    ELSE
      RAISE EXCEPTION 'unknown_step: %', _step_key;
  END CASE;

  -- Insere registro de recompensa (UNIQUE garante 1x só)
  BEGIN
    INSERT INTO public.onboarding_rewards (user_id, step_key, tokens_awarded, xp_awarded)
    VALUES (v_user, _step_key, v_tokens, v_xp);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('already_claimed', true);
  END;

  -- Credita tokens + xp
  UPDATE public.profiles
     SET tokens_balance = tokens_balance + v_tokens,
         xp = xp + v_xp,
         updated_at = now()
   WHERE id = v_user
  RETURNING tokens_balance, xp INTO v_new_balance, v_new_xp;

  -- Registra transação de tokens
  IF v_tokens > 0 THEN
    INSERT INTO public.token_transactions (user_id, delta, reason)
    VALUES (v_user, v_tokens, 'onboarding_' || _step_key);
  END IF;

  RETURN jsonb_build_object(
    'already_claimed', false,
    'tokens_awarded', v_tokens,
    'xp_awarded', v_xp,
    'new_balance', v_new_balance,
    'new_xp', v_new_xp
  );
END;
$function$;