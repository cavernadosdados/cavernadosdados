
-- Column-level lockdown: only the owner row can read sensitive fields.
-- Postgres combines column privileges with RLS, so we keep the existing
-- "viewable by everyone" policy for public columns but revoke sensitive
-- columns from the broad authenticated grant.
REVOKE SELECT (tokens_balance, xp, onboarding_completed, signup_bonus_claimed)
  ON public.profiles FROM anon, authenticated;

-- Helper functions so the OWNER can still read their own values.
CREATE OR REPLACE FUNCTION public.get_my_tokens_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tokens_balance FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_xp()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT xp FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_onboarding_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT onboarding_completed FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_tokens_balance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_xp() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_onboarding_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_tokens_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_xp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_onboarding_status() TO authenticated;
