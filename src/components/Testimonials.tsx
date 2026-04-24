import { Quote, ShieldCheck, Sparkles, ScrollText, Star } from "lucide-react";

const testimonials = [
  {
    name: "Marina A.",
    role: "Mestra de fantasia sombria",
    pillar: "Gestão",
    icon: ScrollText,
    quote:
      "Consigo centralizar agenda, candidaturas e regras da campanha sem perder o fio da história. A mesa ficou muito mais organizada.",
  },
  {
    name: "Caio R.",
    role: "Jogador de campanhas online",
    pillar: "Segurança",
    icon: ShieldCheck,
    quote:
      "Entrar em uma mesa com regras claras, privacidade e recursos de denúncia dá muito mais confiança para jogar com pessoas novas.",
  },
  {
    name: "Bianca S.",
    role: "Jogadora e narradora iniciante",
    pillar: "Diversão",
    icon: Sparkles,
    quote:
      "Os diários, conquistas e progresso deixam a campanha viva entre uma sessão e outra. Parece uma comunidade, não só uma lista de mesas.",
  },
];

export const Testimonials = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-cavern py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Star className="h-4 w-4 fill-current" />
            Avaliações da comunidade
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">Quem joga sente a diferença</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Mestres e jogadores usam a Caverna dos Dados para transformar mesas soltas em campanhas mais organizadas, seguras e memoráveis.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {testimonials.map((testimonial) => {
            const Icon = testimonial.icon;

            return (
              <article
                key={testimonial.name}
                className="group flex min-h-[280px] flex-col rounded-lg border border-border/70 bg-card/70 p-6 shadow-mystical transition-mystical hover:border-primary/60"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary group-hover:animate-glow-pulse">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-semibold text-primary">
                    {testimonial.pillar}
                  </span>
                </div>

                <Quote className="mt-6 h-8 w-8 text-primary/50" />
                <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">“{testimonial.quote}”</p>

                <div className="mt-6 border-t border-border/60 pt-5">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
