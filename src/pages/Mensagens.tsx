import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useGlobalChat } from "@/hooks/useGlobalChat";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const MAX_LEN = 280;

const Mensagens = () => {
  const { user } = useAuth();
  const { messages, isLoading, send, isSending } = useGlobalChat();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const lastCountRef = useRef(0);

  // Detecta posição do scroll
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]"
    );
    if (!viewport) return;
    const onScroll = () => {
      const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const isBottom = distance < 60;
      setAtBottom(isBottom);
      if (isBottom) setHasNew(false);
    };
    viewport.addEventListener("scroll", onScroll);
    return () => viewport.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll automático ou indicador de novas
  useEffect(() => {
    if (messages.length === 0) return;
    const grew = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;
    if (!grew) return;
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setHasNew(true);
    }
  }, [messages, atBottom]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNew(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;
    send(text, {
      onSuccess: () => setText(""),
    });
  };

  const remaining = MAX_LEN - text.length;
  const overLimit = remaining < 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold">Praça da Taverna</h1>
          <p className="text-muted-foreground mt-2">
            Chat global — as últimas 50 mensagens. Conversa rápida entre mestres e jogadores.
          </p>
        </div>

        <Card className="bg-gradient-to-br from-card to-card/50 flex flex-col h-[calc(100vh-16rem)] min-h-[500px]">
          <CardHeader className="border-b border-border shrink-0">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversa global
            </CardTitle>
            <CardDescription>
              Mensagens antigas são apagadas automaticamente. Seja gentil com os outros aventureiros.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-3 p-0 min-h-0">
            <div className="flex-1 relative min-h-0">
              <ScrollArea ref={scrollRef} className="h-full">
                <div className="px-4 sm:px-6 py-4 space-y-3">
                  {isLoading ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Carregando mensagens…
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Ninguém falou nada ainda. Seja o primeiro a quebrar o silêncio.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.user_id === user?.id;
                      const name = m.author?.display_name || "Aventureiro";
                      const initials = name.substring(0, 2).toUpperCase();
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex gap-3 group",
                            isMe && "flex-row-reverse"
                          )}
                        >
                          <Link
                            to={`/dashboard/perfil/${m.user_id}`}
                            className="shrink-0"
                          >
                            <Avatar className="h-9 w-9">
                              {m.author?.avatar_url && (
                                <AvatarImage src={m.author.avatar_url} alt={name} />
                              )}
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div
                            className={cn(
                              "flex flex-col gap-1 max-w-[75%]",
                              isMe && "items-end"
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-baseline gap-2 text-xs",
                                isMe && "flex-row-reverse"
                              )}
                            >
                              <Link
                                to={`/dashboard/perfil/${m.user_id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {name}
                              </Link>
                              <span className="text-muted-foreground">
                                {formatDistanceToNow(new Date(m.created_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                                isMe
                                  ? "bg-primary/15 text-foreground border border-primary/30"
                                  : "bg-muted/50 text-foreground border border-border"
                              )}
                            >
                              {m.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {hasNew && !atBottom && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={scrollToBottom}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-lg animate-fade-in"
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Novas mensagens
                </Button>
              )}
            </div>

            <form
              onSubmit={handleSend}
              className="border-t border-border p-3 sm:p-4 flex items-end gap-2 shrink-0"
            >
              <div className="flex-1 flex flex-col gap-1">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={user ? "Diga algo à taverna…" : "Faça login para conversar"}
                  maxLength={MAX_LEN + 20}
                  disabled={!user || isSending}
                  className="bg-background"
                />
                <span
                  className={cn(
                    "text-[11px] self-end",
                    overLimit ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {remaining} / {MAX_LEN}
                </span>
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={!user || isSending || !text.trim() || overLimit}
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Mensagens;
