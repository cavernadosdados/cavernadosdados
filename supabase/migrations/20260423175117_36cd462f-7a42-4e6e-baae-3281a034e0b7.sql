
-- ============================================================
-- FASE 1: SEGURANÇA — Revogar acesso anon amplo + criar view pública
-- ============================================================

-- 1. REMOVER policies anon amplos criados na migração anterior
DROP POLICY IF EXISTS "Public can view non-restricted tables" ON public.tables;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view campaign_details" ON public.campaign_details;
DROP POLICY IF EXISTS "Public can count accepted applications" ON public.table_applications;

-- 2. CRIAR FUNÇÃO security definer para contar vagas (evita expor mensagens de candidatura)
CREATE OR REPLACE FUNCTION public.public_accepted_count(_table_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.table_applications
  WHERE table_id = _table_id AND status = 'accepted';
$$;

GRANT EXECUTE ON FUNCTION public.public_accepted_count(uuid) TO anon, authenticated;

-- 3. CRIAR VIEW pública com APENAS colunas seguras
-- Junta tables + master profile + campaign details, expondo apenas o necessário
CREATE OR REPLACE VIEW public.public_tables_view
WITH (security_invoker = off) AS
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
  -- master (apenas colunas públicas seguras, NÃO inclui tokens_balance, xp, etc)
  t.master_id,
  p.display_name AS master_display_name,
  p.avatar_url AS master_avatar_url,
  -- campaign details (apenas agendamento, NÃO inclui discord_webhook_url, regras privadas)
  cd.frequency,
  cd.schedule_time,
  cd.next_session_date,
  cd.timezone
FROM public.tables t
LEFT JOIN public.profiles p ON p.id = t.master_id
LEFT JOIN public.campaign_details cd ON cd.table_id = t.id
WHERE t.status <> 'under_review';

-- 4. Permitir leitura pública APENAS da view
GRANT SELECT ON public.public_tables_view TO anon, authenticated;

-- 5. Comentários para documentar a intenção
COMMENT ON VIEW public.public_tables_view IS
  'View pública de mesas para compartilhamento sem login. Expõe APENAS colunas seguras: nunca inclui tokens, xp, webhooks, mensagens privadas ou regras restritas. RLS das tabelas-base permanece restritivo.';

COMMENT ON FUNCTION public.public_accepted_count(uuid) IS
  'Retorna apenas a contagem de candidaturas aceitas (não expõe mensagens individuais).';
