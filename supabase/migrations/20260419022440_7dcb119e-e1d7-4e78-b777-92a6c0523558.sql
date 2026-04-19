-- 1. Tabela de boosts de mesa
CREATE TABLE public.table_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  master_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_table_boosts_active ON public.table_boosts(table_id, expires_at);
CREATE INDEX idx_table_boosts_expires ON public.table_boosts(expires_at);

ALTER TABLE public.table_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view table boosts"
  ON public.table_boosts FOR SELECT
  TO authenticated
  USING (true);

-- 2. Coluna de candidatura prioritária
ALTER TABLE public.table_applications
  ADD COLUMN is_priority BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN priority_at TIMESTAMPTZ;

CREATE INDEX idx_table_applications_priority
  ON public.table_applications(table_id, is_priority DESC, priority_at DESC NULLS LAST, created_at);

-- 3. Função: boost de mesa (1 token = 24h)
CREATE OR REPLACE FUNCTION public.boost_table(_table_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_master UUID;
  v_new_balance INTEGER;
  v_boost_id UUID;
  v_existing_expires TIMESTAMPTZ;
  v_new_expires TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT master_id INTO v_master FROM public.tables WHERE id = _table_id;
  IF v_master IS NULL THEN
    RAISE EXCEPTION 'table_not_found';
  END IF;
  IF v_master <> v_user THEN
    RAISE EXCEPTION 'not_table_owner';
  END IF;

  -- Cobra 1 token
  UPDATE public.profiles
     SET tokens_balance = tokens_balance - 1,
         updated_at = now()
   WHERE id = v_user
     AND tokens_balance >= 1
  RETURNING tokens_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  INSERT INTO public.token_transactions (user_id, delta, reason, related_table_id)
  VALUES (v_user, -1, 'boost_table', _table_id);

  -- Renova boost: se já existir ativo, soma 24h ao expires_at; senão, cria novo a partir de agora
  SELECT MAX(expires_at) INTO v_existing_expires
    FROM public.table_boosts
   WHERE table_id = _table_id AND expires_at > now();

  v_new_expires := COALESCE(v_existing_expires, now()) + interval '24 hours';

  INSERT INTO public.table_boosts (table_id, master_id, expires_at)
  VALUES (_table_id, v_user, v_new_expires)
  RETURNING id INTO v_boost_id;

  RETURN v_boost_id;
END;
$$;

-- 4. Função: candidatura prioritária (1 token)
CREATE OR REPLACE FUNCTION public.apply_priority_to_application(_application_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_player UUID;
  v_status TEXT;
  v_already BOOLEAN;
  v_table UUID;
  v_new_balance INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT player_id, status, is_priority, table_id
    INTO v_player, v_status, v_already, v_table
    FROM public.table_applications
   WHERE id = _application_id;

  IF v_player IS NULL THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;
  IF v_player <> v_user THEN
    RAISE EXCEPTION 'not_application_owner';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'application_not_pending';
  END IF;
  IF v_already THEN
    RAISE EXCEPTION 'already_priority';
  END IF;

  -- Cobra 1 token
  UPDATE public.profiles
     SET tokens_balance = tokens_balance - 1,
         updated_at = now()
   WHERE id = v_user
     AND tokens_balance >= 1
  RETURNING tokens_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  INSERT INTO public.token_transactions (user_id, delta, reason, related_table_id)
  VALUES (v_user, -1, 'priority_application', v_table);

  UPDATE public.table_applications
     SET is_priority = true,
         priority_at = now(),
         updated_at = now()
   WHERE id = _application_id;

  RETURN true;
END;
$$;

-- 5. Trigger: primeira mesa ganha boost grátis de 24h
CREATE OR REPLACE FUNCTION public.grant_first_table_boost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM public.tables
   WHERE master_id = NEW.master_id;

  -- Se esta é a primeira mesa do mestre, dá boost grátis
  IF v_count = 1 THEN
    INSERT INTO public.table_boosts (table_id, master_id, expires_at)
    VALUES (NEW.id, NEW.master_id, now() + interval '24 hours');

    INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id)
    VALUES (
      NEW.master_id,
      'first_table_boost',
      '🎉 Primeira mesa em destaque!',
      'Sua primeira mesa "' || NEW.title || '" recebeu destaque grátis por 24h para atrair jogadores!',
      '/dashboard/mesas',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_first_table_boost
  AFTER INSERT ON public.tables
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_first_table_boost();

-- 6. Devolução retroativa: credita 1 token por mesa já criada (reembolso pela mudança)
DO $$
DECLARE
  r RECORD;
  v_count INTEGER;
BEGIN
  FOR r IN
    SELECT master_id, COUNT(*)::INTEGER AS qty
      FROM public.tables
     GROUP BY master_id
  LOOP
    -- Credita tokens
    UPDATE public.profiles
       SET tokens_balance = tokens_balance + r.qty,
           updated_at = now()
     WHERE id = r.master_id;

    -- Registra transação de reembolso
    INSERT INTO public.token_transactions (user_id, delta, reason)
    VALUES (r.master_id, r.qty, 'refund_table_creation');

    -- Notifica o mestre
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      r.master_id,
      'token_refund',
      '💎 Tokens devolvidos!',
      'Criar mesas agora é grátis! Devolvemos ' || r.qty || ' token(s) pelas mesas que você já criou. Use para destacá-las!',
      '/dashboard/tokens'
    );
  END LOOP;
END $$;