-- Adiciona coluna para rastrear conclusão do onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Marca usuários antigos (mais de 7 dias) como já onboarded para não incomodá-los
UPDATE public.profiles
   SET onboarding_completed = true
 WHERE created_at < (now() - interval '7 days');