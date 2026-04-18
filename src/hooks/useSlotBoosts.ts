import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SlotBoost {
  id: string;
  slots_added: number;
  expires_at: string;
  created_at: string;
}

export const useSlotBoosts = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const boostsQuery = useQuery({
    queryKey: ["slot_boosts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SlotBoost[]> => {
      const { data, error } = await supabase
        .from("slot_boosts")
        .select("id, slots_added, expires_at, created_at")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pendingQuery = useQuery({
    queryKey: ["pending_applications_count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("table_applications")
        .select("*", { count: "exact", head: true })
        .eq("player_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Realtime: refresh when applications change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`slots_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_applications",
          filter: `player_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["pending_applications_count", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const activeBoostSlots = (boostsQuery.data ?? []).reduce(
    (sum, b) => sum + b.slots_added,
    0
  );
  const totalSlots = 3 + activeBoostSlots;
  const pendingCount = pendingQuery.data ?? 0;
  const remainingSlots = Math.max(0, totalSlots - pendingCount);

  const buyBoost = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("buy_slot_boost");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slot_boosts", user?.id] });
      qc.invalidateQueries({ queryKey: ["tokens_balance", user?.id] });
      qc.invalidateQueries({ queryKey: ["token_transactions", user?.id] });
      toast.success("Boost ativado! +3 slots por 7 dias.");
    },
    onError: (err: Error) => {
      const msg = err.message?.includes("insufficient_tokens")
        ? "Saldo de tokens insuficiente."
        : err.message || "Erro ao comprar boost.";
      toast.error(msg);
    },
  });

  return {
    boosts: boostsQuery.data ?? [],
    activeBoostSlots,
    totalSlots,
    pendingCount,
    remainingSlots,
    isLoading: boostsQuery.isLoading || pendingQuery.isLoading,
    buyBoost: buyBoost.mutate,
    isBuying: buyBoost.isPending,
  };
};
