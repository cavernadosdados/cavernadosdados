import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const EPOCH = "1970-01-01T00:00:00Z";

/**
 * Conta mensagens não lidas no chat de cada mesa em que o usuário participa.
 * Retorna um mapa { [tableId]: count }.
 *
 * Lógica: para cada tableId, conta mensagens em `mesa_chat_messages`
 * com `created_at > last_read_at` (do registro em `mesa_chat_reads`)
 * e `user_id != usuário atual` (mensagens próprias não contam).
 *
 * Atualiza em tempo real via Supabase Realtime quando chegam novas mensagens.
 */
export function useUnreadMesaCounts(tableIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["mesa-unread-counts", user?.id, tableIds.slice().sort().join(",")];

  const query = useQuery({
    queryKey: key,
    enabled: !!user && tableIds.length > 0,
    queryFn: async () => {
      // 1) Busca o last_read_at do usuário para essas mesas
      const { data: reads, error: readsErr } = await supabase
        .from("mesa_chat_reads")
        .select("table_id, last_read_at")
        .eq("user_id", user!.id)
        .in("table_id", tableIds);
      if (readsErr) throw readsErr;
      const readMap: Record<string, string> = {};
      (reads ?? []).forEach((r) => {
        readMap[r.table_id] = r.last_read_at;
      });

      // 2) Busca todas as mensagens dessas mesas (excluindo as do próprio usuário)
      //    e conta no cliente — evita N queries paralelas.
      const { data: msgs, error: msgsErr } = await supabase
        .from("mesa_chat_messages")
        .select("table_id, user_id, created_at")
        .in("table_id", tableIds)
        .neq("user_id", user!.id);
      if (msgsErr) throw msgsErr;

      const counts: Record<string, number> = {};
      (msgs ?? []).forEach((m) => {
        const cutoff = readMap[m.table_id] ?? EPOCH;
        if (new Date(m.created_at) > new Date(cutoff)) {
          counts[m.table_id] = (counts[m.table_id] ?? 0) + 1;
        }
      });
      return counts;
    },
  });

  // Realtime: invalida o cache quando uma nova mensagem chega em qualquer mesa monitorada
  useEffect(() => {
    if (!user || tableIds.length === 0) return;
    const channel = supabase
      .channel(`mesa-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mesa_chat_messages" },
        (payload: any) => {
          if (tableIds.includes(payload.new?.table_id) && payload.new?.user_id !== user.id) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tableIds.join(",")]);

  return query;
}

/**
 * Marca o chat de uma mesa como lido (now()) para o usuário atual.
 * Idempotente — usa upsert por (user_id, table_id).
 */
export function useMarkMesaChatRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tableId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("mesa_chat_reads")
        .upsert(
          { user_id: user.id, table_id: tableId, last_read_at: new Date().toISOString() },
          { onConflict: "user_id,table_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalida todas as queries de unread para recalcular
      queryClient.invalidateQueries({ queryKey: ["mesa-unread-counts", user?.id] });
    },
  });
}
