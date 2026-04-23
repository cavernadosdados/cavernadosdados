import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useFavorites() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_favorites")
        .select("table_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.table_id as string));
    },
  });

  return {
    favoriteIds: query.data ?? new Set<string>(),
    isLoading: query.isLoading,
  };
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ tableId, isFavorite }: { tableId: string; isFavorite: boolean }) => {
      if (!user) throw new Error("not_authenticated");
      if (isFavorite) {
        const { error } = await supabase
          .from("table_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("table_id", tableId);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase
          .from("table_favorites")
          .insert({ user_id: user.id, table_id: tableId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: ({ added }) => {
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] });
      qc.invalidateQueries({ queryKey: ["favorite-tables", user?.id] });
      toast.success(added ? "Adicionada aos favoritos" : "Removida dos favoritos");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar favoritos", { description: err?.message });
    },
  });
}

export function useFavoriteTables() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorite-tables", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_favorites")
        .select("created_at, tables:table_id(*, profiles(id, display_name, avatar_url))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => row.tables)
        .filter((t: any) => !!t);
    },
  });
}