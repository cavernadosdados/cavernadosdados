
-- ============================================
-- COSMETIC ITEMS CATALOG
-- ============================================

CREATE TYPE public.cosmetic_kind AS ENUM ('glimer', 'frame', 'cover', 'theme');
CREATE TYPE public.cosmetic_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
CREATE TYPE public.cosmetic_acquisition AS ENUM ('signup', 'xp', 'achievement', 'purchase', 'admin', 'season');

CREATE TABLE public.cosmetic_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind cosmetic_kind NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  preview_url text DEFAULT '',
  rarity cosmetic_rarity NOT NULL DEFAULT 'common',
  price_tokens integer,                       -- null = não vendido na loja
  unlock_rule jsonb NOT NULL DEFAULT '{"type":"free"}'::jsonb,
  -- ex: {"type":"free"} | {"type":"xp","value":500} | {"type":"achievement","value":"first_table"}
  --     {"type":"tokens"} | {"type":"season","value":"halloween-2026"}
  linked_theme_slug text,                     -- glimer pode liberar um tema
  theme_tokens jsonb,                         -- se kind='theme': HSL overrides {"--background":"...","--primary":"..."}
  season text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cosmetic_items_kind ON public.cosmetic_items(kind) WHERE is_active;
CREATE INDEX idx_cosmetic_items_active ON public.cosmetic_items(is_active);

ALTER TABLE public.cosmetic_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog visible to authenticated"
  ON public.cosmetic_items FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage catalog"
  ON public.cosmetic_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cosmetic_items_updated_at
  BEFORE UPDATE ON public.cosmetic_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- USER COSMETICS (inventory)
-- ============================================

CREATE TABLE public.user_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.cosmetic_items(id) ON DELETE CASCADE,
  acquired_via cosmetic_acquisition NOT NULL DEFAULT 'admin',
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX idx_user_cosmetics_user ON public.user_cosmetics(user_id);

ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own inventory"
  ON public.user_cosmetics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Block all direct inserts/updates/deletes. Only SECURITY DEFINER functions can write.
CREATE POLICY "Block direct cosmetic inserts"
  ON public.user_cosmetics AS RESTRICTIVE FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Block cosmetic updates"
  ON public.user_cosmetics AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "Block cosmetic deletes"
  ON public.user_cosmetics AS RESTRICTIVE FOR DELETE
  TO anon, authenticated
  USING (false);

-- ============================================
-- USER COSMETIC EQUIPPED (current loadout)
-- ============================================

CREATE TABLE public.user_cosmetic_equipped (
  user_id uuid PRIMARY KEY,
  glimer_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  frame_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  cover_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  theme_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_cosmetic_equipped ENABLE ROW LEVEL SECURITY;

-- Equipped loadout is public (so we can render any user's avatar+frame+cover).
CREATE POLICY "Equipped visible to authenticated"
  ON public.user_cosmetic_equipped FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert own equipped"
  ON public.user_cosmetic_equipped FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own equipped"
  ON public.user_cosmetic_equipped FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_cosmetic_equipped_updated_at
  BEFORE UPDATE ON public.user_cosmetic_equipped
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Internal grant (used by triggers / signup / admin)
CREATE OR REPLACE FUNCTION public.grant_cosmetic_internal(
  _user_id uuid,
  _item_id uuid,
  _via cosmetic_acquisition
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_cosmetics (user_id, item_id, acquired_via)
  VALUES (_user_id, _item_id, _via)
  ON CONFLICT (user_id, item_id) DO NOTHING;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_cosmetic_internal(uuid, uuid, cosmetic_acquisition) FROM anon, authenticated, public;

-- Purchase from token shop
CREATE OR REPLACE FUNCTION public.purchase_cosmetic(_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_item RECORD;
  v_owned boolean;
  v_new_balance integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_item FROM public.cosmetic_items WHERE id = _item_id AND is_active = true;
  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;
  IF v_item.price_tokens IS NULL OR v_item.price_tokens <= 0 THEN
    RAISE EXCEPTION 'item_not_for_sale';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_cosmetics
    WHERE user_id = v_user AND item_id = _item_id
  ) INTO v_owned;

  IF v_owned THEN
    RAISE EXCEPTION 'already_owned';
  END IF;

  UPDATE public.profiles
     SET tokens_balance = tokens_balance - v_item.price_tokens,
         updated_at = now()
   WHERE id = v_user AND tokens_balance >= v_item.price_tokens
  RETURNING tokens_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  INSERT INTO public.token_transactions (user_id, delta, reason)
  VALUES (v_user, -v_item.price_tokens, 'cosmetic_purchase:' || v_item.slug);

  INSERT INTO public.user_cosmetics (user_id, item_id, acquired_via)
  VALUES (v_user, _item_id, 'purchase');

  RETURN jsonb_build_object(
    'item_id', _item_id,
    'slug', v_item.slug,
    'new_balance', v_new_balance
  );
END;
$$;

-- Equip an owned item
CREATE OR REPLACE FUNCTION public.equip_cosmetic(_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_kind cosmetic_kind;
  v_owned boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT kind INTO v_kind FROM public.cosmetic_items WHERE id = _item_id AND is_active = true;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_cosmetics WHERE user_id = v_user AND item_id = _item_id
  ) INTO v_owned;
  IF NOT v_owned THEN
    RAISE EXCEPTION 'not_owned';
  END IF;

  INSERT INTO public.user_cosmetic_equipped (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_kind = 'glimer' THEN
    UPDATE public.user_cosmetic_equipped SET glimer_id = _item_id, updated_at = now() WHERE user_id = v_user;
  ELSIF v_kind = 'frame' THEN
    UPDATE public.user_cosmetic_equipped SET frame_id = _item_id, updated_at = now() WHERE user_id = v_user;
  ELSIF v_kind = 'cover' THEN
    UPDATE public.user_cosmetic_equipped SET cover_id = _item_id, updated_at = now() WHERE user_id = v_user;
  ELSIF v_kind = 'theme' THEN
    UPDATE public.user_cosmetic_equipped SET theme_id = _item_id, updated_at = now() WHERE user_id = v_user;
  END IF;

  RETURN true;
END;
$$;

-- Unequip a slot
CREATE OR REPLACE FUNCTION public.unequip_cosmetic(_kind cosmetic_kind)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _kind = 'glimer' THEN
    UPDATE public.user_cosmetic_equipped SET glimer_id = NULL, updated_at = now() WHERE user_id = v_user;
  ELSIF _kind = 'frame' THEN
    UPDATE public.user_cosmetic_equipped SET frame_id = NULL, updated_at = now() WHERE user_id = v_user;
  ELSIF _kind = 'cover' THEN
    UPDATE public.user_cosmetic_equipped SET cover_id = NULL, updated_at = now() WHERE user_id = v_user;
  ELSIF _kind = 'theme' THEN
    UPDATE public.user_cosmetic_equipped SET theme_id = NULL, updated_at = now() WHERE user_id = v_user;
  END IF;
  RETURN true;
END;
$$;

-- Resolve equipped loadout (used everywhere we render an avatar)
CREATE OR REPLACE FUNCTION public.get_user_equipped_cosmetics(_user_id uuid)
RETURNS TABLE(
  glimer_slug text, glimer_image_url text,
  frame_slug text, frame_image_url text,
  cover_slug text, cover_image_url text,
  theme_slug text, theme_tokens jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.slug, g.image_url,
    f.slug, f.image_url,
    c.slug, c.image_url,
    t.slug, t.theme_tokens
  FROM public.user_cosmetic_equipped e
  LEFT JOIN public.cosmetic_items g ON g.id = e.glimer_id
  LEFT JOIN public.cosmetic_items f ON f.id = e.frame_id
  LEFT JOIN public.cosmetic_items c ON c.id = e.cover_id
  LEFT JOIN public.cosmetic_items t ON t.id = e.theme_id
  WHERE e.user_id = _user_id;
$$;

-- ============================================
-- AUTO-GRANT TRIGGERS
-- ============================================

-- On signup: grant all kind='glimer' + 'theme' items with unlock_rule.type='free'
CREATE OR REPLACE FUNCTION public.grant_free_cosmetics_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_cosmetics (user_id, item_id, acquired_via)
  SELECT NEW.id, ci.id, 'signup'
  FROM public.cosmetic_items ci
  WHERE ci.is_active = true
    AND ci.unlock_rule->>'type' = 'free'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_free_cosmetics ON public.profiles;
CREATE TRIGGER trg_grant_free_cosmetics
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_free_cosmetics_for_new_user();

-- When XP changes: grant items whose unlock_rule = {"type":"xp","value":N} and NEW.xp >= N
CREATE OR REPLACE FUNCTION public.grant_xp_cosmetics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.xp IS NULL OR NEW.xp = OLD.xp THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_cosmetics (user_id, item_id, acquired_via)
  SELECT NEW.id, ci.id, 'xp'
  FROM public.cosmetic_items ci
  WHERE ci.is_active = true
    AND ci.unlock_rule->>'type' = 'xp'
    AND (ci.unlock_rule->>'value')::int <= NEW.xp
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_xp_cosmetics ON public.profiles;
CREATE TRIGGER trg_grant_xp_cosmetics
  AFTER UPDATE OF xp ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_xp_cosmetics();

-- When an achievement is unlocked: grant items with unlock_rule = {"type":"achievement","value":"<code>"}
CREATE OR REPLACE FUNCTION public.grant_achievement_cosmetics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_cosmetics (user_id, item_id, acquired_via)
  SELECT NEW.user_id, ci.id, 'achievement'
  FROM public.cosmetic_items ci
  WHERE ci.is_active = true
    AND ci.unlock_rule->>'type' = 'achievement'
    AND ci.unlock_rule->>'value' = NEW.code
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_achievement_cosmetics ON public.achievements;
CREATE TRIGGER trg_grant_achievement_cosmetics
  AFTER INSERT ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.grant_achievement_cosmetics();

-- ============================================
-- STORAGE: bucket for cosmetics assets (admin-managed)
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('cosmetics', 'cosmetics', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Cosmetics assets publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cosmetics');

CREATE POLICY "Admins manage cosmetics assets"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'cosmetics' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'cosmetics' AND public.has_role(auth.uid(), 'admin'));
