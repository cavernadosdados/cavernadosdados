import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const XP_PER_LEVEL = 200;

export interface XpInfo {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  progressPct: number;
}

/** Lê o XP do usuário e calcula o nível derivado. */
export const useXp = (): { data: XpInfo | undefined; isLoading: boolean } => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["profile_xp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.xp ?? 0;
    },
  });

  if (data === undefined) return { data: undefined, isLoading };

  const xp = data;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInLevel = xp % XP_PER_LEVEL;
  const xpForNextLevel = XP_PER_LEVEL;
  const progressPct = (xpInLevel / xpForNextLevel) * 100;

  return {
    data: { xp, level, xpInLevel, xpForNextLevel, progressPct },
    isLoading,
  };
};
