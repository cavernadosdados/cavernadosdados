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
        .select("id, title, session_date, table_id, tables(title)")
        .in("table_id", tableIds)
        .gte("session_date", startISO)
        .lte("session_date", endISO)
        .order("session_date", { ascending: true });
      if (error) throw error;

      return (data ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        session_date: s.session_date,
        table_id: s.table_id,
        table_title: s.tables?.title ?? "Mesa",
        role: isMaster ? "master" : "player",
      }));
    },
  });
};