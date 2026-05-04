import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Capability hook for the unified profile model.
 *
 * `userType` (legacy) reflects the historical preference saved at signup
 * (`profiles.user_type`) and is kept only for cosmetic/copy purposes.
 *
 * Authoritative capabilities are derived from real data:
 *   - hasMasteredTables: user owns at least one table
 *   - hasPlayerActivity: user has at least one application
 *
 * Authorization decisions must NEVER rely on these flags — always check
 * `tables.master_id = auth.uid()` or table participation server-side.
 */
export const useUserType = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: profileType, isLoading: profileLoading } = useQuery({
    queryKey: ["user_type", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.user_type as "master" | "player" | null) ?? null;
    },
  });

  const { data: capabilities, isLoading: capsLoading } = useQuery({
    queryKey: ["user_capabilities", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [{ count: masterCount }, { count: appCount }] = await Promise.all([
        supabase
          .from("tables")
          .select("id", { count: "exact", head: true })
          .eq("master_id", user!.id),
        supabase
          .from("table_applications")
          .select("id", { count: "exact", head: true })
          .eq("player_id", user!.id),
      ]);
      return {
        hasMasteredTables: (masterCount ?? 0) > 0,
        hasPlayerActivity: (appCount ?? 0) > 0,
      };
    },
  });

  const hasMasteredTables = capabilities?.hasMasteredTables ?? false;
  const hasPlayerActivity = capabilities?.hasPlayerActivity ?? false;

  return {
    // Legacy preference (cosmetic only)
    userType: profileType ?? null,
    // Unified model: anyone can master AND play
    isMaster: hasMasteredTables || profileType === "master",
    isPlayer: true,
    hasMasteredTables,
    hasPlayerActivity,
    loading: authLoading || (!!user && (profileLoading || capsLoading)),
  };
};
