-- 1. Adicionar colunas à tabela tables
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2) NOT NULL DEFAULT 15.00;

-- 2. Trigger de validação para tables (price_cents >= 0, commission_pct entre 0 e 100)
CREATE OR REPLACE FUNCTION public.validate_table_pricing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.price_cents IS NULL OR NEW.price_cents < 0 THEN
    RAISE EXCEPTION 'invalid_price: price_cents must be >= 0';
  END IF;
  IF NEW.commission_pct IS NULL OR NEW.commission_pct < 0 OR NEW.commission_pct > 100 THEN
    RAISE EXCEPTION 'invalid_commission: commission_pct must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_table_pricing_trigger ON public.tables;
CREATE TRIGGER validate_table_pricing_trigger
  BEFORE INSERT OR UPDATE OF price_cents, commission_pct ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.validate_table_pricing();

-- 3. Criar tabela payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.table_applications(id) ON DELETE SET NULL,
  payer_id uuid NOT NULL,
  master_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  commission_cents integer NOT NULL,
  master_payout_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  provider text,
  provider_payment_id text,
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  escrow_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Validação de payments via trigger
CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.amount_cents < 0 OR NEW.commission_cents < 0 OR NEW.master_payout_cents < 0 THEN
    RAISE EXCEPTION 'invalid_amount: amounts must be >= 0';
  END IF;
  IF NEW.status NOT IN ('pending','escrow','released','refunded','failed') THEN
    RAISE EXCEPTION 'invalid_status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payment_trigger ON public.payments;
CREATE TRIGGER validate_payment_trigger
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment();

-- 5. Trigger de updated_at em payments
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_master_id ON public.payments(master_id);
CREATE INDEX IF NOT EXISTS idx_payments_table_id ON public.payments(table_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);

-- 7. RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- SELECT: pagador, mestre ou admin
CREATE POLICY "Payers masters and admins view payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    payer_id = auth.uid()
    OR master_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Sem políticas de INSERT/UPDATE/DELETE: bloqueado para clientes.
-- Operações financeiras só via SECURITY DEFINER functions ou service role.