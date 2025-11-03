-- Add master-specific fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0 CHECK (experience_years >= 0 AND experience_years <= 100),
ADD COLUMN IF NOT EXISTS master_systems TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_themes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS plays_in_person BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS apps_used TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS discord_link TEXT,
ADD COLUMN IF NOT EXISTS active_tables_count INTEGER DEFAULT 0 CHECK (active_tables_count >= 0);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_master_systems ON public.profiles USING GIN(master_systems);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_themes ON public.profiles USING GIN(preferred_themes);

-- Update RLS policies to allow users to update their own profiles
-- The existing policy should already allow this, but let's make sure
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);