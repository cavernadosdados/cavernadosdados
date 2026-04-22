-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (security definer, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Policies user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Tabela reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'hate_speech', 'spam_scam', 'harassment', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  UNIQUE (table_id, reporter_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reports_table_created ON public.reports(table_id, created_at DESC);
CREATE INDEX idx_reports_status ON public.reports(status);

-- 6. Policies reports
CREATE POLICY "Authenticated can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete reports"
  ON public.reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Atualizar policy de SELECT em tables para esconder under_review
DROP POLICY IF EXISTS "Anyone authenticated can view tables" ON public.tables;

CREATE POLICY "View tables (hide under_review from public)"
  ON public.tables FOR SELECT
  TO authenticated
  USING (
    status <> 'under_review'
    OR master_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 8. Trigger de auto-moderação
CREATE OR REPLACE FUNCTION public.check_table_reports_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_master_id UUID;
  v_table_title TEXT;
BEGIN
  -- conta denunciantes únicos nos últimos 7 dias
  SELECT COUNT(DISTINCT reporter_id) INTO v_count
  FROM public.reports
  WHERE table_id = NEW.table_id
    AND created_at > now() - interval '7 days';

  IF v_count >= 3 THEN
    SELECT master_id, title INTO v_master_id, v_table_title
    FROM public.tables WHERE id = NEW.table_id;

    UPDATE public.tables
    SET status = 'under_review', updated_at = now()
    WHERE id = NEW.table_id AND status <> 'under_review';

    -- Notifica o mestre
    IF v_master_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, related_table_id)
      VALUES (
        v_master_id,
        'table_under_review',
        'Mesa em revisão',
        'Sua mesa "' || COALESCE(v_table_title, '') || '" foi colocada em revisão devido a denúncias e está temporariamente oculta.',
        '/dashboard/mesa/' || NEW.table_id::text,
        NEW.table_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_reports_threshold
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.check_table_reports_threshold();