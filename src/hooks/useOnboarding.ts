import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Lê e atualiza o estado de onboarding do usuário (coluna profiles.onboarding_completed).
 * Quem ainda não viu o tour terá `showOnboarding === true`.
 */
export const useOnboarding = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", user?.id] });
    },
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: false })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Permite que o checklist reapareça também
      try {
        localStorage.removeItem("onboarding_checklist_dismissed");
      } catch {
        // ignore
      }
      queryClient.invalidateQueries({ queryKey: ["onboarding", user?.id] });
    },
  });

  return {
    showOnboarding: !isLoading && data?.onboarding_completed === false,
    isLoading,
    completeOnboarding: completeMutation.mutate,
    restartOnboarding: restartMutation.mutate,
  };
};