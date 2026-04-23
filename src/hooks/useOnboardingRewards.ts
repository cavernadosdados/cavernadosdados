import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type OnboardingStepKey = "profile" | "table" | "tokens" | "explore" | "apply";

export interface ClaimedReward {
  step_key: OnboardingStepKey;
  tokens_awarded: number;
  xp_awarded: number;
}

/**
 * Lê quais recompensas o usuário já reivindicou e expõe a função `claim`
 * que credita tokens + XP via RPC `claim_onboarding_reward`.
 */
export const useOnboardingRewards = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: claimed, isLoading } = useQuery({
    queryKey: ["onboarding_rewards", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_rewards")
        .select("step_key, tokens_awarded, xp_awarded")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as ClaimedReward[];
    },
  });

  const claimedSet = new Set((claimed ?? []).map((r) => r.step_key));

  const claimMutation = useMutation({
    mutationFn: async (stepKey: OnboardingStepKey) => {
      const { data, error } = await supabase.rpc("claim_onboarding_reward", {
        _step_key: stepKey,
      });
      if (error) throw error;
      return data as {
        already_claimed: boolean;
        tokens_awarded?: number;
        xp_awarded?: number;
      };
    },
    onSuccess: (res, stepKey) => {
      if (res?.already_claimed) return;
      qc.invalidateQueries({ queryKey: ["onboarding_rewards", user?.id] });
      qc.invalidateQueries({ queryKey: [" tokens_balance", user?.id] });
      qc.invalidateQueries({ queryKey: ["token_transactions", user?.id] });
      qc.invalidateQueries({ queryKey: ["profile_xp", user?.id] });
      toast.success(
        `+${res.tokens_awarded} Token${(res.tokens_awarded ?? 0) > 1 ? "s" : ""} • +${res.xp_awarded} XP`,
        { description: `Recompensa por completar a etapa do tour!` }
      );
    },
    onError: (err: Error) => {
      // Silencia erros normais (already_claimed já é tratado no success)
      console.warn("[onboarding reward]", stepKeyError(err));
    },
  });

  return {
    claimedSet,
    claimedRewards: claimed ?? [],
    isLoading,
    claim: (key: OnboardingStepKey) => claimMutation.mutate(key),
    isClaiming: claimMutation.isPending,
  };
};

function stepKeyError(err: Error) {
  return err?.message ?? String(err);
}
