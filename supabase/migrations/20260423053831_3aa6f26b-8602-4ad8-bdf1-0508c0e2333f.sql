-- Definições das conquistas (catálogo público)
CREATE TABLE public.achievement_definitions (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  metric TEXT NOT NULL, -- 'tables_created' | 'accepted_applications' | 'sessions_played' | 'reports_published' | 'sessions_as_master' | 'well_rated_tables'
  target INTEGER NOT NULL,
  tokens_reward INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Definitions are public"
ON public.achievement_definitions
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.achievement_definitions (code, title, description, icon, metric, target, tokens_reward, xp_reward, sort_order) VALUES
  ('first_master',           'Primeiro Mestre',          'Crie sua primeira mesa de RPG.',                         'crown',     'tables_created',         1,  2, 100, 10),
  ('veteran_master',         'Mestre Veterano',          'Crie 5 mesas no total.',                                  'shield',    'tables_created',         5,  3, 250, 20),
  ('first_adventure',        'Primeira Aventura',        'Tenha sua primeira candidatura aceita.',                  'compass',   'accepted_applications',  1,  1,  75, 30),
  ('experienced_adventurer', 'Aventureiro Experiente',   'Participe de 10 sessões registradas como jogador.',       'swords',    'sessions_played',       10,  5, 300, 40),
  ('well_rated',             'Bem Avaliado',             'Tenha 3 mesas com nota média acima de 4.8.',              'star',      'well_rated_tables',      3, 10, 500, 50),
  ('chronicler',             'Cronista',                 'Publique 10 relatórios de sessão.',                       'scroll',    'reports_published',     10,  3, 200, 60),
  ('first_session',          'Primeira Sessão',          'Registre sua primeira sessão como mestre.',               'sparkles',  'sessions_as_master',     1,  2, 100, 70);

-- Tabela de conquistas desbloqueadas por usuário
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL REFERENCES public.achievement_definitions(code) ON DELETE CASCADE,
  tokens_awarded INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

CREATE INDEX idx_achievements_user ON public.achievements(user_id);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements"
ON public.achievements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Função: calcula valor atual de uma métrica para o usuário
CREATE OR REPLACE FUNCTION public.compute_achievement_metric(_user uuid, _metric text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer := 0;
BEGIN
  IF _metric = 'tables_created' THEN
    SELECT COUNT(*) INTO v_count FROM public.tables WHERE master_id = _user;
  ELSIF _metric = 'accepted_applications' THEN
    SELECT COUNT(*) INTO v_count FROM public.table_applications
     WHERE player_id = _user AND status = 'accepted';
  ELSIF _metric = 'sessions_played' THEN
    SELECT COUNT(*) INTO v_count FROM public.session_logs sl
      JOIN public.table_applications ta ON ta.table_id = sl.table_id
     WHERE ta.player_id = _user AND ta.status = 'accepted';
  ELSIF _metric = 'reports_published' THEN
    SELECT COUNT(*) INTO v_count FROM public.player_reports WHERE player_id = _user;
  ELSIF _metric = 'sessions_as_master' THEN
    SELECT COUNT(*) INTO v_count FROM public.session_logs sl
      JOIN public.tables t ON t.id = sl.table_id
     WHERE t.master_id = _user;
  ELSIF _metric = 'well_rated_tables' THEN
    SELECT COUNT(*) INTO v_count FROM (
      SELECT sf.table_id
        FROM public.session_feedback sf
        JOIN public.tables t ON t.id = sf.table_id
       WHERE t.master_id = _user
       GROUP BY sf.table_id
       HAVING AVG((sf.rating_1 + sf.rating_2 + sf.rating_3)::numeric / 3) >= 4.8
    ) ok;
  END IF;
  RETURN v_count;
END;
$$;

-- Função: verifica progresso e desbloqueia todas as cumpridas
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_unlocked jsonb := '[]'::jsonb;
  r RECORD;
  v_current integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  FOR r IN
    SELECT d.* FROM public.achievement_definitions d
     WHERE NOT EXISTS (
       SELECT 1 FROM public.achievements a
        WHERE a.user_id = v_user AND a.code = d.code
     )
  LOOP
    v_current := public.compute_achievement_metric(v_user, r.metric);
    IF v_current >= r.target THEN
      BEGIN
        INSERT INTO public.achievements (user_id, code, tokens_awarded, xp_awarded)
        VALUES (v_user, r.code, r.tokens_reward, r.xp_reward);

        UPDATE public.profiles
           SET tokens_balance = tokens_balance + r.tokens_reward,
               xp = xp + r.xp_reward,
               updated_at = now()
         WHERE id = v_user;

        IF r.tokens_reward > 0 THEN
          INSERT INTO public.token_transactions (user_id, delta, reason)
          VALUES (v_user, r.tokens_reward, 'achievement_' || r.code);
        END IF;

        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (v_user, 'achievement_unlocked', '🏆 Conquista desbloqueada!',
                'Você desbloqueou: ' || r.title,
                '/dashboard/conquistas');

        v_unlocked := v_unlocked || jsonb_build_array(r.code);
      EXCEPTION WHEN unique_violation THEN
        -- corrida: já foi desbloqueada por outra chamada
        NULL;
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('unlocked', v_unlocked);
END;
$$;

-- Função: retorna catálogo + progresso atual + status de desbloqueio
CREATE OR REPLACE FUNCTION public.get_achievements_progress()
RETURNS TABLE (
  code text,
  title text,
  description text,
  icon text,
  metric text,
  target integer,
  tokens_reward integer,
  xp_reward integer,
  sort_order integer,
  current_value integer,
  unlocked boolean,
  unlocked_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  RETURN QUERY
  SELECT
    d.code, d.title, d.description, d.icon, d.metric, d.target,
    d.tokens_reward, d.xp_reward, d.sort_order,
    public.compute_achievement_metric(v_user, d.metric) AS current_value,
    (a.code IS NOT NULL) AS unlocked,
    a.unlocked_at
  FROM public.achievement_definitions d
  LEFT JOIN public.achievements a ON a.code = d.code AND a.user_id = v_user
  ORDER BY d.sort_order;
END;
$$;