import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface ActiveTableBoost {
  table_id: string;
  expires_at: string;
}

/**
 * Returns a map of table_id -> latest active boost (max expires_at) for all tables.
 * Used to show "🔥 Em destaque" badges and to sort the listing.
 */
export const useActiveTableBoosts = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["table_boosts_active"],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("table_boosts")
        .select("table_id, expires_at")
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((b: ActiveTableBoost) => {
        if (!map[b.table_id] || new Date(b.expires_at) > new Date(map[b.table_id])) {
          map[b.table_id] = b.expires_at;
        }
      });
      return map;
    },
    staleTime: 60_000,
  });

  // Realtime: refresh when boosts are created
  useEffect(() => {
    const channel = supabase
      .channel("table_boosts_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "table_boosts" },
        () => qc.invalidateQueries({ queryKey: ["table_boosts_active"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return {
    boostsMap: query.data ?? {},
    isLoading: query.isLoading,
  };
};

/**
 * Mutation to spend 1 token and boost a table for 24h.
 */
export const useBoostTable = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tableId: string) => {
      const { data, error } = await supabase.rpc("boost_table", { _table_id: tableId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast({
        title: "🔥 Mesa em destaque!",
        description: "Sua mesa aparecerá no topo da listagem por 24h. (-1 token)",
      });
      qc.invalidateQueries({ queryKey: ["table_boosts_active"] });
      qc.invalidateQueries({ queryKey: ["tokens_balance", user?.id] });
      qc.invalidateQueries({ queryKey: ["token_transactions", user?.id] });
    },
    onError: (err: any) => {
      const msg = err?.message ?? "Erro";
      if (msg.includes("insufficient_tokens")) {
        toast({
          title: "Sem tokens",
          description: "Você precisa de 1 token para destacar a mesa.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Erro ao destacar mesa", description: msg, variant: "destructive" });
      }
    },
  });
};

/**
 * Mutation to spend 1 token and mark an application as priority.
 */
export const usePriorityApplication = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase.rpc("apply_priority_to_application", {
        _application_id: applicationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "⭐ Candidatura prioritária!",
        description: "Sua candidatura aparecerá no topo da lista do mestre. (-1 token)",
      });
      qc.invalidateQueries({ queryKey: ["my-applications", user?.id] });
      qc.invalidateQueries({ queryKey: ["tokens_balance", user?.id] });
      qc.invalidateQueries({ queryKey: ["token_transactions", user?.id] });
    },
    onError: (err: any) => {
      const msg = err?.message ?? "Erro";
      if (msg.includes("insufficient_tokens")) {
        toast({
          title: "Sem tokens",
          description: "Você precisa de 1 token para tornar a candidatura prioritária.",
          variant: "destructive",
        });
      } else if (msg.includes("already_priority")) {
        toast({ title: "Já é prioritária", description: "Esta candidatura já é prioritária." });
      } else {
        toast({ title: "Erro", description: msg, variant: "destructive" });
      }
    },
  });
};
