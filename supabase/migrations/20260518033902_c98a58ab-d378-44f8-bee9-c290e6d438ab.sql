
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.master_prep_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL,
  master_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Próxima sessão',
  notes text NOT NULL DEFAULT '',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  template text NOT NULL DEFAULT '',
  session_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_master_prep_notes_table ON public.master_prep_notes(table_id, created_at DESC);

ALTER TABLE public.master_prep_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master view own prep notes"
ON public.master_prep_notes FOR SELECT TO authenticated
USING (master_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tables t WHERE t.id = table_id AND t.master_id = auth.uid()));

CREATE POLICY "Master insert own prep notes"
ON public.master_prep_notes FOR INSERT TO authenticated
WITH CHECK (master_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tables t WHERE t.id = table_id AND t.master_id = auth.uid()));

CREATE POLICY "Master update own prep notes"
ON public.master_prep_notes FOR UPDATE TO authenticated
USING (master_id = auth.uid())
WITH CHECK (master_id = auth.uid());

CREATE POLICY "Master delete own prep notes"
ON public.master_prep_notes FOR DELETE TO authenticated
USING (master_id = auth.uid());

CREATE TRIGGER trg_master_prep_notes_updated_at
BEFORE UPDATE ON public.master_prep_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
