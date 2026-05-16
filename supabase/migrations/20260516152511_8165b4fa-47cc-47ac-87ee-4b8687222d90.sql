CREATE TABLE public.lore_deities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id uuid NOT NULL,
  name text NOT NULL,
  alignment text DEFAULT ''::text,
  domain text DEFAULT ''::text,
  symbol_url text DEFAULT ''::text,
  description text DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lore_deities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view lore_deities"
ON public.lore_deities FOR SELECT TO authenticated
USING (is_table_participant(table_id, auth.uid()));

CREATE POLICY "Masters insert lore_deities"
ON public.lore_deities FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM tables WHERE tables.id = lore_deities.table_id AND tables.master_id = auth.uid()));

CREATE POLICY "Masters update lore_deities"
ON public.lore_deities FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM tables WHERE tables.id = lore_deities.table_id AND tables.master_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM tables WHERE tables.id = lore_deities.table_id AND tables.master_id = auth.uid()));

CREATE POLICY "Masters delete lore_deities"
ON public.lore_deities FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM tables WHERE tables.id = lore_deities.table_id AND tables.master_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at_lore_deities()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_lore_deities_updated_at
BEFORE UPDATE ON public.lore_deities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_lore_deities();