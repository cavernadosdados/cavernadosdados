import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Compass, Dice1, Inbox, MessageSquare, ScrollText, Sparkles, UserCircle } from "lucide-react";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const masterSteps: OnboardingStep[] = [
  {
    icon: <Sparkles className="h-10 w-10 text-primary" />,
    title: "Bem-vindo, Mestre!",
    description:
      "A Caverna dos Dados é o seu portal pra reunir jogadores e conduzir aventuras inesquecíveis. Vamos te mostrar o essencial em alguns passos.",
  },
  {
    icon: <UserCircle className="h-10 w-10 text-primary" />,
    title: "1. Complete seu perfil",
    description:
      "Adicione seus sistemas favoritos, anos de experiência e ferramentas que usa. Quanto mais completo, mais jogadores se interessam pelas suas mesas.",
  },
  {
    icon: <Dice1 className="h-10 w-10 text-primary" />,
    title: "2. Crie sua primeira mesa",
    description:
      "Defina sistema, tema, plataforma e número de vagas. Sua primeira mesa ganha 24h de destaque grátis pra atrair jogadores!",
  },
  {
    icon: <Inbox className="h-10 w-10 text-primary" />,
    title: "3. Gerencie candidaturas",
    description:
      "Quando jogadores se candidatarem, você verá tudo na aba Gerenciar da mesa. Lá também controla sessões, regras e edita a campanha.",
  },
  {
    icon: <Sparkles className="h-10 w-10 text-secondary" />,
    title: "4. Use Tokens pra impulsionar",
    description:
      "Tokens destacam suas mesas no topo do Explorar e dão mais visibilidade. Você ganhou 3 tokens grátis ao se cadastrar!",
  },
];

const playerSteps: OnboardingStep[] = [
  {
    icon: <Sparkles className="h-10 w-10 text-primary" />,
    title: "Bem-vindo, Aventureiro!",
    description:
      "A Caverna dos Dados conecta você aos melhores mestres e mesas de RPG. Vamos te mostrar como começar sua próxima jornada.",
  },
  {
    icon: <UserCircle className="h-10 w-10 text-primary" />,
    title: "1. Monte seu perfil",
    description:
      "Conte seus sistemas favoritos, temas que curte e se prefere jogar online ou presencial. Mestres olham isso ao avaliar candidaturas.",
  },
  {
    icon: <Compass className="h-10 w-10 text-primary" />,
    title: "2. Explore mesas",
    description:
      "Filtre por sistema, tema, plataforma e preço pra encontrar a aventura ideal. Salve mesas e descubra novidades sempre que quiser.",
  },
  {
    icon: <ScrollText className="h-10 w-10 text-primary" />,
    title: "3. Candidate-se",
    description:
      "Encontrou uma mesa? Mande uma candidatura com uma mensagem caprichada. Você pode ter até 3 candidaturas pendentes ao mesmo tempo.",
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-secondary" />,
    title: "4. Aproveite a aventura",
    description:
      "Quando aceito, acesse o painel da mesa pra conversar com o grupo, ler relatórios das sessões e acompanhar a campanha em tempo real.",
  },
];

interface OnboardingModalProps {
  open: boolean;
  userType: "master" | "player";
  onComplete: () => void;
}

export const OnboardingModal = ({ open, userType, onComplete }: OnboardingModalProps) => {
  const steps = userType === "master" ? masterSteps : playerSteps;
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