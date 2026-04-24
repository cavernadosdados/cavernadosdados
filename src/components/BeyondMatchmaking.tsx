import { ShieldCheck, Sparkles, ScrollText } from "lucide-react";

const pillars = [
  {
    icon: ScrollText,
    title: "Gestão",
    description: "Ferramentas para organizar mesas, regras, agendas, candidaturas e evolução da campanha.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança",
    description: "Recursos de confiança, privacidade, moderação e proteção para mestres e jogadores.",
  },
  {
    icon: Sparkles,
    title: "Diversão",
    description: "Progressão, conquistas, diários e experiências que mantêm a comunidade engajada.",
  },
];

export const BeyondMatchmaking = () => {
  return (
    <section className="relative overflow-hidden border-y border-border/50 bg-card/20 py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Mais que encontrar uma mesa</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Um centro de comando para campanhas de RPG: da primeira candidatura ao último relato épico.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <article
                key={pillar.title}
                className="group rounded-lg border border-border/70 bg-background/60 p-6 shadow-mystical transition-mystical hover:border-primary/60"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary group-hover:animate-glow-pulse">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};