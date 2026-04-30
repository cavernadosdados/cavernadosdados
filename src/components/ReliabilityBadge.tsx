import { usePlayerReliability } from "@/hooks/useSessionPresence";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

interface ReliabilityBadgeProps {
  playerId: string;
  /** Mostra versão compacta (só percentual) */
  compact?: boolean;
}

export function ReliabilityBadge({ playerId, compact = false }: ReliabilityBadgeProps) {
  const { data, isLoading } = usePlayerReliability(playerId);

  if (isLoading || !data) return null;
  if (data.total_sessions === 0) {
    if (compact) return null;
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Shield className="h-3 w-3" />
        Sem histórico
      </Badge>
    );
  }

  const pct = data.reliability_pct;
  const tone =
    pct >= 90
      ? { variant: "default" as const, Icon: ShieldCheck, label: "Confiável" }
      : pct >= 70
      ? { variant: "secondary" as const, Icon: Shield, label: "Regular" }
      : { variant: "destructive" as const, Icon: ShieldAlert, label: "Atenção" };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={tone.variant} className="gap-1 text-xs cursor-help">
            <tone.Icon className="h-3 w-3" />
            {pct}% de presença
            {!compact && ` • ${tone.label}`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-xs space-y-0.5">
            <p className="font-semibold">Índice de confiabilidade</p>
            <p>✅ Presente: {data.attended}</p>
            <p>🛡️ Falta justificada: {data.excused}</p>
            <p>⚠️ No-show: {data.no_shows}</p>
            <p className="text-muted-foreground mt-1">
              Faltas justificadas (com aviso prévio ou aprovadas pelo mestre) não pesam.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}