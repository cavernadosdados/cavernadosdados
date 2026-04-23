import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CalendarSession {
  id: string;
  title: string;
  session_date: string; // YYYY-MM-DD
  table_id: string;
  table_title: string;
  role: "master" | "player";
  table_cover_url?: string | null;
  table_system?: string | null;
  table_platform?: string | null;
  master_narrative?: string | null;
  schedule_time?: string | null;
  timezone?: string | null;
  is_upcoming?: boolean; // true quando vem de campaign_details.next_session_date
}

/**
 * Busca todas as sessões do usuário (como mestre OU como jogador aceito)
 * dentro de um intervalo de datas, para exibir no calendário.
 */
export const useSessionsCalendar = (start: Date, end: Date) => {
  const { user } = useAuth();
  const userType = user?.user_metadata?.user_type;
  const isMaster = userType === "master";

  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["calendar-sessions", user?.id, startISO, endISO, isMaster],
    enabled: !!user,
    queryFn: async (): Promise<CalendarSession[]> => {
      let tableIds: string[] = [];

      if (isMaster) {
        const { data: tables, error } = await supabase
          .from("tables")
          .select("id")
          .eq("master_id", user!.id);
        if (error) throw error;
        tableIds = (tables ?? []).map((t) => t.id);
      } else {
        const { data: apps, error } = await supabase
          .from("table_applications")
          .select("table_id")
          .eq("player_id", user!.id)
          .eq("status", "accepted");
        if (error) throw error;
        tableIds = (apps ?? []).map((a) => a.table_id);
      }

      if (tableIds.length === 0) return [];

      const { data, error } = await supabase
        .from("session_logs")
        .select(
          "id, title, session_date, master_narrative, table_id, tables(title, cover_url, system, platform, campaign_details(schedule_time, timezone))"
        )
        .in("table_id", tableIds)
        .gte("session_date", startISO)
        .lte("session_date", endISO)
        .order("session_date", { ascending: true });
      if (error) throw error;

      const logged: CalendarSession[] = (data ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        session_date: s.session_date,
        table_id: s.table_id,
        table_title: s.tables?.title ?? "Mesa",
        role: isMaster ? "master" : "player",
        table_cover_url: s.tables?.cover_url ?? null,
        table_system: s.tables?.system ?? null,
        table_platform: s.tables?.platform ?? null,
        master_narrative: s.master_narrative ?? null,
        schedule_time: s.tables?.campaign_details?.[0]?.schedule_time ?? null,
        timezone: s.tables?.campaign_details?.[0]?.timezone ?? null,
        is_upcoming: false,
      }));

      // Também busca próximas sessões agendadas (campaign_details.next_session_date)
      const { data: upcoming, error: upErr } = await supabase
        .from("campaign_details")
        .select(
          "table_id, next_session_date, schedule_time, timezone, tables(title, cover_url, system, platform)"
        )
        .in("table_id", tableIds)
        .not("next_session_date", "is", null);
      if (upErr) throw upErr;

      const upcomingSessions: CalendarSession[] = (upcoming ?? [])
        .filter((c: any) => {
          if (!c.next_session_date) return false;
          const d = new Date(c.next_session_date).toISOString().slice(0, 10);
          return d >= startISO && d <= endISO;
        })
        .map((c: any) => {
          const dateStr = new Date(c.next_session_date).toISOString().slice(0, 10);
          return {
            id: `upcoming-${c.table_id}-${dateStr}`,
            title: "Próxima sessão",
            session_date: dateStr,
            table_id: c.table_id,
            table_title: c.tables?.title ?? "Mesa",
            role: isMaster ? "master" : "player",
            table_cover_url: c.tables?.cover_url ?? null,
            table_system: c.tables?.system ?? null,
            table_platform: c.tables?.platform ?? null,
            master_narrative: null,
            schedule_time: c.schedule_time ?? null,
            timezone: c.timezone ?? null,
            is_upcoming: true,
          };
        });

      // Evita duplicar caso já exista um session_log no mesmo dia/mesa
      const loggedKeys = new Set(logged.map((s) => `${s.table_id}-${s.session_date}`));
      const merged = [
        ...logged,
        ...upcomingSessions.filter((s) => !loggedKeys.has(`${s.table_id}-${s.session_date}`)),
      ];
      merged.sort((a, b) => a.session_date.localeCompare(b.session_date));
      return merged;
    },
  });
};