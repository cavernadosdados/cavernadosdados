import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TokenTransaction {
  id: string;
  delta: number;
  reason: string;
  related_table_id: string | null;
  created_at: string;
}

export const useTokens = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const balanceQuery = useQuery({
    queryKey: ["tokens_balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_tokens_balance");
      if (error) throw error;
      return (data as number | null) ?? 0;
    },
  });

  const txQuery = useQuery({
    queryKey: ["token_transactions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TokenTransaction[]> => {
      const { data, error } = await supabase
        .from("token_transactions")
        .select("id, delta, reason, related_table_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime: balance changes when transactions are inserted
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`tokens_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "token_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["tokens_balance", user.id] });
          qc.invalidateQueries({ queryKey: ["token_transactions", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return {
    balance: balanceQuery.data ?? 0,
    isLoading: balanceQuery.isLoading,
    transactions: txQuery.data ?? [],
  };
};

const REASON_LABELS: Record<string, string> = {
  signup_bonus: "Bônus de boas-vindas",
  signup_bonus_retroactive: "Bônus retroativo",
  create_table: "Criação de mesa",
  refund_table_creation: "Reembolso (mesa grátis)",
  boost_table: "🔥 Destaque de mesa (24h)",
  priority_application: "⭐ Candidatura prioritária",
  slot_boost: "Boost de slots (+3 por 7d)",
  purchase: "Compra de tokens",
};

export const reasonLabel = (reason: string) =>
  REASON_LABELS[reason] || reason.replace(/_/g, " ");
