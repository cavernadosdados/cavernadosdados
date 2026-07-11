import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Target,
  Layers,
  Globe2,
  Rocket,
  Cpu,
  Users,
  ScrollText,
} from "lucide-react";

const sections = [
  { id: "o-que-e", label: "O que é", icon: Sparkles },
  { id: "missao", label: "Missão", icon: Target },
  { id: "features", label: "Features", icon: Layers },
  { id: "universo", label: "Universo Glimer", icon: Globe2 },
  { id: "futuro", label: "Futuro", icon: Rocket },
  { id: "tecnologia", label: "Tecnologia", icon: Cpu },
];

const features = [
  { title: "Contas & Perfis", desc: "Jogadores e Mestres com perfis dedicados, experiência, ferramentas e sistemas favoritos." },
  { title: "Descoberta de Mesas", desc: "Explore mesas por sistema, horário, tom e vagas. Favorite as suas preferidas." },
  { title: "Gestão de Mesas", desc: "Mestres criam mesas, definem regras, agenda, capa e recebem candidaturas." },
  { title: "Candidaturas", desc: "Jogadores se candidatam, mestres avaliam e formam o grupo com clareza." },
  { title: "Sessões & Vivência", desc: "Painel da aventura, presença, diário de campanha e resumos épicos gerados por IA." },
  { title: "Worldbuilding com IA", desc: "Sugestões de lore, NPCs e ganchos para acelerar a preparação do mestre." },
  { title: "Progressão & Tokens", desc: "XP, níveis, conquistas e Tokens para impulsionar mesas e adquirir cosméticos." },
  { title: "Loja Glimer", desc: "Avatares colecionáveis (Nox, Trix, Kiki, Jipo, Jinx) e itens cosméticos." },
  { title: "Segurança & Moderação", desc: "RLS, papéis via user_roles, denúncias e painel administrativo." },
  { title: "Identidade Visual", desc: "Estética de caverna mística, dourado, cobre e pergaminho, com toque de fantasia." },
];

const glimers = [
  { name: "Nox", essence: "Sombra & mistério", archetype: "O guardião das noites" },
  { name: "Trix", essence: "Astúcia & travessura", archetype: "O trapaceiro brincalhão" },
  { name: "Kiki", essence: "Alegria & vínculo", archetype: "A faísca do grupo" },
  { name: "Jipo", essence: "Coragem & lealdade", archetype: "O escudo dos amigos" },
  { name: "Jinx", essence: "Sorte & caos", archetype: "O imprevisível" },
];

const roadmap = [
  { horizon: "Curto prazo", items: ["Novos Glimers e cosméticos", "Melhorias no painel do mestre", "Mais opções de filtros na busca"] },
  { horizon: "Médio prazo", items: ["Glimer RPG: sistema próprio de regras", "Marketplace de conteúdos autorais", "Eventos e temporadas"] },
  { horizon: "Longo prazo", items: ["Loja física com camisas e itens", "App nativo mobile", "Universo expandido dos Glimers"] },
];

export default function Guia() {
  const [active, setActive] = useState("o-que-e");

  useEffect(() => {
    document.title = "Guia da Plataforma — Glimer";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Guia completo da plataforma Glimer: o que é, missão, features, universo dos Glimers, futuro e tecnologia.");
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 max-w-screen-xl mx-auto px-4">
        {/* Hero */}
        <section className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary">
            <ScrollText className="h-3 w-3 mr-1" /> Documento oficial
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
            Guia da Plataforma Glimer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tudo sobre a Glimer: o que é, para que serve, features, universo, futuro e tecnologia — em um só lugar.
          </p>
        </section>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar nav */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left whitespace-nowrap transition-mystical ${
                      isActive
                        ? "bg-primary/15 text-primary border-l-2 border-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="space-y-16 min-w-0">
            <section id="o-que-e" className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" /> O que é
              </h2>
              <Card className="p-6 space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  A <span className="text-foreground font-medium">Glimer</span> é uma plataforma dedicada ao RPG de mesa que
                  conecta mestres e jogadores em um ambiente cuidado, seguro e cheio de personalidade.
                </p>
                <p>
                  Aqui, mestres podem organizar suas mesas, gerenciar sessões e receber candidaturas de jogadores. Jogadores
                  encontram aventuras que combinam com seu estilo, se conectam com comunidades e vivem histórias inesquecíveis.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary"><Users className="h-3 w-3 mr-1" /> Mestres</Badge>
                  <Badge variant="secondary"><Users className="h-3 w-3 mr-1" /> Jogadores</Badge>
                  <Badge variant="secondary"><Users className="h-3 w-3 mr-1" /> Comunidades</Badge>
                </div>
              </Card>
            </section>

            <section id="missao" className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" /> Missão
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { p: "Gestão", d: "Simplificar a rotina de mestres e grupos." },
                  { p: "Segurança", d: "Ambiente moderado, com regras claras." },
                  { p: "Diversão", d: "Ferramentas que somam à mesa, não que atrapalham." },
                  { p: "Valorização", d: "Reconhecer o trabalho autoral dos mestres." },
                  { p: "Comunidade", d: "Aproximar quem ama RPG de mesa." },
                ].map((x) => (
                  <Card key={x.p} className="p-4">
                    <div className="font-semibold text-primary mb-1">{x.p}</div>
                    <p className="text-sm text-muted-foreground">{x.d}</p>
                  </Card>
                ))}
              </div>
            </section>

            <section id="features" className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Layers className="h-6 w-6 text-primary" /> Features
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {features.map((f) => (
                  <Card key={f.title} className="p-4 hover:border-primary/40 transition-mystical">
                    <div className="font-semibold mb-1">{f.title}</div>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </Card>
                ))}
              </div>
            </section>

            <section id="universo" className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Globe2 className="h-6 w-6 text-primary" /> Universo dos Glimers
              </h2>
              <p className="text-muted-foreground mb-4">
                Os Glimers são criaturas místicas que acompanham cada aventureiro. Cada um carrega uma essência e um arquétipo
                próprios — e futuramente terão um sistema de RPG dedicado.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {glimers.map((g) => (
                  <Card key={g.name} className="p-4">
                    <div className="text-lg font-bold text-primary">{g.name}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{g.essence}</div>
                    <p className="text-sm">{g.archetype}</p>
                  </Card>
                ))}
              </div>
            </section>

            <section id="futuro" className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Rocket className="h-6 w-6 text-primary" /> Futuro
              </h2>
              <div className="space-y-3">
                {roadmap.map((r) => (
                  <Card key={r.horizon} className="p-4">
                    <div className="font-semibold text-primary mb-2">{r.horizon}</div>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {r.items.map((i) => <li key={i}>{i}</li>)}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>

            <section id="tecnologia" className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Cpu className="h-6 w-6 text-primary" /> Tecnologia
              </h2>
              <Card className="p-6 text-muted-foreground leading-relaxed">
                <p className="mb-3">
                  Construída com <span className="text-foreground">React</span>, <span className="text-foreground">TypeScript</span> e
                  <span className="text-foreground"> Tailwind</span> no frontend. No backend, usamos
                  <span className="text-foreground"> PostgreSQL</span> com Row-Level Security, autenticação, edge functions e
                  integração com IA para acelerar o worldbuilding.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["React", "TypeScript", "Tailwind", "PostgreSQL", "RLS", "Edge Functions", "IA"].map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </Card>
            </section>

            <section className="text-center py-8 border-t border-border/50">
              <p className="text-lg italic text-primary/90">
                "Toda grande aventura começa com uma faísca."
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}