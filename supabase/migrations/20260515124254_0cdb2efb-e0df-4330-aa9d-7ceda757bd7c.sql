
-- NPCs
CREATE TABLE public.lore_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL,
  name TEXT NOT NULL,
  faction TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'alive',
  relationship TEXT DEFAULT '',
  description TEXT DEFAULT '',
  portrait_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lore_npcs_table ON public.lore_npcs(table_id);
ALTER TABLE public.lore_npcs ENABLE ROW LEVEL SECURITY;

-- Locais
CREATE TABLE public.lore_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL,
  name TEXT NOT NULL,
  kind TEXT DEFAULT 'city',
  description TEXT DEFAULT '',
  map_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lore_locations_table ON public.lore_locations(table_id);
ALTER TABLE public.lore_locations ENABLE ROW LEVEL SECURITY;

-- Facções (com reputação do grupo)
CREATE TABLE public.lore_factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  symbol_url TEXT DEFAULT '',
  reputation INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lore_factions_table ON public.lore_factions(table_id);
ALTER TABLE public.lore_factions ENABLE ROW LEVEL SECURITY;

-- Itens lendários
CREATE TABLE public.lore_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unknown',
  holder TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lore_items_table ON public.lore_items(table_id);
ALTER TABLE public.lore_items ENABLE ROW LEVEL SECURITY;

-- Linha do tempo
CREATE TABLE public.lore_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_order INTEGER NOT NULL DEFAULT 0,
  event_date TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lore_timeline_table ON public.lore_timeline(table_id);
ALTER TABLE public.lore_timeline ENABLE ROW LEVEL SECURITY;

-- Códex / glossário
CREATE TABLE public.lore_codex (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL,
  term TEXT NOT NULL,
  definition TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lore_codex_table ON public.lore_codex(table_id);
ALTER TABLE public.lore_codex ENABLE ROW LEVEL SECURITY;

-- updated_at triggers
CREATE TRIGGER trg_lore_npcs_upd BEFORE UPDATE ON public.lore_npcs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lore_locations_upd BEFORE UPDATE ON public.lore_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lore_factions_upd BEFORE UPDATE ON public.lore_factions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lore_items_upd BEFORE UPDATE ON public.lore_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lore_timeline_upd BEFORE UPDATE ON public.lore_timeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lore_codex_upd BEFORE UPDATE ON public.lore_codex
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS policies (master gerencia, participantes visualizam)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lore_npcs','lore_locations','lore_factions','lore_items','lore_timeline','lore_codex']
  LOOP
    EXECUTE format($f$
      CREATE POLICY "Participants view %1$I" ON public.%1$I
        FOR SELECT TO authenticated
        USING (public.is_table_participant(table_id, auth.uid()));
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Masters insert %1$I" ON public.%1$I
        FOR INSERT TO authenticated
        WITH CHECK (EXISTS (SELECT 1 FROM public.tables WHERE tables.id = table_id AND tables.master_id = auth.uid()));
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Masters update %1$I" ON public.%1$I
        FOR UPDATE TO authenticated
        USING (EXISTS (SELECT 1 FROM public.tables WHERE tables.id = table_id AND tables.master_id = auth.uid()))
        WITH CHECK (EXISTS (SELECT 1 FROM public.tables WHERE tables.id = table_id AND tables.master_id = auth.uid()));
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Masters delete %1$I" ON public.%1$I
        FOR DELETE TO authenticated
        USING (EXISTS (SELECT 1 FROM public.tables WHERE tables.id = table_id AND tables.master_id = auth.uid()));
    $f$, t);
  END LOOP;
END $$;
