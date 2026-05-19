import { Card } from "@/components/ui/card";
import { Sparkles, Shield, Coins, Trophy, BookOpen, Zap } from "lucide-react";

export const HowItWorks = () => {
  const masterSteps = [
    {
      icon: Shield,
      title: "Crie Seu Perfil",
      description: "Mostre sua experiência, sistemas dominados e estilo de narração.",
    },
    {
      icon: BookOpen,
      title: "Monte Suas Mesas",
      description: "Crie one-shots gratuitas ou campanhas pagas com preços sugeridos.",
    },
    {
      icon: Zap,
      title: "Use Boosts",
      description: "Impulsione suas mesas com tokens para maior visibilidade.",
    },
    {
      icon: Coins,
      title: "Receba & Cresça",
      description: "Ganhe avaliações, badges e monetize sua paixão por narrar.",
    },
  ];

  const playerSteps = [
    {
      icon: Sparkles,
      title: "Explore Mesas",
      description: "Descubra aventuras épicas filtradas por sistema, tema e estilo.",
    },
    {
      icon: Trophy,
      title: "Escolha Seu Mestre",
      description: "Veja avaliações, experiência e ferramentas de cada narrador.",
    },
    {
      icon: BookOpen,
      title: "Inscreva-se",
      description: "Reserve sua vaga em one-shots gratuitas ou campanhas pagas.",
    },
    {
      icon: Shield,
      title: "Jogue & Avalie",
      description: "Participe de sessões incríveis e ajude a comunidade crescer.",
    },
  ];

  return (
    <section id="como-funciona" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Simples e Intuitivo</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">Como Funciona</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Seja você um mestre veterano ou um jogador iniciante, a Glimer 
            torna fácil encontrar sua próxima aventura.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* For Masters */}
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2 text-primary glow-gold">Para Mestres</h3>
              <p className="text-muted-foreground">Monetize sua paixão por narrar</p>
            </div>
            
            <div className="space-y-4">
              {masterSteps.map((step, index) => (
                <Card key={index} className="p-6 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-mystical hover:glow-copper group">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-mystical">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-primary/70">Passo {index + 1}</span>
                        <h4 className="text-lg font-semibold">{step.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* For Players */}
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2 text-secondary">Para Jogadores</h3>
              <p className="text-muted-foreground">Encontre sua próxima aventura</p>
            </div>
            
            <div className="space-y-4">
              {playerSteps.map((step, index) => (
                <Card key={index} className="p-6 bg-card/50 backdrop-blur-sm border-secondary/20 hover:border-secondary/50 transition-mystical hover:glow-copper group">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-secondary/10 border border-secondary/30 flex items-center justify-center group-hover:bg-secondary/20 transition-mystical">
                      <step.icon className="w-6 h-6 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-secondary/70">Passo {index + 1}</span>
                        <h4 className="text-lg font-semibold">{step.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
