
-- Create tables (mesas) table
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  system TEXT NOT NULL,
  theme TEXT NOT NULL,
  duration TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 4,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view tables"
ON public.tables FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Masters can create tables"
ON public.tables FOR INSERT TO authenticated
WITH CHECK (auth.uid() = master_id);

CREATE POLICY "Masters can update own tables"
ON public.tables FOR UPDATE TO authenticated
USING (auth.uid() = master_id)
WITH CHECK (auth.uid() = master_id);

CREATE POLICY "Masters can delete own tables"
ON public.tables FOR DELETE TO authenticated
USING (auth.uid() = master_id);

CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create table_applications table
CREATE TABLE public.table_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(table_id, player_id)
);

ALTER TABLE public.table_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can create applications"
ON public.table_applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can view own applications"
ON public.table_applications FOR SELECT TO authenticated
USING (auth.uid() = player_id);

CREATE POLICY "Masters can view applications to their tables"
ON public.table_applications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tables
    WHERE tables.id = table_applications.table_id
    AND tables.master_id = auth.uid()
  )
);

CREATE POLICY "Masters can update applications to their tables"
ON public.table_applications FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tables
    WHERE tables.id = table_applications.table_id
    AND tables.master_id = auth.uid()
  )
);

CREATE TRIGGER update_table_applications_updated_at
BEFORE UPDATE ON public.table_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
