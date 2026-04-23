import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Gamepad2,
  MapPin,
  Users,
  BookOpen,
  Check,
  X,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CalendarSession } from "@/hooks/useSessionsCalendar";
import {
  useAttendanceList,
  useSetAttendance,
  type AttendanceStatus,
} from "@/hooks/useNextSession";
import { useAuth } from "@/hooks/useAuth";

interface SessionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CalendarSession | null;
}

export function SessionDetailsDialog({ open, onOpenChange, session }: SessionDetailsDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Presença só faz sentido se for sessão futura agendada (is_upcoming) e o usuário for jogador
  const canManageAttendance =
    !!session && session.is_upcoming && session.role === "player" && !!session.next_session_date;

  const { data: attendance } = useAttendanceList(
    canManageAttendance ? session!.table_id : undefined,
    canManageAttendance ? session!.next_session_date! : null
  );
  const setAttendance = useSetAttendance(
    canManageAttendance ? session!.table_id : undefined,
    canManageAttendance ? session!.next_session_date! : null
  );

  const myStatus: AttendanceStatus | null =
    (attendance ?? []).find((a) => a.player_id === user?.id)?.status ?? null;

  if (!session) return null;

  const dateObj = new Date(session.session_date + "T00:00:00");
  const fullDate = format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const goToTable = () => {
    onOpenChange(false);
    navigate(`/dashboard/mesa/${session.table_id}`);
  };

  const goToDetails = () => {
    onOpenChange(false);
    navigate(`/dashboard/mesa/${session.table_id}/detalhes`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-2">
            <Badge variant="secondary" className="capitalize">
              {session.role === "master" ? "Mestre" : "Jogador"}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{session.title}</DialogTitle>
          <DialogDescription className="text-sm">{session.table_title}</DialogDescription>
        </DialogHeader>

        {session.table_cover_url && (
          <div className="rounded-lg overflow-hidden border border-border aspect-[16/7]">
            <img
              src={session.table_cover_url}
              alt={session.table_title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="space-y-3 text-sm">
          <InfoLine
            icon={<CalendarIcon className="h-4 w-4 text-primary" />}
            label="Data"
            value={fullDate}
          />
          {session.schedule_time && (
            <InfoLine
              icon={<Clock className="h-4 w-4 text-primary" />}
              label="Horário"
              value={`${session.schedule_time}${session.timezone ? ` (${session.timezone})` : ""}`}
            />
          )}
          {session.table_system && (
            <InfoLine
              icon={<Gamepad2 className="h-4 w-4 text-primary" />}
              label="Sistema"
              value={session.table_system}
            />
          )}
          {session.table_platform && (
            <InfoLine
              icon={<MapPin className="h-4 w-4 text-primary" />}
              label="Plataforma"
              value={session.table_platform}
            />
          )}
        </div>

        {session.master_narrative && session.master_narrative.trim().length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-primary" />
                Narrativa do mestre
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                {session.master_narrative}
              </p>
            </div>
          </>
        )}

        {canManageAttendance && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Sua presença</p>
                {myStatus && (
                  <Badge
                    variant={
                      myStatus === "confirmed"
                        ? "default"
                        : myStatus === "declined"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {myStatus === "confirmed"
                      ? "Confirmado"
                      : myStatus === "declined"
                      ? "Não vou"
                      : "Pendente"}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={myStatus === "confirmed" ? "default" : "outline"}
                  onClick={() => setAttendance.mutate("confirmed")}
                  disabled={setAttendance.isPending}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant={myStatus === "pending" ? "secondary" : "outline"}
                  onClick={() => setAttendance.mutate("pending")}
                  disabled={setAttendance.isPending}
                  className="gap-1"
                >
                  <HelpCircle className="h-4 w-4" />
                  Pendente
                </Button>
                <Button
                  size="sm"
                  variant={myStatus === "declined" ? "destructive" : "outline"}
                  onClick={() => setAttendance.mutate("declined")}
                  disabled={setAttendance.isPending}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Não vou
                </Button>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={goToDetails} className="gap-2">
            <Users className="h-4 w-4" />
            Ver mesa
          </Button>
          <Button onClick={goToTable} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            {session.role === "master" ? "Painel da aventura" : "Entrar na aventura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const InfoLine = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium capitalize-first break-words">{value}</p>
    </div>
  </div>
);