
-- Update get_admin_metrics: replace masters/players counts with behavior-derived counts
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'users_total', (SELECT COUNT(*) FROM public.profiles),
    'users_active_creators', (SELECT COUNT(DISTINCT master_id) FROM public.tables),
    'users_active_players', (SELECT COUNT(DISTINCT player_id) FROM public.table_applications),
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
$function$;

-- Update admin_list_users: replace user_type with derived behavior flags
DROP FUNCTION IF EXISTS public.admin_list_users(text, integer);

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT ''::text, _limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, avatar_url text, has_created_tables boolean, has_player_activity boolean, created_at timestamp with time zone, tokens_balance integer, xp integer, is_admin boolean, tables_count integer, applications_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    EXISTS (SELECT 1 FROM public.tables t WHERE t.master_id = p.id) AS has_created_tables,
    EXISTS (SELECT 1 FROM public.table_applications ta WHERE ta.player_id = p.id) AS has_player_activity,
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
$function$;
