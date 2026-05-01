-- Métricas gerais (admin only)
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'users_total', (SELECT COUNT(*) FROM public.profiles),
    'users_masters', (SELECT COUNT(*) FROM public.profiles WHERE user_type = 'master'),
    'users_players', (SELECT COUNT(*) FROM public.profiles WHERE user_type = 'player'),
    'users_new_7d', (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'tables_total', (SELECT COUNT(*) FROM public.tables),
    'tables_open', (SELECT COUNT(*) FROM public.tables WHERE status = 'open'),
    'tables_under_review', (SELECT COUNT(*) FROM public.tables WHERE status = 'under_review'),
    'tables_new_7d', (SELECT COUNT(*) FROM public.tables WHERE created_at > now() - interval '7 days'),
    'applications_total', (SELECT COUNT(*) FROM public.table_applications),
    'applications_pending', (SELECT COUNT(*) FROM public.table_applications WHERE status = 'pending'),
    'applications_accepted', (SELECT COUNT(*) FROM public.table_applications WHERE status = 'accepted'),
    'sessions_total', (SELECT COUNT(*) FROM public.session_logs),
    'sessions_new_7d', (SELECT COUNT(*) FROM public.session_logs WHERE created_at > now() - interval '7 days'),
    'reports_total', (SELECT COUNT(*) FROM public.reports),
    'reports_pending', (SELECT COUNT(*) FROM public.reports WHERE status = 'pending'),
    'reports_new_7d', (SELECT COUNT(*) FROM public.reports WHERE created_at > now() - interval '7 days'),
    'tokens_circulating', (SELECT COALESCE(SUM(tokens_balance),0) FROM public.profiles),
    'tokens_spent_7d', (SELECT COALESCE(SUM(ABS(delta)),0) FROM public.token_transactions WHERE delta < 0 AND created_at > now() - interval '7 days'),
    'tokens_granted_7d', (SELECT COALESCE(SUM(delta),0) FROM public.token_transactions WHERE delta > 0 AND created_at > now() - interval '7 days')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Atividade recente (admin only)
CREATE OR REPLACE FUNCTION public.get_admin_recent_activity(_limit integer DEFAULT 30)
RETURNS TABLE(
  kind text,
  occurred_at timestamptz,
  title text,
  subtitle text,
  link text,
  related_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  (
    SELECT 'report'::text,
           r.created_at,
           ('Denúncia: ' || COALESCE(r.reason,'—')) AS title,
           COALESCE(t.title, 'mesa removida') AS subtitle,
           '/dashboard/mesa/' || r.table_id::text || '/detalhes' AS link,
           r.id
    FROM public.reports r
    LEFT JOIN public.tables t ON t.id = r.table_id
    ORDER BY r.created_at DESC
    LIMIT _limit
  )
  UNION ALL
  (
    SELECT 'table'::text,
           t.created_at,
           'Nova mesa: ' || t.title,
           COALESCE(p.display_name, '—') || ' (' || t.status || ')',
           '/dashboard/mesa/' || t.id::text || '/detalhes',
           t.id
    FROM public.tables t
    LEFT JOIN public.profiles p ON p.id = t.master_id
    ORDER BY t.created_at DESC
    LIMIT _limit
  )
  UNION ALL
  (
    SELECT 'application'::text,
           ta.created_at,
           'Candidatura ' || ta.status,
           COALESCE(pp.display_name, '—') || ' → ' || COALESCE(t.title,'mesa'),
           '/dashboard/mesa/' || ta.table_id::text,
           ta.id
    FROM public.table_applications ta
    LEFT JOIN public.tables t ON t.id = ta.table_id
    LEFT JOIN public.profiles pp ON pp.id = ta.player_id
    ORDER BY ta.created_at DESC
    LIMIT _limit
  )
  UNION ALL
  (
    SELECT 'session'::text,
           sl.created_at,
           'Sessão: ' || sl.title,
           COALESCE(t.title,'—'),
           '/dashboard/mesa/' || sl.table_id::text,
           sl.id
    FROM public.session_logs sl
    LEFT JOIN public.tables t ON t.id = sl.table_id
    ORDER BY sl.created_at DESC
    LIMIT _limit
  )
  UNION ALL
  (
    SELECT 'user'::text,
           p.created_at,
           'Novo usuário: ' || COALESCE(p.display_name,'—'),
           p.user_type::text,
           '/dashboard/perfil/' || p.id::text,
           p.id
    FROM public.profiles p
    ORDER BY p.created_at DESC
    LIMIT _limit
  )
  ORDER BY occurred_at DESC
  LIMIT _limit;
END;
$$;

-- Lista de usuários com busca (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT '', _limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  display_name text,
  avatar_url text,
  user_type text,
  created_at timestamptz,
  tokens_balance integer,
  xp integer,
  is_admin boolean,
  tables_count integer,
  applications_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.user_type::text,
    p.created_at,
    p.tokens_balance,
    p.xp,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS is_admin,
    (SELECT COUNT(*)::int FROM public.tables t WHERE t.master_id = p.id) AS tables_count,
    (SELECT COUNT(*)::int FROM public.table_applications ta WHERE ta.player_id = p.id) AS applications_count
  FROM public.profiles p
  WHERE _search = '' OR p.display_name ILIKE '%' || _search || '%' OR p.id::text = _search
  ORDER BY p.created_at DESC
  LIMIT _limit;
END;
$$;

-- Promover/remover admin (admin only)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target_user_id uuid, _role app_role, _grant boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _target_user_id = v_user AND _role = 'admin' AND NOT _grant THEN
    RAISE EXCEPTION 'cannot_remove_self_admin';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  END IF;

  RETURN true;
END;
$$;