ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS is_adult_only boolean NOT NULL DEFAULT false;