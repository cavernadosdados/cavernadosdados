import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { useXp } from "@/hooks/useXp";

/**
 * Mostra o nível atual e a barra de progresso de XP do usuário no Dashboard.
 */
export const LevelProgress = () => {
  const { data } = useXp();

  if (!data) return null;

  const remaining = data.xpForNextLevel - data.xpInLevel;

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-secondary/40">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-sm px-2 py-1 flex items-center gap-1"
            >
              <Zap className="h-3.5 w-3.5" />
              Nível {data.level}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {data.xpInLevel} / {data.xpForNextLevel} XP
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {remaining} XP até o próximo nível
          </span>
        </div>
        <Progress value={data.progressPct} className="h-2" />
      </CardContent>
    </Card>
  );
};
