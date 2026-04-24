ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS terms_version text,
ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS privacy_version text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_type,
    display_name,
    tokens_balance,
    signup_bonus_claimed,
    terms_accepted_at,
    terms_version,
    privacy_accepted_at,
    privacy_version
  )
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'user_type')::user_type, 'player'),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    0,
    false,
    CASE WHEN new.raw_user_meta_data->>'terms_accepted' = 'true' THEN now() ELSE NULL END,
    NULLIF(new.raw_user_meta_data->>'terms_version', ''),
    CASE WHEN new.raw_user_meta_data->>'privacy_accepted' = 'true' THEN now() ELSE NULL END,
    NULLIF(new.raw_user_meta_data->>'privacy_version', '')
  );
  RETURN new;
END;
$function$;