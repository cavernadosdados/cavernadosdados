import { useMemo, useState } from "react";
import {
  useSessionPresence,
  useMarkPresence,
  useSubmitJustification,
  useReviewJustification,
  type PresenceStatus,
} from "@/hooks/useSessionPresence";
import { useAttendanceList } from "@/hooks/useNextSession";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Check, X, ShieldCheck, UserCheck, AlertTriangle, MessageSquare } from "lucide-react";

interface SessionPresencePanelProps {
  tableId: string;
  sessionLogId: string;
  sessionDate: string; // YYYY-MM-DD do session_logs
  isMaster: boolean;
}

/** Lista jogadores aceitos da mesa */
const useAcceptedPlayers = (tableId: string) => {
  return useQuery({
    queryKey: ["accepted-players", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_applications")
        .select("player_id, profiles:player_id(display_name, avatar_url)")
        .eq("table_id", tableId)
        .eq("status", "accepted");
      if (error) throw error;
      return (data ?? []) as Array<{
        player_id: string;
        profiles?: { display_name: string | null; avatar_url: string | null } | null;
      }>;
    },
  });
};

const STATUS_LABEL: Record<PresenceStatus, string> = {
  attended: "Presente",
  excused: "Falta justificada",
  no_show: "No-show",
};

export function SessionPresencePanel({
  tableId,
  sessionLogId,
  sessionDate,
  isMaster,
}: SessionPresencePanelProps) {
  const { user } = useAuth();
  const { data: presence = [] } = useSessionPresence(sessionLogId);
  const { data: players = [] } = useAcceptedPlayers(tableId);
  // Aviso prévio: jogadores que marcaram "declined" no session_attendance antes da data
  const { data: attendance = [] } = useAttendanceList(tableId, sessionDate);

  const markPresence = useMarkPresence(sessionLogId);
  const reviewJust = useReviewJustification(sessionLogId);
  const submitJust = useSubmitJustification(sessionLogId);

  const presenceByPlayer = useMemo(() => {
    const m = new Map<string, (typeof presence)[number]>();
    presence.forEach((p) => m.set(p.player_id, p));
    return m;
  }, [presence]);

  const priorNoticeBy = useMemo(() => {
    const s = new Set<string>();
    attendance.forEach((a) => {
      if (a.status === "declined") s.add(a.player_id);
    });
    return s;
  }, [attendance]);

  if (isMaster) {
    return (
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Presença da Sessão
            <Badge variant="secondary" className="text-[10px]">
              {presence.filter((p) => p.status === "attended").length}/{players.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum jogador aceito na mesa ainda.
            </p>
          )}
          {players.map((pl) => {
            const rec = presenceByPlayer.get(pl.player_id);
            const status = rec?.status;
            const hadNotice = priorNoticeBy.has(pl.player_id);
            const name = pl.profiles?.display_name || "Jogador";

            return (
              <div
                key={pl.player_id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={pl.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{name}</p>
                    {hadNotice && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/40 text-primary"
                      >
                        Avisou previamente
                      </Badge>
                    )}
                    {status && (
                      <Badge
                        className="text-[10px]"
                        variant={
                          status === "attended"
                            ? "default"
                            : status === "excused"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {STATUS_LABEL[status]}
                      </Badge>
                    )}
                  </div>
                  {rec?.player_justification && (
                    <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
                      <p className="font-medium flex items-center gap-1 mb-1">
                        <MessageSquare className="h-3 w-3" />
                        Justificativa do jogador
                        {rec.justification_status === "pending" && (
                          <Badge variant="outline" className="ml-1 text-[9px]">
                            Pendente
                          </Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {rec.player_justification}
                      </p>
                      {rec.justification_status === "pending" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              reviewJust.mutate({ presenceId: rec.id, accept: true })
                            }
                            disabled={reviewJust.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" /> Aceitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              reviewJust.mutate({ presenceId: rec.id, accept: false })
                            }
                            disabled={reviewJust.isPending}
                          >
                            <X className="h-3 w-3 mr-1" /> Recusar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant={status === "attended" ? "default" : "outline"}
                    className="h-8 gap-1"
                    onClick={() =>
                      markPresence.mutate({
                        tableId,
                        playerId: pl.player_id,
                        status: "attended",
                        hadPriorNotice: hadNotice,
                      })
                    }
                    disabled={markPresence.isPending}
                  >
                    <Check className="h-3.5 w-3.5" /> Presente
                  </Button>
                  <Button
                    size="sm"
                    variant={status === "excused" ? "secondary" : "outline"}
                    className="h-8 gap-1"
                    onClick={() =>
                      markPresence.mutate({
                        tableId,
                        playerId: pl.player_id,
                        status: "excused",
                        hadPriorNotice: hadNotice,
                      })
                    }
                    disabled={markPresence.isPending}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Justificada
                  </Button>
                  <Button
                    size="sm"
                    variant={status === "no_show" ? "destructive" : "outline"}
                    className="h-8 gap-1"
                    onClick={() =>
                      markPresence.mutate({
                        tableId,
                        playerId: pl.player_id,
                        status: "no_show",
                        hadPriorNotice: hadNotice,
                      })
                    }
                    disabled={markPresence.isPending}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> No-show
                  </Button>
                </div>
              </div>
            );
          })}
          <Separator />
          <p className="text-xs text-muted-foreground">
            Faltas marcadas como <span className="text-foreground">"justificada"</span> não
            afetam a confiabilidade do jogador. <span className="text-foreground">"No-show"</span>{" "}
            reduz o índice de presença.
          </p>
        </CardContent>
      </Card>
    );
  }

  // === Visão do jogador ===
  const myRec = user ? presenceByPlayer.get(user.id) : undefined;
  return (
    <Card className="border-border bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Sua Presença
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!myRec ? (
          <p className="text-sm text-muted-foreground">
            O mestre ainda não registrou a presença desta sessão.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">Status:</span>
              <Badge
                variant={
                  myRec.status === "attended"
                    ? "default"
                    : myRec.status === "excused"
                    ? "secondary"
                    : "destructive"
                }
              >
                {STATUS_LABEL[myRec.status]}
              </Badge>
            </div>
            {myRec.status === "no_show" && myRec.justification_status === "none" && (
              <JustificationForm
                onSubmit={(text) =>
                  submitJust.mutate({ presenceId: myRec.id, text })
                }
                pending={submitJust.isPending}
              />
            )}
            {myRec.justification_status === "pending" && (
              <p className="text-xs text-muted-foreground">
                ⏳ Sua justificativa está aguardando análise do mestre.
              </p>
            )}
            {myRec.justification_status === "accepted" && (
              <p className="text-xs text-primary">
                ✅ Sua justificativa foi aceita — a falta não afeta sua reputação.
              </p>
            )}
            {myRec.justification_status === "rejected" && (
              <p className="text-xs text-destructive">
                ❌ Sua justificativa foi recusada pelo mestre.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function JustificationForm({
  onSubmit,
  pending,
}: {
  onSubmit: (text: string) => void;
  pending: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Você foi marcado como ausente. Envie uma justificativa para o mestre avaliar.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Conte o que aconteceu..."
        className="min-h-[80px] bg-background/50"
      />
      <Button
        size="sm"
        disabled={pending || text.trim().length < 5}
        onClick={() => onSubmit(text.trim())}
      >
        Enviar justificativa
      </Button>
    </div>
  );
}