import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Compass, Dice1, MessageSquare, ScrollText, Sparkles, UserCircle, Dices, Users, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StartPath = "player" | "master" | "both";
export const START_PATH_KEY = "onboarding_start_path";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const unifiedSteps: OnboardingStep[] = [
  {
    icon: <Sparkles className="h-10 w-10 text-primary" />,
    title: "Bem-vindo à Caverna dos Dados!",
    description:
      "Aqui você pode ser mestre, jogador, ou os dois. Tudo no mesmo perfil, sem precisar escolher um caminho. Vamos te mostrar como começar.",
  },
  {
    icon: <UserCircle className="h-10 w-10 text-primary" />,
    title: "1. Monte seu perfil",
    description:
      "Conte seus sistemas favoritos, temas que curte, experiência e ferramentas que usa. Quanto mais completo, melhor combinam mestres e jogadores com você.",
  },
  {
    icon: <Compass className="h-10 w-10 text-primary" />,
    title: "2. Explore mesas",
    description:
      "Filtre por sistema, tema, plataforma e preço pra encontrar aventuras. Salve favoritas e candidate-se às que combinam com você.",
  },
  {
    icon: <Dice1 className="h-10 w-10 text-primary" />,
    title: "3. Crie sua mesa quando quiser",
    description:
      "Quer mestrar? É só ir em Minhas Mesas e abrir uma aventura. Defina sistema, vagas e plataforma — sua primeira mesa ganha destaque grátis.",
  },
  {
    icon: <ScrollText className="h-10 w-10 text-primary" />,
    title: "4. Acompanhe suas aventuras",
    description:
      "O Dashboard mostra suas mesas como mestre e como jogador no mesmo lugar: candidaturas, próximas sessões e mensagens do grupo.",
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-secondary" />,
    title: "5. Use Tokens pra se destacar",
    description:
      "Tokens impulsionam suas mesas no Explorar e dão prioridade nas candidaturas. Você ganhou tokens grátis ao se cadastrar!",
  },
];

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const steps = unifiedSteps;
  const [current, setCurrent] = useState(0);
  const [startPath, setStartPath] = useState<StartPath | null>(() => {
    try {
      return (localStorage.getItem(START_PATH_KEY) as StartPath | null) ?? null;
    } catch {
      return null;
    }
  });
  // Question step appears after the welcome (index 0), so total = steps.length + 1.
  const QUESTION_INDEX = 1;
  const totalSteps = steps.length + 1;
  const isQuestion = current === QUESTION_INDEX;
  // Map current -> step index in unifiedSteps (skip question slot).
  const stepIndex = current === 0 ? 0 : current - 1;
  const isLast = current === steps.length - 1;
  const step = steps[current];
  const stepForRender = isQuestion ? null : steps[stepIndex];
  const isLastReal = current === totalSteps - 1;
  const progress = ((current + 1) / totalSteps) * 100;

  const choosePath = (p: StartPath) => {
    setStartPath(p);
    try {
      localStorage.setItem(START_PATH_KEY, p);
      // Trigger storage listeners in same tab (checklist listens to it).
      window.dispatchEvent(new StorageEvent("storage", { key: START_PATH_KEY }));
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (isLastReal) {
      onComplete();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const handlePrev = () => setCurrent((c) => Math.max(0, c - 1));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onComplete()}>
      <DialogContent className="max-w-md">
        {isQuestion ? (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <Wand2 className="h-10 w-10 text-primary" />
              </div>
              <DialogTitle className="text-center text-2xl">
                Por onde você quer começar?
              </DialogTitle>
              <DialogDescription className="text-center text-base pt-2">
                Vamos priorizar as próximas etapas pra você. Você pode mudar quando quiser.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 pt-2">
              <PathOption
                icon={<Users className="h-5 w-5" />}
                title="Quero jogar"
                description="Explorar mesas e me candidatar a aventuras"
                selected={startPath === "player"}
                onClick={() => choosePath("player")}
              />
              <PathOption
                icon={<Dices className="h-5 w-5" />}
                title="Quero mestrar"
                description="Criar minha mesa e receber jogadores"
                selected={startPath === "master"}
                onClick={() => choosePath("master")}
              />
              <PathOption
                icon={<Sparkles className="h-5 w-5" />}
                title="Os dois"
                description="Quero conhecer todos os caminhos da plataforma"
                selected={startPath === "both"}
                onClick={() => choosePath("both")}
              />
            </div>
          </>
        ) : (
          <DialogHeader>
            <div className="flex justify-center mb-2">{stepForRender!.icon}</div>
            <DialogTitle className="text-center text-2xl">{stepForRender!.title}</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {stepForRender!.description}
            </DialogDescription>
          </DialogHeader>
        )}

        <div className="space-y-2 pt-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-center text-muted-foreground">
            Passo {current + 1} de {totalSteps}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={current === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          <button
            onClick={onComplete}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular tour
          </button>

          <Button size="sm" onClick={handleNext} disabled={isQuestion && !startPath}>
            {isLastReal ? "Começar!" : "Próximo"}
            {!isLastReal && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PathOption = ({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-start gap-3 text-left p-3 rounded-lg border transition-colors",
      selected
        ? "border-primary bg-primary/10"
        : "border-border hover:border-primary/50 hover:bg-muted/30"
    )}
  >
    <div className={cn("mt-0.5", selected ? "text-primary" : "text-muted-foreground")}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </button>
);