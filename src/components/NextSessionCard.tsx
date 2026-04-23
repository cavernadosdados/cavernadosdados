import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Check, X, Clock as ClockIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  useAttendanceList,
  useSetAttendance,
  type AttendanceStatus,
} from "@/hooks/useNextSession";

interface NextSessionCardProps {
  tableId: string;
  isMaster: boolean;
  /** Data atual armazenada (ISO) — para mostrar */
  nextSessionDate: string | null;
  /** Editor (apenas mestre): valor controlado em formato datetime-local (ou "") */
  editorValue: string;
  onEditorChange: (val: string) => void;
  /** Lista de jogadores aceitos (para mostrar pendentes mesmo sem registro) */
  acceptedPlayers?: Array<{
    player_id: string;
    profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
  }>;
}

export function NextSessionCard({
  tableId,
  isMaster,
  nextSessionDate,
  editorValue,
  onEditorChange,
  acceptedPlayers,
}: NextSessionCardProps) {
  const { user } = useAuth();
  const { data: attendance } = useAttendanceList(tableId, nextSessionDate);
  const { mutate: setAttendance, isPending } = useSetAttendance(tableId, nextSessionDate);

  const myStatus: AttendanceStatus | null = useMemo(() => {
    if (!user || !attendance) return null;
    const mine = attendance.find((a) => a.player_id === user.id);
    return mine?.status ?? null;
  }, [attendance, user]);

  const sessionDateObj = nextSessionDate ? new Date(nextSessionDate) : null;
  const formattedDate = sessionDateObj
    ? format(sessionDateObj, "EEEE, dd 'de' MMM 'às' HH:mm", { locale: ptBR })
    : null;

  // Mestre: agrupa jogadores aceitos por status (incluindo pendentes sem registro)
  const grouped = useMemo(() => {
    if (!acceptedPlayers) return { confirmed: [], declined: [], pending: [] };
    const byPlayer = new Map(attendance?.map((a) => [a.player_id, a.status]) ?? []);
    const confirmed: typeof acceptedPlayers = [];
    const declined: typeof acceptedPlayers = [];
    const pending: typeof acceptedPlayers = [];
    acceptedPlayers.forEach((p) => {
      const s = byPlayer.get(p.player_id);
      if (s === "confirmed") confirmed.push(p);
      else if (s === "declined") declined.push(p);
      else pending.push(p);
    });
    return { confirmed, declined, pending };
  }, [acceptedPlayers, attendance]);

  return (
    <div className="space-y-4">
      <Separator />
      <div>
        <Label className="text-sm font-medium flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Próxima sessão
        </Label>

        {isMaster ? (
          <div className="mt-1.5 space-y-2">
            <Input
              type="datetime-local"
              value={editorValue}
              onChange={(e) => onEditorChange(e.target.value)}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              Defina a data e hora da próxima sessão para que os jogadores possam confirmar presença.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {formattedDate || "Ainda não agendada pelo mestre"}
          </p>
        )}

        {isMaster && nextSessionDate && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Agendada: </span>
            <span className="text-primary font-semibold capitalize">{formattedDate}</span>
          </div>
        )}
      </div>

      {/* Jogador: ações de presença */}
      {!isMaster && nextSessionDate && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Você vai?</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={myStatus === "confirmed" ? "default" : "outline"}
              onClick={() => setAttendance("confirmed")}
              disabled={isPending}
              className="gap-2"
            >
              <Check className="h-4 w-4" /> Confirmar
            </Button>
            <Button
              size="sm"
              variant={myStatus === "declined" ? "destructive" : "outline"}
              onClick={() => setAttendance("declined")}
              disabled={isPending}
              className="gap-2"
            >
              <X className="h-4 w-4" /> Não vou
            </Button>
            {myStatus && (
              <Badge variant="secondary" className="self-center">
                {myStatus === "confirmed"
                  ? "Você confirmou"
                  : myStatus === "declined"
                  ? "Você recusou"
                  : "Pendente"}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Mestre: lista de presença */}
      {isMaster && nextSessionDate && acceptedPlayers && acceptedPlayers.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Presença confirmada
            <span className="text-xs text-muted-foreground font-normal">
              ({grouped.confirmed.length}/{acceptedPlayers.length})
            </span>
          </Label>
          <AttendanceGroup
            label="Confirmados"
            tone="success"
            icon={<Check className="h-3 w-3" />}
            players={grouped.confirmed}
          />
          <AttendanceGroup
            label="Não vão"
            tone="destructive"
            icon={<X className="h-3 w-3" />}
            players={grouped.declined}
          />
          <AttendanceGroup
            label="Pendentes"
            tone="muted"
            icon={<ClockIcon className="h-3 w-3" />}
            players={grouped.pending}
          />
        </div>
      )}
    </div>
  );
}

function AttendanceGroup({
  label,
  tone,
  icon,
  players,
}: {
  label: string;
  tone: "success" | "destructive" | "muted";
  icon: React.ReactNode;
  players: Array<{
    player_id: string;
    profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
  }>;
}) {
  if (players.length === 0) return null;
  const toneClass =
    tone === "success"
      ? "border-primary/40 bg-primary/10 text-primary"
      : tone === "destructive"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-border bg-muted/30 text-muted-foreground";
  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide mb-2">
        {icon}
        {label} ({players.length})
      </div>
      <div className="flex flex-wrap gap-2">
        {players.map((p) => {
          const name = p.profiles?.display_name || "Jogador";
          const initial = name.charAt(0).toUpperCase();
          return (
            <div key={p.player_id} className="flex items-center gap-1.5 bg-background/60 rounded-full pl-1 pr-2 py-0.5 text-xs text-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}