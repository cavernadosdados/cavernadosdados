
-- =========================================================
-- 1) PROFILES: column-level grants to hide sensitive fields
-- =========================================================
-- Keep RLS policy "Users can view all profiles" (USING true) but rely on
-- column-level GRANTs to hide sensitive columns from non-owners.
-- The owner reads sensitive columns through SECURITY DEFINER RPCs that
-- already exist (get_my_tokens_balance, get_my_xp, get_my_onboarding_status).

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id,
  display_name,
  avatar_url,
  bio,
  user_type,
  created_at,
  updated_at,
  experience_years,
  master_systems,
  preferred_themes,
  plays_in_person,
  availability_days,
  availability_periods,
  apps_used,
  discord_link,
  active_tables_count
) ON public.profiles TO authenticated;

-- Owner-only RPC to fetch private profile flags in one call.
CREATE OR REPLACE FUNCTION public.get_my_profile_private()
RETURNS TABLE(
  tokens_balance integer,
  xp integer,
  onboarding_completed boolean,
  signup_bonus_claimed boolean,
  terms_accepted_at timestamptz,
  terms_version text,
  privacy_accepted_at timestamptz,
  privacy_version text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.tokens_balance,
    p.xp,
    p.onboarding_completed,
    p.signup_bonus_claimed,
    p.terms_accepted_at,
    p.terms_version,
    p.privacy_accepted_at,
    p.privacy_version
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- =========================================================
-- 2) NOTIFICATIONS: drop user-insert policy. Only SECURITY DEFINER
--    triggers create notifications.
-- =========================================================
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- =========================================================
-- 3) grant_tokens: lock down PostgREST exposure
-- =========================================================
-- The function already checks has_role(admin) when called by an authenticated
-- user, but as defense-in-depth we revoke EXECUTE from anon/authenticated.
-- Internal triggers run as SECURITY DEFINER and don't need EXECUTE grant.
REVOKE EXECUTE ON FUNCTION public.grant_tokens(uuid, integer, text, uuid) FROM anon, authenticated, PUBLIC;
