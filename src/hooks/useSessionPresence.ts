import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export type PresenceStatus = "attended" | "excused" | "no_show";
export type JustificationStatus = "none" | "pending" | "accepted" | "rejected";

export interface PresenceRow {
  id: string;
  session_log_id: string;
  table_id: string;
  player_id: string;
  status: PresenceStatus;
  had_prior_notice: boolean;
  master_note: string | null;
  player_justification: string | null;
  justification_status: JustificationStatus;
  marked_by: string;
  created_at: string;
  updated_at: string;
}

/** Lista presença para uma sessão específica */
export const useSessionPresence = (sessionLogId?: string) => {
  return useQuery({
    queryKey: ["session-presence", sessionLogId],
    enabled: !!sessionLogId,
    queryFn: async (): Promise<PresenceRow[]> => {
      const { data, error } = await supabase
        .from("session_presence" as any)
        .select("*")
        .eq("session_log_id", sessionLogId!);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
};

/** Mestre marca/atualiza presença de um jogador */
export const useMarkPresence = (sessionLogId?: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tableId: string;
      playerId: string;
      status: PresenceStatus;
      hadPriorNotice?: boolean;
      masterNote?: string;
    }) => {
      if (!user || !sessionLogId) throw new Error("missing_args");
      const { error } = await supabase.from("session_presence" as any).upsert(
        {
          session_log_id: sessionLogId,
          table_id: params.tableId,
          player_id: params.playerId,
          status: params.status,
          had_prior_notice: params.hadPriorNotice ?? false,
          master_note: params.masterNote ?? "",
          marked_by: user.id,
        },
        { onConflict: "session_log_id,player_id" }
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["session-presence", sessionLogId] });
      await qc.invalidateQueries({ queryKey: ["player-reliability"] });
      toast({ title: "Presença atualizada", description: "Registro salvo." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

/** Jogador envia justificativa quando foi marcado como no-show */
export const useSubmitJustification = (sessionLogId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { presenceId: string; text: string }) => {
      const { error } = await supabase
        .from("session_presence" as any)
        .update({ player_justification: params.text, justification_status: "pending" })
        .eq("id", params.presenceId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["session-presence", sessionLogId] });
      toast({ title: "Justificativa enviada", description: "O mestre receberá sua mensagem." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

/** Mestre aceita ou recusa a justificativa */
export const useReviewJustification = (sessionLogId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { presenceId: string; accept: boolean }) => {
      const update: any = {
        justification_status: params.accept ? "accepted" : "rejected",
      };
      if (params.accept) update.status = "excused";
      const { error } = await supabase
        .from("session_presence" as any)
        .update(update)
        .eq("id", params.presenceId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["session-presence", sessionLogId] });
      await qc.invalidateQueries({ queryKey: ["player-reliability"] });
      toast({ title: "Justificativa avaliada", description: "Decisão registrada." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

/** Score de confiabilidade do jogador (RPC) */
export interface Reliability {
  total_sessions: number;
  attended: number;
  excused: number;
  no_shows: number;
  reliability_pct: number;
}

export const usePlayerReliability = (playerId?: string) => {
  return useQuery({
    queryKey: ["player-reliability", playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<Reliability | null> => {
      const { data, error } = await supabase.rpc("get_player_reliability" as any, {
        _player_id: playerId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row ? (row as Reliability) : null;
    },
  });
};