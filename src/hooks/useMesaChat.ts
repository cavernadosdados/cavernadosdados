import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface MesaChatMessage {
  id: string;
  table_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const MAX_LEN = 1000;

/**
 * Persistent per-table chat. Visible only to the master and accepted players (enforced by RLS).
 * No deletion, no AI, no attachments. Realtime subscribed.
 */
export const useMesaChat = (tableId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["mesa_chat", tableId];

  const messagesQuery = useQuery({
    queryKey,
    enabled: !!tableId && !!user,
    queryFn: async (): Promise<MesaChatMessage[]> => {
      const { data, error } = await supabase
        .from("mesa_chat_messages")
        .select("id, table_id, user_id, content, created_at")
        .eq("table_id", tableId!)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) return [];

      // Hydrate authors from profiles
      const ids = Array.from(new Set(rows.map((m) => m.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);

      const map = new Map(
        (profiles ?? []).map((p: any) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }])
      );

      return rows.map((m) => ({ ...m, author: map.get(m.user_id) ?? null }));
    },
  });

  // Realtime: insert new messages live
  useEffect(() => {
    if (!tableId || !user) return;
    const channel = supabase
      .channel(`mesa_chat_${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mesa_chat_messages",
          filter: `table_id=eq.${tableId}`,
        },
        async (payload: any) => {
          const row = payload.new as MesaChatMessage;
          // Fetch author
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();
          const enriched: MesaChatMessage = {
            ...row,
            author: profile ?? null,
          };
          qc.setQueryData<MesaChatMessage[]>(queryKey, (old) => {
            const list = old ?? [];
            if (list.some((m) => m.id === enriched.id)) return list;
            return [...list, enriched];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, user?.id]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !tableId) throw new Error("not_ready");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("empty_message");
      if (trimmed.length > MAX_LEN) throw new Error("too_long");

      const { error } = await supabase.from("mesa_chat_messages").insert({
        table_id: tableId,
        user_id: user.id,
        content: trimmed,
      });
      if (error) throw error;
    },
    onError: (err: any) => {
      const msg = err?.message ?? "Erro";
      if (msg === "empty_message") return;
      if (msg === "too_long") {
        toast({
          title: "Mensagem muito longa",
          description: `Máximo ${MAX_LEN} caracteres.`,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Erro ao enviar", description: msg, variant: "destructive" });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    send: (content: string) => sendMutation.mutateAsync(content),
    isSending: sendMutation.isPending,
    maxLen: MAX_LEN,
  };
};
