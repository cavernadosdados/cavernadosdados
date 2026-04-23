import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AchievementProgress {
  code: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  target: number;
  tokens_reward: number;
  xp_reward: number;
  sort_order: number;
  current_value: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

/** Lista todas as conquistas com progresso atual + status de desbloqueio. */
export const useAchievements = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["achievements_progress", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AchievementProgress[]> => {
      const { data, error } = await supabase.rpc("get_achievements_progress");
      if (error) throw error;
      return (data ?? []) as AchievementProgress[];
    },
  });
};

/**
 * Dispara verificação de conquistas no servidor. Se desbloquear novas,
 * mostra toast e invalida queries relevantes (perfil, XP, tokens).
 */
export const useCheckAchievements = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("check_and_unlock_achievements");
      if (error) throw error;
      return data as { unlocked: string[] };
    },
    onSuccess: (data) => {
      const unlocked = data?.unlocked ?? [];
      if (unlocked.length > 0) {
        toast.success(`🏆 ${unlocked.length} conquista(s) desbloqueada(s)!`, {
          description: "Visite a página de conquistas para ver os detalhes.",
          duration: 6000,
        });
        qc.invalidateQueries({ queryKey: ["achievements_progress", user?.id] });
        qc.invalidateQueries({ queryKey: ["profile_xp", user?.id] });
        qc.invalidateQueries({ queryKey: ["tokens_balance", user?.id] });
        qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      }
    },
  });
};