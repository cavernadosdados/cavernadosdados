import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, differenceInCalendarDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  CalendarClock,
  BookOpen,
  Users,
  AlertTriangle,
  Inbox,
  CalendarOff,
  Check,
  X,
  Clock as ClockIcon,
  ScrollText,
  Pencil,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAttendanceList } from "@/hooks/useNextSession";

interface AcceptedPlayer {
  player_id: string;
  profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
}

interface Props {
  tableId: string;
  isMaster: boolean;
  nextSessionDate: string | null;
  scheduleTime?: string | null;
  acceptedPlayers?: AcceptedPlayer[];
  maxPlayers: number;
  onGoToTab: (tab: string) => void;
}

export function CampaignDashboard({
  tableId,
  isMaster,
  nextSessionDate,
  scheduleTime,
  acceptedPlayers = [],
  maxPlayers,
  onGoToTab,
}: Props) {
  // ========= Última sessão (último session_log) =========
  const { data: lastLog } = useQuery({
    queryKey: ["last-session-log", tableId],
    enabled: !!tableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_logs")
        .select("id, title, session_number, session_date, master_narrative, ai_epic_summary")
        .eq("table_id", tableId)
        .order("session_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // ========= Pendências do mestre =========
  const { data: pendingApps = 0 } = useQuery({
    queryKey: ["pending-apps-count", tableId],
    enabled: !!tableId && isMaster,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("table_applications")
        .select("id", { count: "exact", head: true })
        .eq("table_id", tableId)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: emptyDiaries = 0 } = useQuery({
    queryKey: ["empty-diaries-count", tableId],
    enabled: !!tableId && isMaster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_logs")
        .select("id, master_narrative")
        .eq("table_id", tableId);
      if (error) throw error;
      return (data ?? []).filter((l) => !l.master_narrative || l.master_narrative.trim().length < 10).length;
    },
  });

  const { data: pendingJustifications = 0 } = useQuery({
    queryKey: ["pending-justifications-count", tableId],
    enabled: !!tableId && isMaster,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("session_presence" as any)
        .select("id", { count: "exact", head: true })
        .eq("table_id", tableId)
        .eq("justification_status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // ========= Presenças da próxima sessão =========
  const { data: attendance = [] } = useAttendanceList(tableId, nextSessionDate);

  const attendanceMap = useMemo(() => {
    const m = new Map<string, "confirmed" | "declined" | "pending">();
    attendance.forEach((a) => m.set(a.player_id, a.status as any));
    return m;
  }, [attendance]);

  const counts = useMemo(() => {
    let confirmed = 0;
    let declined = 0;
    let pending = 0;
    acceptedPlayers.forEach((p) => {
      const s = attendanceMap.get(p.player_id);
      if (s === "confirmed") confirmed++;
      else if (s === "declined") declined++;
      else pending++;
    });
    return { confirmed, declined, pending };
  }, [acceptedPlayers, attendanceMap]);

  // ========= Próxima sessão helpers =========
  const sessionDateObj = nextSessionDate ? new Date(nextSessionDate) : null;
  const daysUntil = sessionDateObj ? differenceInCalendarDays(sessionDateObj, new Date()) : null;
  const sessionPast = sessionDateObj ? isPast(sessionDateObj) : false;

  const countdownLabel = (() => {
    if (!sessionDateObj) return null;
    if (sessionPast) return "Aconteceu";
    if (daysUntil === 0) return "Hoje";
    if (daysUntil === 1) return "Amanhã";
    return `Em ${daysUntil} dias`;
  })();

  const totalPending =
    (pendingApps ?? 0) + (emptyDiaries ?? 0) + (pendingJustifications ?? 0) +
    (!nextSessionDate ? 1 : 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* ===== HERO: PRÓXIMA SESSÃO ===== */}
      <Card className="lg:col-span-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_60%)] pointer-events-none" />
        <CardHeader className="pb-3 relative">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Próxima Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {sessionDateObj ? (
            <>
              <div className="flex flex-wrap items-end gap-3">
                {countdownLabel && (
                  <div className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-primary font-bold text-lg leading-none shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
                    {countdownLabel}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-lg font-semibold capitalize text-foreground leading-tight">
                    {format(sessionDateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    {scheduleTime ? ` · ${scheduleTime}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(sessionDateObj, { locale: ptBR, addSuffix: true })}
                  </div>
                </div>
              </div>

              {acceptedPlayers.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <StatPill
                    icon={<Check className="h-3.5 w-3.5" />}
                    label="Confirmados"
                    value={`${counts.confirmed}/${acceptedPlayers.length}`}
                    tone="success"
                  />
                  <StatPill
                    icon={<X className="h-3.5 w-3.5" />}
                    label="Não vão"
                    value={String(counts.declined)}
                    tone="destructive"
                  />
                  <StatPill
                    icon={<ClockIcon className="h-3.5 w-3.5" />}
                    label="Pendentes"
                    value={String(counts.pending)}
                    tone="muted"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-center">
              <CalendarOff className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                {isMaster ? "Nenhuma sessão agendada." : "O Mestre ainda não agendou a próxima sessão."}
              </p>
              {isMaster && (
                <Button size="sm" variant="outline" onClick={() => onGoToTab("social")} className="gap-1">
                  Agendar sessão <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== PENDÊNCIAS (mestre) OU STATUS SIMPLES (jogador) ===== */}
      {isMaster ? (
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Pendências
              {totalPending > 0 && (
                <Badge variant="default" className="ml-auto text-[10px] px-1.5 py-0">
                  {totalPending}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <PendingItem
              icon={<Inbox className="h-4 w-4" />}
              label="Candidaturas para revisar"
              count={pendingApps}
              onClick={() => onGoToTab("applications")}
            />
            <PendingItem
              icon={<ScrollText className="h-4 w-4" />}
              label="Diários sem narrativa"
              count={emptyDiaries}
              onClick={() => onGoToTab("diary")}
            />
            <PendingItem
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Justificativas a avaliar"
              count={pendingJustifications}
              onClick={() => onGoToTab("diary")}
            />
            <PendingItem
              icon={<CalendarOff className="h-4 w-4" />}
              label="Próxima sessão sem data"
              count={!nextSessionDate ? 1 : 0}
              onClick={() => onGoToTab("social")}
            />
            {totalPending === 0 && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-center text-xs text-primary">
                <Sparkles className="h-4 w-4 mx-auto mb-1" />
                Tudo em dia, mestre!
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Sua presença
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextSessionDate ? (
              <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => onGoToTab("social")}>
                Confirmar presença <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Aguardando o Mestre agendar a próxima sessão.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== ÚLTIMA SESSÃO ===== */}
      <Card className="border-border bg-card/60 lg:col-span-2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Última Sessão
          </CardTitle>
          {lastLog && (
            <Button size="sm" variant="ghost" className="gap-1 h-7" onClick={() => onGoToTab("diary")}>
              Ver diário <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {lastLog ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  Sessão #{lastLog.session_number}
                </Badge>
                <span className="text-sm font-semibold text-foreground truncate">{lastLog.title}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(lastLog.session_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </span>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {lastLog.ai_epic_summary?.trim() ||
                  lastLog.master_narrative?.trim() ||
                  "Esta sessão ainda não tem narrativa registrada."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-background/40 p-4 text-center">
              <ScrollText className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-2">
                Nenhuma sessão registrada ainda.
              </p>
              {isMaster && (
                <Button size="sm" variant="outline" onClick={() => onGoToTab("diary")} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Registrar primeira sessão
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== STATUS DOS JOGADORES ===== */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Jogadores
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              {acceptedPlayers.length}/{maxPlayers}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {acceptedPlayers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Ainda sem jogadores aceitos.
            </p>
          ) : (
            acceptedPlayers.map((p) => {
              const status = attendanceMap.get(p.player_id);
              const name = p.profiles?.display_name || "Jogador";
              return (
                <div
                  key={p.player_id}
                  className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1.5"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground truncate flex-1">{name}</span>
                  {nextSessionDate && <AttendanceDot status={status} />}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "destructive" | "muted";
}) {
  const cls =
    tone === "success"
      ? "border-primary/40 bg-primary/10 text-primary"
      : tone === "destructive"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-border bg-muted/30 text-muted-foreground";
  return (
    <div className={`rounded-md border px-2.5 py-2 ${cls}`}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-80">
        {icon} {label}
      </div>
      <div className="text-lg font-bold leading-none mt-1">{value}</div>
    </div>
  );
}

function PendingItem({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  const has = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
        has
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground"
          : "border-border bg-background/40 hover:bg-background/60 text-muted-foreground"
      }`}
    >
      <span className={has ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {has ? (
        <Badge variant="default" className="text-[10px] px-1.5 py-0">
          {count}
        </Badge>
      ) : (
        <Check className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}

function AttendanceDot({ status }: { status?: "confirmed" | "declined" | "pending" }) {
  if (status === "confirmed")
    return (
      <Badge variant="outline" className="gap-1 text-[10px] border-primary/40 text-primary">
        <Check className="h-2.5 w-2.5" /> Confirmado
      </Badge>
    );
  if (status === "declined")
    return (
      <Badge variant="outline" className="gap-1 text-[10px] border-destructive/40 text-destructive">
        <X className="h-2.5 w-2.5" /> Não vai
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
      <ClockIcon className="h-2.5 w-2.5" /> Pendente
    </Badge>
  );
}