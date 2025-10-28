import { Button } from "@/components/ui/button";
import { Dices, Scroll, Users } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Mystical background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/50" />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-glow-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-secondary rounded-full animate-glow-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-primary rounded-full animate-glow-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/30 mb-4">
            <Dices className="w-4 h-4 text-primary animate-glow-pulse" />
            <span className="text-sm font-medium">Plataforma #1 para Mestres de RPG</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Onde <span className="text-primary glow-gold">Mestres</span> e{" "}
            <span className="text-secondary">Jogadores</span> se Encontram
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Entre na caverna e descubra aventuras épicas. Conecte-se com mestres experientes 
            ou comece sua jornada como narrador. Seus dados aguardam.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button variant="hero" size="lg" className="min-w-[200px]">
              <Scroll className="w-5 h-5" />
              Sou Jogador
            </Button>
            <Button variant="mystical" size="lg" className="min-w-[200px]">
              <Users className="w-5 h-5" />
              Sou Mestre
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" />
              <span>+500 Mesas Ativas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-secondary rounded-full animate-glow-pulse" />
              <span>+2,000 Jogadores</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" />
              <span>+150 Mestres Certificados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
