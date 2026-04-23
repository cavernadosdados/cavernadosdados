-- Tabela de mesas favoritas (wishlist)
CREATE TABLE public.table_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, table_id)
);

ALTER TABLE public.table_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favorites"
  ON public.table_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add own favorites"
  ON public.table_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own favorites"
  ON public.table_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_table_favorites_user ON public.table_favorites(user_id);
CREATE INDEX idx_table_favorites_table ON public.table_favorites(table_id);