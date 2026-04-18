import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const QUERY_KEY = ["global_chat"];
const REPORTS_KEY = ["chat_reports"];

export const useGlobalChat = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("global_chat")
        .select("id, user_id, content, created_at")
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;

      const ids = Array.from(new Set((data ?? []).map((m) => m.user_id)));
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);

      const map = new Map(profiles?.map((p) => [p.id, p]) ?? []);
      return (data ?? []).map((m) => ({
        ...m,
        author: map.get(m.user_id)
          ? {
              display_name: map.get(m.user_id)!.display_name,
              avatar_url: map.get(m.user_id)!.avatar_url,
            }
          : null,
      }));
    },
    staleTime: 1000 * 30,
  });

  // Denúncias do usuário (para soft-block local)
  const reportsQuery = useQuery({
    queryKey: REPORTS_KEY,
    enabled: !!user,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("chat_reports")
        .select("message_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.message_id));
    },
    staleTime: 1000 * 60,
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("global_chat_rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat" },
        async (payload) => {
          const row = payload.new as { id: string; user_id: string; content: string; created_at: string };
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();

          qc.setQueryData<ChatMessage[]>(QUERY_KEY, (prev = []) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const next = [
              ...prev,
              {
                ...row,
                author: profile
                  ? { display_name: profile.display_name, avatar_url: profile.avatar_url }
                  : null,
              },
            ];
            return next.slice(-50);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "global_chat" },
        (payload) => {
          const oldRow = payload.old as { id: string };
          qc.setQueryData<ChatMessage[]>(QUERY_KEY, (prev = []) =>
            prev.filter((m) => m.id !== oldRow.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const send = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Você precisa estar logado.");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Mensagem vazia.");
      if (trimmed.length > 280) throw new Error("Máximo 280 caracteres.");
      const { error } = await supabase
        .from("global_chat")
        .insert({ user_id: user.id, content: trimmed });
      if (error) throw error;
    },
    onError: (err: Error) => {
      const msg = err.message?.includes("rate_limit")
        ? "Aguarde alguns segundos antes de enviar outra mensagem."
        : err.message || "Erro ao enviar mensagem.";
      toast.error(msg);
    },
  });

  const report = useMutation({
    mutationFn: async (msg: { id: string; user_id: string; reason?: string }) => {
      if (!user) throw new Error("Você precisa estar logado.");
      if (msg.user_id === user.id) throw new Error("Você não pode denunciar sua própria mensagem.");
      const { error } = await supabase.from("chat_reports").insert({
        reporter_id: user.id,
        message_id: msg.id,
        reported_user_id: msg.user_id,
        reason: msg.reason ?? null,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.setQueryData<Set<string>>(REPORTS_KEY, (prev) => {
        const next = new Set(prev ?? []);
        next.add(vars.id);
        return next;
      });
      toast.success("Mensagem denunciada e ocultada.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao denunciar.");
    },
  });

  const unreport = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error("Você precisa estar logado.");
      const { error } = await supabase
        .from("chat_reports")
        .delete()
        .eq("reporter_id", user.id)
        .eq("message_id", messageId);
      if (error) throw error;
    },
    onSuccess: (_d, messageId) => {
      qc.setQueryData<Set<string>>(REPORTS_KEY, (prev) => {
        const next = new Set(prev ?? []);
        next.delete(messageId);
        return next;
      });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    send: send.mutate,
    isSending: send.isPending,
    reportedIds: reportsQuery.data ?? new Set<string>(),
    report: report.mutate,
    unreport: unreport.mutate,
  };
};
