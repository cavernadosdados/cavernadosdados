ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS availability_days text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS availability_periods text[] NOT NULL DEFAULT '{}'::text[];