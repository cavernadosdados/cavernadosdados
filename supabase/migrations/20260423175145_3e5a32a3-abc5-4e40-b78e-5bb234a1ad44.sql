
-- Recria a view com security_invoker = on (modelo recomendado pelo Supabase linter)
DROP VIEW IF EXISTS public.public_tables_view;

CREATE VIEW public.public_tables_view
WITH (security_invoker = on) AS
SELECT
  t.id,
  t.title,
  t.description,
  t.system,
  t.theme,
  t.duration,
  t.platform,
  t.max_players,
  t.price_cents,
  t.cover_url,
  t.status,
  t.created_at,
  t.master_id,
  p.display_name AS master_display_name,
  p.avatar_url AS master_avatar_url,
  cd.frequency,
  cd.schedule_time,
  cd.next_session_date,
  cd.timezone
FROM public.tables t
LEFT JOIN public.profiles p ON p.id = t.master_id
LEFT JOIN public.campaign_details cd ON cd.table_id = t.id
WHERE t.status <> 'under_review';

GRANT SELECT ON public.public_tables_view TO anon, authenticated;

-- Como security_invoker = on, a view executa com as permissões do usuário consultante.
-- Para que anon consiga ler através da view, precisamos de policies anon nas tabelas-base
-- mas ESCOPADAS APENAS às colunas seguras. Como Postgres não suporta column-level RLS
-- via policies, criamos policies anon mínimas que retornam apenas linhas, e dependemos
-- da view para limitar as colunas. As tabelas-base continuam sem permissão SELECT direta
-- para anon (revogamos abaixo).

-- Policies anon mínimas (somente o necessário para a view funcionar)
CREATE POLICY "anon_read_tables_for_public_view"
  ON public.tables FOR SELECT TO anon
  USING (status <> 'under_review');

CREATE POLICY "anon_read_profiles_for_public_view"
  ON public.profiles FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_read_campaign_for_public_view"
  ON public.campaign_details FOR SELECT TO anon
  USING (true);

-- IMPORTANTE: revogar SELECT direto nas tabelas-base para anon, forçando uso da view
REVOKE SELECT ON public.tables FROM anon;
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.campaign_details FROM anon;

-- E conceder SELECT apenas nas COLUNAS seguras das tabelas-base para anon
-- (assim, mesmo se chamar a tabela direto, só vê colunas públicas)
GRANT SELECT (id, title, description, system, theme, duration, platform, max_players, price_cents, cover_url, status, created_at, master_id)
  ON public.tables TO anon;

GRANT SELECT (id, display_name, avatar_url)
  ON public.profiles TO anon;

GRANT SELECT (table_id, frequency, schedule_time, next_session_date, timezone)
  ON public.campaign_details TO anon;
