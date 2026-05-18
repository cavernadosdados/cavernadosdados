-- 1) Profiles: revoke discord_link and apps_used from broad authenticated SELECT
REVOKE SELECT (discord_link, apps_used) ON public.profiles FROM authenticated;

-- Owner-only RPC to read own private contact/usage fields
CREATE OR REPLACE FUNCTION public.get_my_profile_contact()
RETURNS TABLE(discord_link text, apps_used text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.discord_link, p.apps_used
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- 2) Lore images: replace permissive INSERT policy with folder-ownership check
DROP POLICY IF EXISTS "Authenticated users can upload lore images" ON storage.objects;

CREATE POLICY "Users can upload to own lore folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lore-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Notifications: explicit restrictive INSERT policy denying client inserts.
-- All notifications are created by SECURITY DEFINER triggers which bypass RLS.
CREATE POLICY "Block direct notification inserts"
ON public.notifications
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);
