-- 1) Hide discord_webhook_url from non-masters (column-level)
REVOKE SELECT (discord_webhook_url) ON public.campaign_details FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_my_campaign_discord_webhook(_table_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cd.discord_webhook_url
  FROM public.campaign_details cd
  JOIN public.tables t ON t.id = cd.table_id
  WHERE cd.table_id = _table_id
    AND t.master_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_campaign_discord_webhook(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_campaign_discord_webhook(uuid) TO authenticated;

-- 2) Hide commission_pct on tables from regular users
REVOKE SELECT (commission_pct) ON public.tables FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_my_master_finance_tables()
RETURNS TABLE(
  id uuid,
  title text,
  price_cents integer,
  commission_pct numeric,
  max_players integer,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.price_cents, t.commission_pct, t.max_players, t.status, t.created_at
  FROM public.tables t
  WHERE t.master_id = auth.uid()
  ORDER BY t.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_master_finance_tables() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_master_finance_tables() TO authenticated;

-- 3) Remove public listing permission on lore-images bucket.
-- Public buckets still serve files via direct URL even without a SELECT policy.
DROP POLICY IF EXISTS "Public read access to lore-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read lore-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view lore-images" ON storage.objects;