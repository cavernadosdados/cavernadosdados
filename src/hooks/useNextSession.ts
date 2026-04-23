import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export type AttendanceStatus = "confirmed" | "declined" | "pending";

export interface AttendanceRow {
  id: string;
  player_id: string;
  status: AttendanceStatus;
  next_session_date: string;
  player?: { display_name: string | null; avatar_url: string | null };
}

/** Lê a data da próxima sessão (campaign_details.next_session_date) */
export const useNextSessionDate = (tableId?: string) => {
  return useQuery({
    queryKey: ["next-session-date", tableId],
    enabled: !!tableId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("campaign_details")
        .select("next_session_date")
        .eq("table_id", tableId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.next_session_date ?? null;
    },
  });
};

/** Lista presenças da próxima sessão (qualquer participante pode ler) */
export const useAttendanceList = (tableId?: string, sessionDate?: string | null) => {
  return useQuery({
    queryKey: ["attendance-list", tableId, sessionDate],
    enabled: !!tableId && !!sessionDate,
    queryFn: async (): Promise<AttendanceRow[]> => {
      const { data, error } = await supabase
        .from("session_attendance")
        .select("id, player_id, status, next_session_date, profiles:player_id(display_name, avatar_url)")
        .eq("table_id", tableId!)
        .eq("next_session_date", sessionDate!);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        player_id: r.player_id,
        status: r.status as AttendanceStatus,
        next_session_date: r.next_session_date,
        player: r.profiles
          ? { display_name: r.profiles.display_name, avatar_url: r.profiles.avatar_url }
          : undefined,
      }));
    },
  });
};

/** Marca/atualiza presença do jogador logado para a próxima sessão */
export const useSetAttendance = (tableId?: string, sessionDate?: string | null) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (status: AttendanceStatus) => {
      if (!user || !tableId || !sessionDate) throw new Error("missing_args");
      const { error } = await supabase
        .from("session_attendance")
        .upsert(
          {
            table_id: tableId,
            player_id: user.id,
            next_session_date: sessionDate,
            status,
          },
          { onConflict: "table_id,player_id,next_session_date" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-list", tableId, sessionDate] });
      toast({ title: "Presença atualizada", description: "Sua resposta foi salva." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });
};