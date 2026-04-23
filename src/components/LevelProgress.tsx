import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Sparkles } from "lucide-react";
import { useXp } from "@/hooks/useXp";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

/**
 * Mostra o nível atual e a barra de progresso de XP do usuário no Dashboard.
 */
export const LevelProgress = () => {
  const { data } = useXp();
  const { user } = useAuth();
  const prevLevelRef = useRef<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!data || !user) return;
    const storageKey = `last_known_level_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    const storedLevel = stored ? parseInt(stored, 10) : null;

    // Initialize on first load — no celebration on mount.
    if (prevLevelRef.current === null) {
      prevLevelRef.current = data.level;
      if (storedLevel === null) {
        localStorage.setItem(storageKey, String(data.level));
      } else if (data.level > storedLevel) {
        // Level changed while user was away — celebrate now.
        triggerCelebration(data.level);
        localStorage.setItem(storageKey, String(data.level));
      }
      return;
    }

    if (data.level > prevLevelRef.current) {
      triggerCelebration(data.level);
      localStorage.setItem(storageKey, String(data.level));
    }
    prevLevelRef.current = data.level;

    function triggerCelebration(newLevel: number) {
      setCelebrating(true);
      toast.success(`🎉 Subiu pro nível ${newLevel}!`, {
        description: "Continue a aventura pra desbloquear novas conquistas.",
        duration: 5000,
      });
      window.setTimeout(() => setCelebrating(false), 2200);
    }
  }, [data, user]);

  if (!data) return null;

  const remaining = data.xpForNextLevel - data.xpInLevel;

  return (
    <Card
      className={`relative overflow-hidden bg-gradient-to-br from-card to-card/50 border-secondary/40 transition-mystical ${
        celebrating ? "border-primary glow-gold animate-scale-in" : ""
      }`}
    >
      {celebrating && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 animate-pulse" />
          <Sparkles className="h-16 w-16 text-primary animate-scale-in drop-shadow-[0_0_12px_hsl(var(--primary))]" />
        </div>
      )}
      <CardContent className="py-4 relative">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`text-sm px-2 py-1 flex items-center gap-1 ${
                celebrating ? "bg-primary text-primary-foreground" : ""
              }`}
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
