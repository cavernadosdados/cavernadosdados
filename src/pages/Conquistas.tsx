import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crown, Shield, Compass, Swords, Star, Scroll, Sparkles, Trophy, Lock, Gem, Zap,
} from "lucide-react";
import { useAchievements, type AchievementProgress } from "@/hooks/useAchievements";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  crown: Crown,
  shield: Shield,
  compass: Compass,
  swords: Swords,
  star: Star,
  scroll: Scroll,
  sparkles: Sparkles,
  trophy: Trophy,
};

const Conquistas = () => {
  const { data: achievements, isLoading } = useAchievements();

  const unlockedCount = achievements?.filter((a) => a.unlocked).length ?? 0;
  const totalCount = achievements?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold flex items-center gap-2">
            <Trophy className="h-8 w-8" /> Conquistas
          </h1>
          <p className="text-muted-foreground mt-2">
            Desbloqueie conquistas conforme avança nas suas aventuras e ganhe XP e Tokens extras.
          </p>
        </div>

        {!isLoading && achievements && (
          <Card className="bg-gradient-to-br from-card to-card/50 border-primary/40">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Progresso geral</p>
                <p className="text-2xl font-bold">
                  {unlockedCount} <span className="text-muted-foreground text-base">/ {totalCount} conquistas</span>
                </p>
              </div>
              <div className="flex-1 max-w-md">
                <Progress value={totalCount ? (unlockedCount / totalCount) * 100 : 0} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)
            : achievements?.map((a) => <AchievementCard key={a.code} achievement={a} />)}
        </div>
      </div>
    </DashboardLayout>
  );
};

const AchievementCard = ({ achievement }: { achievement: AchievementProgress }) => {
  const Icon = ICONS[achievement.icon] ?? Trophy;
  const pct = Math.min(100, (achievement.current_value / achievement.target) * 100);
  const unlocked = achievement.unlocked;

  return (
    <Card
      className={`transition-mystical ${
        unlocked
          ? "border-primary/60 bg-gradient-to-br from-card to-primary/5 glow-gold"
          : "border-border bg-card/50"
      }`}
    >
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <div
          className={`p-3 rounded-lg shrink-0 ${
            unlocked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className={`text-lg ${unlocked ? "" : "text-muted-foreground"}`}>
              {achievement.title}
            </CardTitle>
            {unlocked && <Badge variant="default">Desbloqueada</Badge>}
          </div>
          <CardDescription className="mt-1">{achievement.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>
              {Math.min(achievement.current_value, achievement.target)} / {achievement.target}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {achievement.xp_reward > 0 && (
              <span className="flex items-center gap-1 text-secondary">
                <Zap className="h-3.5 w-3.5" /> +{achievement.xp_reward} XP
              </span>
            )}
            {achievement.tokens_reward > 0 && (
              <span className="flex items-center gap-1 text-primary">
                <Gem className="h-3.5 w-3.5" /> +{achievement.tokens_reward}
              </span>
            )}
          </div>
          {unlocked && achievement.unlocked_at && (
            <span className="text-muted-foreground">
              {format(new Date(achievement.unlocked_at), "dd MMM yyyy", { locale: ptBR })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Conquistas;