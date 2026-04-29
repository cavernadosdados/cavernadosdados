DROP FUNCTION IF EXISTS public.get_public_table(uuid);

CREATE OR REPLACE FUNCTION public.get_public_table(_table_id uuid)
 RETURNS TABLE(id uuid, title text, description text, system text, theme text, duration text, platform text, max_players integer, price_cents integer, cover_url text, status text, created_at timestamp with time zone, master_id uuid, master_display_name text, master_avatar_url text, frequency text, schedule_time text, next_session_date timestamp with time zone, timezone text, is_adult_only boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    t.id,
    t.title,
    t.description,
    t.system,
    t.theme,
    t.duration,
    t.platform,
    t.max_players,
    t.price_cents,
    t.cover_url,
    t.status,
    t.created_at,
    t.master_id,
    p.display_name AS master_display_name,
    p.avatar_url AS master_avatar_url,
    cd.frequency,
    cd.schedule_time,
    cd.next_session_date,
    cd.timezone,
    t.is_adult_only
  FROM public.tables t
  LEFT JOIN public.profiles p ON p.id = t.master_id
  LEFT JOIN public.campaign_details cd ON cd.table_id = t.id
  WHERE t.id = _table_id
    AND t.status <> 'under_review';
$function$;