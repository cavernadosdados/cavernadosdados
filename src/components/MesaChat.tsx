import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageSquare, Lock } from "lucide-react";
import { useMesaChat } from "@/hooks/useMesaChat";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MesaChatProps {
  tableId: string;
  tableTitle?: string;
}

export const MesaChat = ({ tableId, tableTitle }: MesaChatProps) => {
  const { user } = useAuth();
  const { messages, isLoading, send, isSending, maxLen } = useMesaChat(tableId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || isSending) return;
    try {
      await send(value);
      setText("");
    } catch {
      /* toast handled in hook */
    }
  };

  return (
    <Card className="border-border bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Chat da Mesa
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Privado · só o mestre e jogadores aceitos podem ver
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px] px-4" ref={scrollRef as any}>
          {isLoading ? (
            <div className="space-y-3 py-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[300px] py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma mensagem ainda.</p>
              <p className="text-xs mt-1">Quebre o gelo enviando a primeira mensagem!</p>
            </div>
          ) : (
            <ul className="space-y-3 py-3">
              {messages.map((m) => {
                const mine = m.user_id === user?.id;
                const initials = (m.author?.display_name || "?").slice(0, 2).toUpperCase();
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "flex gap-2",
                      mine ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Link
                      to={`/dashboard/perfil/${m.user_id}`}
                      className="shrink-0"
                      title={m.author?.display_name ?? "Usuário"}
                    >
                      <Avatar className="h-8 w-8 border border-primary/30">
                        <AvatarImage src={m.author?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/20">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className={cn("flex flex-col max-w-[75%]", mine && "items-end")}>
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
                          mine
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                        )}
                      >
                        {!mine && (
                          <Link
                            to={`/dashboard/perfil/${m.user_id}`}
                            className="block text-[11px] font-semibold text-primary mb-0.5 hover:underline"
                          >
                            {m.author?.display_name ?? "Usuário"}
                          </Link>
                        )}
                        {m.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                        {formatDistanceToNow(new Date(m.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="border-t border-border p-3 space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Envie uma mensagem na mesa${tableTitle ? ` "${tableTitle}"` : ""}...`}
            rows={2}
            maxLength={maxLen}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {text.length}/{maxLen} · Enter para enviar · Shift+Enter para nova linha
            </span>
            <Button type="submit" size="sm" disabled={isSending || !text.trim()} className="gap-1">
              <Send className="h-3 w-3" />
              {isSending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
