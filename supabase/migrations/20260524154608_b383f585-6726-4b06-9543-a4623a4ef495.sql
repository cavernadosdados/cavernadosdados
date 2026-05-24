
-- ============================================
-- 1) SECURITY FIX: prevent users from tampering
--    with their own economy columns via direct UPDATE.
--    SECURITY DEFINER functions run as table owner,
--    so their current_user is NOT 'authenticated'/'anon'.
-- ============================================

CREATE OR REPLACE FUNCTION public.protect_profile_economy_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.tokens_balance      := OLD.tokens_balance;
    NEW.xp                  := OLD.xp;
    NEW.signup_bonus_claimed:= OLD.signup_bonus_claimed;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_economy ON public.profiles;
CREATE TRIGGER trg_protect_profile_economy
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_economy_columns();

-- ============================================
-- 2) SEED 12 FRAMES
-- ============================================

INSERT INTO public.cosmetic_items
  (slug, kind, name, description, rarity, price_tokens, unlock_rule, sort_order)
VALUES
  ('frame-bronze',    'frame', 'Moldura de Bronze',    'Borda simples forjada em bronze.',          'common',    NULL, '{"type":"free"}',           1010),
  ('frame-silver',    'frame', 'Moldura de Prata',     'Linhas polidas em prata da caverna.',       'common',    NULL, '{"type":"free"}',           1020),
  ('frame-vines',     'frame', 'Vinhas Antigas',       'Trançado de raízes místicas.',              'common',    NULL, '{"type":"free"}',           1030),
  ('frame-runes',     'frame', 'Runas Élficas',        'Símbolos arcanos gravados na borda.',       'common',    NULL, '{"type":"free"}',           1040),
  ('frame-gold',      'frame', 'Moldura Dourada',      'Liga dourada com filigrana.',               'rare',      NULL, '{"type":"xp","value":500}', 1110),
  ('frame-emerald',   'frame', 'Moldura Esmeralda',    'Cravejada com cristais verdes.',            'rare',      NULL, '{"type":"xp","value":1000}',1120),
  ('frame-ruby',      'frame', 'Moldura Rubi',         'Pedras rubras pulsantes.',                  'rare',      NULL, '{"type":"xp","value":1500}',1130),
  ('frame-obsidian',  'frame', 'Moldura de Obsidiana', 'Vidro vulcânico afiado.',                   'rare',      NULL, '{"type":"xp","value":2000}',1140),
  ('frame-crystal',   'frame', 'Cristal Etéreo',       'Bordas translúcidas que brilham fraco.',    'epic',       250, '{"type":"tokens"}',         1210),
  ('frame-dragon',    'frame', 'Escamas de Dragão',    'Couro escamado de um wyrm ancião.',         'epic',       300, '{"type":"tokens"}',         1220),
  ('frame-void',      'frame', 'Borda do Vazio',       'Vácuo absoluto contornando o avatar.',      'epic',       400, '{"type":"tokens"}',         1230),
  ('frame-celestial', 'frame', 'Auréola Celestial',    'Halo radiante dos planos superiores.',      'legendary',  500, '{"type":"tokens"}',         1240);

-- ============================================
-- 3) SEED 12 COVERS
-- ============================================

INSERT INTO public.cosmetic_items
  (slug, kind, name, description, rarity, price_tokens, unlock_rule, sort_order)
VALUES
  ('cover-tavern',      'cover', 'Taverna Acolhedora', 'A icônica lareira da Cervejaria Anã.',        'common',   NULL, '{"type":"free"}',           2010),
  ('cover-forest',      'cover', 'Floresta Antiga',    'Caminhos sob copas centenárias.',             'common',   NULL, '{"type":"free"}',           2020),
  ('cover-mountains',   'cover', 'Cordilheira',        'Picos nevados ao entardecer.',                'common',   NULL, '{"type":"free"}',           2030),
  ('cover-library',     'cover', 'Biblioteca Arcana',  'Estantes infindáveis de grimórios.',          'common',   NULL, '{"type":"free"}',           2040),
  ('cover-dungeon',     'cover', 'Masmorra Esquecida', 'Corredores úmidos iluminados por tochas.',    'rare',     NULL, '{"type":"xp","value":500}', 2110),
  ('cover-castle',      'cover', 'Castelo no Penhasco','Fortaleza ao alto do desfiladeiro.',          'rare',     NULL, '{"type":"xp","value":1000}',2120),
  ('cover-swamp',       'cover', 'Pântano Sombrio',    'Bruma verde e raízes retorcidas.',            'rare',     NULL, '{"type":"xp","value":1500}',2130),
  ('cover-ocean',       'cover', 'Mar de Tempestades', 'Ondas titânicas sob trovões.',                'rare',     NULL, '{"type":"xp","value":2000}',2140),
  ('cover-desert',      'cover', 'Deserto de Areia Vermelha','Dunas escarlates sob dois sóis.',      'epic',      250, '{"type":"tokens"}',         2210),
  ('cover-snowfield',   'cover', 'Tundra Glacial',     'Planície branca sob aurora boreal.',          'epic',      300, '{"type":"tokens"}',         2220),
  ('cover-battlefield', 'cover', 'Campo de Batalha',   'Estandartes rasgados ao vento.',              'epic',      400, '{"type":"tokens"}',         2230),
  ('cover-stars',       'cover', 'Plano Astral',       'Cosmos pintado em nebulosas púrpuras.',       'legendary', 500, '{"type":"tokens"}',         2240);

-- ============================================
-- 4) Backfill: grant new free items to existing users
-- ============================================

INSERT INTO public.user_cosmetics (user_id, item_id, acquired_via)
SELECT p.id, ci.id, 'signup'
FROM public.profiles p
CROSS JOIN public.cosmetic_items ci
WHERE ci.is_active = true
  AND ci.unlock_rule->>'type' = 'free'
  AND ci.kind IN ('frame','cover')
ON CONFLICT DO NOTHING;
