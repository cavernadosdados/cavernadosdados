import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Compass, Dice1, MessageSquare, ScrollText, Sparkles, UserCircle } from "lucide-react";

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
  const isLast = current === steps.length - 1;
  const step = steps[current];
  const progress = ((current + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const handlePrev = () => setCurrent((c) => Math.max(0, c - 1));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onComplete()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">{step.icon}</div>
          <DialogTitle className="text-center text-2xl">{step.title}</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-center text-muted-foreground">
            Passo {current + 1} de {steps.length}
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

          <Button size="sm" onClick={handleNext}>
            {isLast ? "Começar!" : "Próximo"}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};