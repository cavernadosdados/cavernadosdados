import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Clock,
  Monitor,
  Gamepad2,
  Coins,
  Calendar,
  LogIn,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CoverImage } from "@/components/CoverImage";
import { formatPriceBRL, isFreeTable } from "@/lib/price";
import logoDragon from "@/assets/logo-dragon.png";

const MesaPublica = () => {
  const { tableId } = useParams<{ tableId: string }>();

  const { data: table, isLoading } = useQuery({
    queryKey: ["public-table", tableId],
    enabled: !!tableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*, profiles:master_id(id, display_name, avatar_url)")
        .eq("id", tableId!)
        .neq("status", "under_review")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: campaign } = useQuery({
    queryKey: ["public-campaign", tableId],
    enabled: !!tableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_details")
        .select("schedule_time, frequency, next_session_date, timezone")
        .eq("table_id", tableId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: acceptedCount } = useQuery({
    queryKey: ["public-accepted-count", tableId],
    enabled: !!tableId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("table_applications")
        .select("id", { count: "exact", head: true })
        .eq("table_id", tableId!)
        .eq("status", "accepted");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // SEO: title, meta description, OpenGraph
  useEffect(() => {
    if (!table) return;
    const title = `${table.title} · Mesa de RPG · Caverna dos Dados`;
    document.title = title.slice(0, 60);

    const desc = (table.description ?? `Participe de "${table.title}", uma mesa de ${table.system}.`).slice(0, 158);

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [key, val] = selector.replace("meta[", "").replace("]", "").split("=");
        el.setAttribute(key, val.replace(/['"]/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:type"]', "content", "website");
    if (table.cover_url) setMeta('meta[property="og:image"]', "content", table.cover_url);
    setMeta('meta[property="og:url"]', "content", window.location.href);

    // canonical
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, [table]);

  const seatsLeft = table ? Math.max(0, (table.max_players ?? 0) - (acceptedCount ?? 0)) : 0;
  const isFull = !!table && seatsLeft === 0;

  const nextSessionLabel = campaign?.next_session_date
    ? new Date(campaign.next_session_date).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : null;

  const loginHref = `/auth?redirect=${encodeURIComponent(`/dashboard/mesa/${tableId}`)}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Public header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoDragon} alt="Caverna dos Dados" className="h-8" />
            <span className="font-bold text-sm sm:text-base hidden sm:inline">Caverna dos Dados</span>
          </Link>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to={loginHref}>
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-72 sm:h-96 w-full rounded-2xl" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !table ? (
          <Card className="bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-10 text-center space-y-3">
              <h1 className="text-2xl font-bold">Mesa não encontrada</h1>
              <p className="text-sm text-muted-foreground">
                Esta mesa pode ter sido encerrada ou está temporariamente indisponível.
              </p>
              <Button asChild className="gap-2 mt-2">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <article className="space-y-6">
            {/* Hero */}
            <Card className="relative overflow-hidden rounded-2xl border-border min-h-[280px] sm:min-h-[420px] flex">
              <CoverImage
                src={table.cover_url}
                alt={`Capa de ${table.title}`}
                eager
                className="absolute inset-0 h-full w-full brightness-[0.5]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10" />

              <div className="relative z-10 w-full p-6 sm:p-10 flex flex-col justify-end gap-4 text-white">
                <Badge className="self-start gap-1 bg-primary/90 text-primary-foreground border-0 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" /> Mesa aberta
                </Badge>
                <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {table.title}
                </h1>
                {table.profiles?.display_name && (
                  <p className="text-sm sm:text-base text-white/85">
                    Mestre: <span className="font-semibold">{table.profiles.display_name}</span>
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1 h-7 px-2.5 bg-black/40 border-white/20 text-white backdrop-blur-sm">
                    <Gamepad2 className="h-3.5 w-3.5" /> {table.system}
                  </Badge>
                  <Badge variant="outline" className="h-7 px-2.5 bg-black/40 border-white/20 text-white backdrop-blur-sm">
                    {table.theme}
                  </Badge>
                  <Badge variant="outline" className="gap-1 h-7 px-2.5 bg-black/40 border-white/20 text-white backdrop-blur-sm">
                    <Clock className="h-3.5 w-3.5" /> {table.duration}
                  </Badge>
                  <Badge variant="outline" className="gap-1 h-7 px-2.5 bg-black/40 border-white/20 text-white backdrop-blur-sm">
                    <Monitor className="h-3.5 w-3.5" /> {table.platform}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`gap-1 h-7 px-2.5 backdrop-blur-sm font-semibold ${
                      isFreeTable(table.price_cents)
                        ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-100"
                        : "bg-primary/30 border-primary/50 text-white"
                    }`}
                  >
                    <Coins className="h-3.5 w-3.5" />
                    {formatPriceBRL(table.price_cents)}
                    {!isFreeTable(table.price_cents) && (
                      <span className="opacity-80 font-normal">/ jogador</span>
                    )}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Resumo + CTA */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {table.description && (
                  <Card>
                    <CardContent className="p-5 sm:p-6 space-y-2">
                      <h2 className="text-lg font-bold">Sobre a aventura</h2>
                      <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                        {table.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <h2 className="text-lg font-bold">Detalhes</h2>
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <InfoRow icon={<Gamepad2 className="h-4 w-4" />} label="Sistema" value={table.system} />
                      <InfoRow icon={<Sparkles className="h-4 w-4" />} label="Tema" value={table.theme} />
                      <InfoRow icon={<Clock className="h-4 w-4" />} label="Duração" value={table.duration} />
                      <InfoRow icon={<Monitor className="h-4 w-4" />} label="Plataforma" value={table.platform} />
                      <InfoRow
                        icon={<Calendar className="h-4 w-4" />}
                        label="Frequência"
                        value={campaign?.frequency || "A combinar"}
                      />
                      <InfoRow
                        icon={<Clock className="h-4 w-4" />}
                        label="Horário"
                        value={campaign?.schedule_time || "A combinar"}
                      />
                      <InfoRow
                        icon={<Calendar className="h-4 w-4" />}
                        label="Próxima sessão"
                        value={nextSessionLabel || "A definir"}
                      />
                      <InfoRow
                        icon={<Coins className="h-4 w-4" />}
                        label="Investimento"
                        value={
                          isFreeTable(table.price_cents)
                            ? "Gratuita"
                            : `${formatPriceBRL(table.price_cents)} por jogador`
                        }
                      />
                    </dl>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar CTA */}
              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <Card className="border-primary/40 bg-gradient-to-br from-card to-card/40">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="h-4 w-4 text-primary" />
                      <span>
                        <strong className="text-foreground">{acceptedCount ?? 0}</strong>
                        <span className="text-muted-foreground"> de {table.max_players} vagas</span>
                      </span>
                    </div>
                    {isFull ? (
                      <Badge variant="outline" className="w-full justify-center py-1.5">
                        Mesa cheia
                      </Badge>
                    ) : (
                      <Badge className="w-full justify-center py-1.5 bg-primary/15 text-primary border border-primary/40 hover:bg-primary/15">
                        {seatsLeft} {seatsLeft === 1 ? "vaga aberta" : "vagas abertas"}
                      </Badge>
                    )}

                    <div className="space-y-2 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Para se candidatar, crie uma conta gratuita ou faça login.
                      </p>
                      <Button asChild size="lg" className="w-full gap-2 font-semibold" disabled={isFull}>
                        <Link to={loginHref}>
                          <LogIn className="h-4 w-4" />
                          Entrar para se candidatar
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="w-full gap-2">
                        <Link to="/">
                          Conhecer a plataforma
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </article>
        )}
      </main>

      <footer className="border-t border-border mt-10">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Caverna dos Dados — plataforma de RPG
        </div>
      </footer>
    </div>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 text-primary/80">{icon}</span>
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  </div>
);

export default MesaPublica;