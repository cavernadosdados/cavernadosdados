import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Gem, HelpCircle, Sparkles, X, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingRewards, type OnboardingStepKey } from "@/hooks/useOnboardingRewards";
import { START_PATH_KEY, type StartPath } from "@/components/OnboardingModal";

interface ChecklistItem {
  id: OnboardingStepKey;
  label: string;
  done: boolean;
  action: () => void;
  actionLabel: string;
  tokens: number;
  xp: number;
  hint: string;
  priority: number;
}

const DISMISS_KEY = "onboarding_checklist_dismissed";
const TOKENS_VISITED_KEY = "onboarding_tokens_visited";
const EXPLORE_VISITED_KEY = "onboarding_explore_visited";

/**
 * Card de checklist mostrado no Dashboard até o usuário completar todas as etapas
 * iniciais (ou dispensar manualmente). Difere por tipo de usuário.
 */
export const OnboardingChecklist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile } = useProfile(user?.id);
  const { claimedSet, claim, isLoading: rewardsLoading } = useOnboardingRewards();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Marca "Conheça os Tokens" como concluído quando o usuário visita a página de Tokens.
  const [tokensVisited, setTokensVisited] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TOKENS_VISITED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [exploreVisited, setExploreVisited] = useState<boolean>(() => {
    try {
      return localStorage.getItem(EXPLORE_VISITED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [startPath, setStartPath] = useState<StartPath | null>(() => {
    try {
      return (localStorage.getItem(START_PATH_KEY) as StartPath | null) ?? null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onStorage = () => {
      try {
        setTokensVisited(localStorage.getItem(TOKENS_VISITED_KEY) === "1");
        setExploreVisited(localStorage.getItem(EXPLORE_VISITED_KEY) === "1");
        setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
        setStartPath((localStorage.getItem(START_PATH_KEY) as StartPath | null) ?? null);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const visitTokens = useCallback(() => {
    try {
      localStorage.setItem(TOKENS_VISITED_KEY, "1");
    } catch {
      // ignore
    }
    setTokensVisited(true);
    navigate("/dashboard/tokens");
  }, [navigate]);

  const visitExplore = useCallback(() => {
    try {
      localStorage.setItem(EXPLORE_VISITED_KEY, "1");
    } catch {
      // ignore
    }
    setExploreVisited(true);
    navigate("/dashboard/explorar");
  }, [navigate]);

  const { data: tablesCount } = useQuery({
    queryKey: ["onboarding-tables-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tables")
        .select("id", { count: "exact", head: true })
        .eq("master_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: appsCount } = useQuery({
    queryKey: ["onboarding-apps-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("table_applications")
        .select("id", { count: "exact", head: true })
        .eq("player_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const items = useMemo<ChecklistItem[]>(() => {
    if (!profile || rewardsLoading) return [];

    const profileDone = Boolean(
      profile.bio &&
        profile.bio.trim().length > 0 &&
        ((profile.master_systems?.length ?? 0) > 0 ||
          (profile.preferred_themes?.length ?? 0) > 0)
    );

    // Unified checklist: every user sees both paths (master + player).
    // Priorities reorder based on the path chosen in onboarding (lower = first).
    const playerFirst = startPath === "player" || startPath === "both" || startPath === null;
    const masterFirst = startPath === "master";

    const base: ChecklistItem[] = [
      {
        id: "profile",
        label: "Complete seu perfil",
        done: profileDone || claimedSet.has("profile"),
        action: () => navigate("/dashboard/perfil"),
        actionLabel: "Editar perfil",
        tokens: 1,
        xp: 50,
        hint: "No menu lateral esquerdo, clique em \"Perfil\" e depois em \"Editar perfil\". Preencha sua bio e selecione ao menos um sistema ou tema favorito.",
        priority: 0,
      },
      {
        id: "explore",
        label: "Explore mesas disponíveis",
        done: exploreVisited || claimedSet.has("explore"),
        action: visitExplore,
        actionLabel: "Explorar",
        tokens: 1,
        xp: 50,
        hint: "No menu lateral, clique em \"Explorar Mesas\". Use os filtros no topo (sistema, tema, plataforma) para encontrar aventuras.",
        priority: playerFirst ? 1 : 4,
      },
      {
        id: "apply",
        label: "Candidate-se a uma aventura",
        done: (appsCount ?? 0) > 0 || claimedSet.has("apply"),
        action: () => navigate("/dashboard/explorar"),
        actionLabel: "Encontrar mesa",
        tokens: 2,
        xp: 75,
        hint: "Em \"Explorar Mesas\", abra um card de mesa e clique no botão \"Candidatar-se\". Escreva uma mensagem curta para o mestre.",
        priority: playerFirst ? 2 : 5,
      },
      {
        id: "table",
        label: "Crie sua primeira mesa como mestre",
        done: (tablesCount ?? 0) > 0 || claimedSet.has("table"),
        action: () => navigate("/dashboard/mesas"),
        actionLabel: "Criar mesa",
        tokens: 1,
        xp: 75,
        hint: "No menu lateral, clique em \"Minhas Mesas\" e depois no botão \"Criar mesa\" no canto superior direito.",
        priority: masterFirst ? 1 : 3,
      },
      {
        id: "tokens",
        label: "Conheça os Tokens de impulsionamento",
        done: tokensVisited || claimedSet.has("tokens"),
        action: visitTokens,
        actionLabel: "Ver Tokens",
        tokens: 2,
        xp: 50,
        hint: "No menu lateral, clique em \"Loja de Tokens\". Você também vê seu saldo no canto superior direito da tela, ao lado do sino de notificações.",
        priority: 6,
      },
    ];

    // Sort: incomplete by priority first; completed at the bottom.
    return base.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.priority - b.priority;
    });
  }, [profile, rewardsLoading, claimedSet, tablesCount, appsCount, navigate, tokensVisited, exploreVisited, visitTokens, visitExplore, startPath]);

  const completedCount = items.filter((i) => i.done).length;
  const allDone = items.length > 0 && completedCount === items.length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  // Reivindica recompensa quando uma etapa fica concluída e ainda não foi paga.
  useEffect(() => {
    items.forEach((item) => {
      if (item.done && !claimedSet.has(item.id)) {
        claim(item.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, claimedSet]);

  if (dismissed || allDone || items.length === 0) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <TooltipProvider delayDuration={150}>
    <Card className="bg-gradient-to-br from-card to-card/50 border-primary/40 relative">
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dispensar checklist"
      >
        <X className="h-4 w-4" />
      </button>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Comece por aqui
        </CardTitle>
        <CardDescription>
          {completedCount} de {items.length} concluído
          {completedCount === 1 ? "" : "s"}
          {startPath && (
            <>
              {" · "}
              <span className="text-primary">
                Foco: {startPath === "master" ? "Mestrar" : startPath === "player" ? "Jogar" : "Explorar tudo"}
              </span>
            </>
          )}
        </CardDescription>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span
                    className={
                      item.done
                        ? "text-sm text-muted-foreground line-through"
                        : "text-sm font-medium"
                    }
                  >
                    {item.label}
                  </span>
                  {!item.done && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Dica: ${item.label}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                        {item.hint}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {!item.done && (
                  <span className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                    {item.hint}
                  </span>
                )}
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Gem className="h-3 w-3 text-primary" />+{item.tokens}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-3 w-3 text-secondary" />+{item.xp} XP
                  </span>
                </span>
              </div>
            </div>
            {!item.done && (
              <Button size="sm" variant="ghost" onClick={item.action}>
                {item.actionLabel}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};