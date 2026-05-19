import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EquippedCosmetics {
  glimer_slug: string | null;
  glimer_image_url: string | null;
  frame_slug: string | null;
  frame_image_url: string | null;
  cover_slug: string | null;
  cover_image_url: string | null;
  theme_slug: string | null;
  theme_tokens: Record<string, string> | null;
}

export function useEquippedCosmetics(userId?: string | null) {
  return useQuery({
    queryKey: ["equipped-cosmetics", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<EquippedCosmetics | null> => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("get_user_equipped_cosmetics", {
        _user_id: userId,
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (!row) return null;
      return {
        glimer_slug: row.glimer_slug,
        glimer_image_url: row.glimer_image_url,
        frame_slug: row.frame_slug,
        frame_image_url: row.frame_image_url,
        cover_slug: row.cover_slug,
        cover_image_url: row.cover_image_url,
        theme_slug: row.theme_slug,
        theme_tokens: row.theme_tokens,
      };
    },
  });
}