import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Loader2, ScrollText, Send, ShieldCheck, Sparkles, Star, UserCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { GlimerAvatar } from "@/components/GlimerAvatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type PresenceStatus = "attended" | "excused" | "no_show";

interface Player {
  player_id: string;
  profiles?: { display_name?: string | null } | null;
}

interface EndSessionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableTitle: string;
  players: Player[];
  hasDiscord: boolean;
  sendDiscord: (sessionNumber: number) => Promise<boolean>;
  onCompleted: (sessionLogId: string, sessionNumber: number) => void;
}

const presenceOptions: Array<{ value: PresenceStatus; label: string; icon: typeof Check }> = [
  { value: "attended", label: "Presente", icon: Check },
  { value: "excused", label: "Justificada", icon: ShieldCheck },
  { value: "no_show", label: "No-show", icon: X },
];

const today = () => new Date().toISOString().slice(0, 10);

export function EndSessionPanel({
  open,
  onOpenChange,
  tableId,
  tableTitle,
  players,
  hasDiscord,
  sendDiscord,
  onCompleted,
}: EndSessionPanelProps) {
  const { user } = useAuth();
  const [sessionDate, setSessionDate] = useState(today());
  const [title, setTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [notifyPlayers, setNotifyPlayers] = useState(true);
  const [publishDiscord, setPublishDiscord] = useState(hasDiscord);
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});
  const [ratings, setRatings] = useState<Record<string, [number, number, number]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSessionDate(today());
    setTitle("");
    setNarrative("");
    setNotifyPlayers(true);
    setPublishDiscord(hasDiscord);
    setPresence(Object.fromEntries(players.map((player) => [player.player_id, "attended"])));
    setRatings({});
  }, [open, players, hasDiscord]);

  const attendedCount = useMemo(
    () => Object.values(presence).filter((status) => status === "attended").length,
    [presence],
  );

  const setRating = (playerId: string, criterion: number, value: number) => {
    setRatings((current) => {
      const next = [...(current[playerId] ?? [0, 0, 0])] as [number, number, number];
      next[criterion] = value;
      return { ...current, [playerId]: next };
    });
  };

  const handleClose = async () => {
    if (!user || !title.trim()) return;
    setSubmitting(true);
    try {
      const attendance = players.map((player) => ({
        player_id: player.player_id,
        status: presence[player.player_id] ?? "attended",
        had_prior_notice: false,
      }));
      const { data, error } = await supabase.rpc("close_table_session" as any, {
        _table_id: tableId,
        _session_date: sessionDate,
        _title: title.trim(),
        _master_narrative: narrative.trim(),
        _presence: attendance,
        _notify_players: notifyPlayers,
      } as any);
      if (error) throw error;
      const result = data as unknown as { session_log_id: string; session_number: number };

      const completedRatings = Object.entries(ratings).filter(([, values]) => values.every((value) => value > 0));
      if (completedRatings.length > 0) {
        const { error: feedbackError } = await supabase.from("session_feedback").insert(
          completedRatings.map(([reviewedId, values]) => ({
            table_id: tableId,
            session_log_id: result.session_log_id,
            session_number: result.session_number,
            reviewer_id: user.id,
            reviewed_id: reviewedId,
            reviewer_role: "master",
            rating_1: values[0],
            rating_2: values[1],
            rating_3: values[2],
            compliments: [],
          })) as any,
        );
        if (feedbackError) throw feedbackError;
      }

      let discordSent = true;
      if (publishDiscord && hasDiscord) discordSent = await sendDiscord(result.session_number);
      toast({
        title: `Sessão ${result.session_number} encerrada`,
        description: discordSent ? "Diário e presenças foram registrados." : "Tudo foi salvo, mas o aviso no Discord falhou.",
        variant: discordSent ? "default" : "destructive",
      });
      onCompleted(result.session_log_id, result.session_number);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Não foi possível encerrar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-5xl gap-0 overflow-hidden border-secondary/25 bg-card p-0 shadow-[var(--shadow-session)] sm:rounded-xl">
        <DialogHeader className="relative border-b border-secondary/20 bg-gradient-to-r from-secondary/10 via-primary/5 to-transparent px-5 py-5 text-left sm:px-8 sm:py-6">
          <Sparkles className="pointer-events-none absolute right-8 top-3 h-20 w-20 text-secondary/10" />
          <DialogTitle className="font-heading text-2xl text-secondary sm:text-3xl">Selar registro da sessão</DialogTitle>
          <DialogDescription>{tableTitle} · o encerramento cria um novo capítulo no Diário.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[calc(90dvh-12rem)] overflow-y-auto lg:grid-cols-12">
          <section className="space-y-5 border-b border-border p-5 lg:col-span-5 lg:border-b-0 lg:border-r sm:p-7">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-secondary">
                <UserCheck className="h-4 w-4" /> Presença dos aventureiros
              </h3>
              <span className="text-xs text-muted-foreground">{attendedCount}/{players.length} presentes</span>
            </div>
            <div className="space-y-3">
              {players.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Nenhum jogador aceito nesta mesa.</p>}
              {players.map((player) => {
                const name = player.profiles?.display_name || "Jogador";
                return (
                  <div key={player.player_id} className="rounded-md border border-border bg-background/40 p-3">
                    <div className="mb-3 flex items-center gap-3">
                      <GlimerAvatar userId={player.player_id} fallbackText={name} label={name} className="h-10 w-10" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {presenceOptions.map((option) => {
                        const Icon = option.icon;
                        const selected = presence[player.player_id] === option.value;
                        return (
                          <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={selected ? (option.value === "no_show" ? "destructive" : "default") : "outline"}
                            className={cn("h-auto min-h-9 px-1.5 text-[10px] sm:text-xs", selected && option.value === "excused" && "bg-secondary text-secondary-foreground hover:bg-secondary/90")}
                            onClick={() => setPresence((current) => ({ ...current, [player.player_id]: option.value }))}
                          >
                            <Icon className="h-3.5 w-3.5" /> {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {players.length > 0 && (
              <div className="rounded-md border border-secondary/15 bg-secondary/5 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-secondary"><Star className="h-4 w-4" /> Avaliações opcionais</h3>
                <div className="space-y-4">
                  {players.map((player) => {
                    const name = player.profiles?.display_name || "Jogador";
                    const values = ratings[player.player_id] ?? [0, 0, 0];
                    return (
                      <div key={player.player_id} className="space-y-2">
                        <p className="text-xs font-medium">{name}</p>
                        {["Pontualidade", "Engajamento", "Equipe"].map((criterion, criterionIndex) => (
                          <div key={criterion} className="flex items-center justify-between gap-3">
                            <span className="text-[11px] text-muted-foreground">{criterion}</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <Button key={value} type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`${criterion}: ${value}`} onClick={() => setRating(player.player_id, criterionIndex, value)}>
                                  <Star className={cn("h-4 w-4", value <= values[criterionIndex] ? "fill-secondary text-secondary" : "text-muted-foreground/30")} />
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-5 p-5 lg:col-span-7 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <div className="space-y-2">
                <label htmlFor="session-title" className="text-xs font-bold uppercase text-secondary">Título do capítulo</label>
                <Input id="session-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: O eco sob a montanha" maxLength={100} />
              </div>
              <div className="space-y-2">
                <label htmlFor="session-date" className="text-xs font-bold uppercase text-secondary">Data</label>
                <div className="relative"><CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="session-date" type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className="pl-9" /></div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="session-narrative" className="flex items-center gap-2 text-xs font-bold uppercase text-secondary"><ScrollText className="h-4 w-4" /> Diário do mestre</label>
              <Textarea id="session-narrative" value={narrative} onChange={(event) => setNarrative(event.target.value)} className="min-h-40 resize-y bg-background/50" placeholder="Registre os acontecimentos, decisões e consequências desta sessão..." />
              <p className="text-xs text-muted-foreground">O relato poderá ser revisado depois no Diário.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-md border border-border bg-background/35 p-4">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">Convidar jogadores para avaliar</p><p className="text-xs text-muted-foreground">O convite se refere somente a esta nova sessão.</p></div>
                <Switch checked={notifyPlayers} onCheckedChange={setNotifyPlayers} aria-label="Convidar jogadores para avaliar" />
              </div>
              <div className="flex items-center gap-4 rounded-md border border-border bg-background/35 p-4">
                <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-medium"><Send className="h-4 w-4 text-secondary" /> Avisar no Discord</p><p className="text-xs text-muted-foreground">{hasDiscord ? "Publica o encerramento no canal configurado." : "Configure a integração para habilitar."}</p></div>
                <Switch checked={publishDiscord} onCheckedChange={setPublishDiscord} disabled={!hasDiscord} aria-label="Avisar no Discord" />
              </div>
            </div>

            <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Ao selar este registro</p>
              <p>Um novo capítulo será criado, {players.length} presença(s) serão registradas e a mesa continuará aberta normalmente.</p>
            </div>
          </section>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-secondary/20 bg-background/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-center text-xs text-muted-foreground sm:text-left">Avaliações incompletas serão ignoradas e poderão ser feitas depois.</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button type="button" className="flex-1 bg-gradient-to-r from-primary to-secondary font-bold sm:flex-none" onClick={handleClose} disabled={submitting || !title.trim()}>
              {submitting ? <Loader2 className="animate-spin" /> : <Sparkles />} {submitting ? "Selando..." : "Selar sessão"}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}