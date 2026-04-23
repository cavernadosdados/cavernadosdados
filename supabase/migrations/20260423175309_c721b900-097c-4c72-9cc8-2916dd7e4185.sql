
-- Remove policies anon e a view (substituídos por função única)
DROP POLICY IF EXISTS "anon_read_tables_for_public_view" ON public.tables;
DROP POLICY IF EXISTS "anon_read_profiles_for_public_view" ON public.profiles;
DROP POLICY IF EXISTS "anon_read_campaign_for_public_view" ON public.campaign_details;
DROP VIEW IF EXISTS public.public_tables_view;

-- Revoga grants de coluna concedidos antes
REVOKE ALL ON public.tables FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.campaign_details FROM anon;

-- Função única, security definer, que devolve APENAS os campos seguros para a página pública
CREATE OR REPLACE FUNCTION public.get_public_table(_table_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  system text,
  theme text,
  duration text,
  platform text,
  max_players integer,
  price_cents integer,
  cover_url text,
  status text,
  created_at timestamptz,
  master_id uuid,
  master_display_name text,
  master_avatar_url text,
  frequency text,
  schedule_time text,
  next_session_date timestamptz,
  timezone text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE t.id = _table_id
    AND t.status <> 'under_review';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_table(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_table(uuid) IS
  'Retorna APENAS campos seguros de uma mesa para a página pública de compartilhamento. Nunca expõe tokens, xp, webhooks, regras privadas ou mensagens de candidatura.';
