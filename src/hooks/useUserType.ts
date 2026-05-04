import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Source of truth for the current user's role (master/player).
 * Reads from public.profiles (server-side, RLS-protected) instead of
 * user_metadata, which is client-mutable and cannot be trusted for
 * authorization decisions.
 */
export const useUserType = () => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
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

  return {
    userType: data ?? null,
    isMaster: data === "master",
    isPlayer: data === "player",
    loading: authLoading || (!!user && isLoading),
  };
};
