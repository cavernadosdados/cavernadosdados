import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Clock,
  Monitor,
  Gamepad2,
  ScrollText,
  Send,
  Flame,
  Sparkles,
  AlertTriangle,
  Compass,
  Coins,
  Search,
  X,
} from "lucide-react";
import { CoverImage } from "@/components/CoverImage";
import { ReportTableButton } from "@/components/ReportTableButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useActiveTableBoosts } from "@/hooks/useTableBoosts";
import { useAuth } from "@/hooks/useAuth";
import { formatPriceBRL, isFreeTable } from "@/lib/price";

const ANY = "__any__";

const Explorar = () => {
  const navigate = useNavigate();
  const { boostsMap } = useActiveTableBoosts();
  const { user } = useAuth();

  const [system, setSystem] = useState<string>(ANY);
  const [theme, setTheme] = useState<string>(ANY);
  const [duration, setDuration] = useState<string>(ANY);
  const [schedule, setSchedule] = useState<string>(ANY);
  const [price, setPrice] = useState<string>(ANY);
  const [search, setSearch] = useState<string>("");

  const { data: tables, isLoading } = useQuery({
    queryKey: ["explorar-tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*, profiles(id, display_name, avatar_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tableIds = useMemo(() => (tables ?? []).map((t: any) => t.id), [tables]);

  const { data: acceptedCounts } = useQuery({
    queryKey: ["explorar-accepted", tableIds.join(",")],
    enabled: tableIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_applications")
        .select("table_id, status")
        .in("table_id", tableIds)
        .eq("status", "accepted");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((a: any) => {
        counts[a.table_id] = (counts[a.table_id] ?? 0) + 1;
      });
      return counts;
    },
  });

  const { data: campaignDetails } = useQuery({
    queryKey: ["explorar-campaign-details", tableIds.join(",")],
    enabled: tableIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_details")
        .select("table_id, schedule_time, frequency")
        .in("table_id", tableIds);
      if (error) throw error;
      const map: Record<string, { schedule_time: string | null; frequency: string | null }> = {};
      (data ?? []).forEach((d: any) => {
        map[d.table_id] = { schedule_time: d.schedule_time, frequency: d.frequency };
      });
      return map;
    },
  });

  // Build dropdown options from data
  const uniq = (arr: (string | null | undefined)[]) =>
    Array.from(new Set(arr.filter((v): v is string => !!v && v.trim().length > 0)));

  const systemOptions = uniq((tables ?? []).map((t: any) => t.system));
  const themeOptions = uniq((tables ?? []).map((t: any) => t.theme));
  const durationOptions = uniq((tables ?? []).map((t: any) => t.duration));
  const scheduleOptions = uniq(
    Object.values(campaignDetails ?? {}).map((c) => c.schedule_time)
  );

  // Filter
  const filtered = (tables ?? []).filter((t: any) => {
    if (system !== ANY && t.system !== system) return false;
    if (theme !== ANY && t.theme !== theme) return false;
    if (duration !== ANY && t.duration !== duration) return false;
    if (schedule !== ANY) {
      const cd = campaignDetails?.[t.id];
      if (!cd || cd.schedule_time !== schedule) return false;
    }
    if (price === "free" && !isFreeTable(t.price_cents)) return false;
    if (price === "paid" && isFreeTable(t.price_cents)) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [
        t.title ?? "",
        t.description ?? "",
        t.system ?? "",
        t.theme ?? "",
        t.profiles?.display_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Sort: boosted first, then newest
  const sorted = filtered.slice().sort((a: any, b: any) => {
    const aBoost = boostsMap[a.id];
    const bBoost = boostsMap[b.id];
    if (aBoost && !bBoost) return -1;
    if (!aBoost && bBoost) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const clearFilters = () => {
    setSystem(ANY);
    setTheme(ANY);
    setDuration(ANY);
    setSchedule(ANY);
    setPrice(ANY);
    setSearch("");
  };

  const hasFilters =
    system !== ANY || theme !== ANY || duration !== ANY || schedule !== ANY || price !== ANY || search.trim() !== "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold glow-gold flex items-center gap-2">
            <Compass className="h-7 w-7 text-primary" />
            Mesas Disponíveis
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Encontre e participe de aventuras
          </p>
        </div>

        {/* Filters bar */}
        <Card className="bg-card/60 border-border">
          <CardContent className="p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, descrição, sistema ou mestre…"
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select value={system} onValueChange={setSystem}>
                <SelectTrigger><SelectValue placeholder="Sistema" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos os sistemas</SelectItem>
                  {systemOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger><SelectValue placeholder="Estilo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos os estilos</SelectItem>
                  {themeOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue placeholder="Duração" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Qualquer duração</SelectItem>
                  {durationOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger><SelectValue placeholder="Horário" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Qualquer horário</SelectItem>
                  {scheduleOptions.length === 0 && (
                    <SelectItem value="__none__" disabled>Sem horários definidos</SelectItem>
                  )}
                  {scheduleOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={price} onValueChange={setPrice}>
                <SelectTrigger><SelectValue placeholder="Preço" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Qualquer preço</SelectItem>
                  <SelectItem value="free">Gratuita</SelectItem>
                  <SelectItem value="paid">Paga</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card className="bg-gradient-to-br from-card to-card/50">
            <div className="p-6">
              <h3 className="text-xl font-bold">Nenhuma mesa encontrada</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Ajuste os filtros para descobrir novas aventuras.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {sorted.map((table: any, index: number) => {
              const acceptedCount = acceptedCounts?.[table.id] ?? 0;
              const seatsLeft = Math.max(0, (table.max_players ?? 0) - acceptedCount);
              const isFull = seatsLeft === 0;
              const isAlmostFull = !isFull && seatsLeft <= 1 && table.max_players > 1;
              const ageMs = Date.now() - new Date(table.created_at).getTime();
              const isFresh = ageMs < 1000 * 60 * 60 * 48;
              const isBoosted = !!boostsMap[table.id];
              const cd = campaignDetails?.[table.id];
              // Os 2 primeiros cards carregam de imediato (above-the-fold);
              // os demais usam IntersectionObserver para economizar banda.
              const isEager = index < 2;

              return (
                <Card
                  key={table.id}
                  className={`group relative rounded-2xl border-border overflow-hidden transition-all duration-300 hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 min-h-[340px] sm:min-h-[360px] flex ${
                    isBoosted
                      ? "border-primary/60 shadow-[0_0_25px_-8px_hsl(var(--primary)/0.6)]"
                      : ""
                  }`}
                >
                  {/* Background image (ideal: 800x450px / 16:9). Lazy + cache via CoverImage. */}
                  <CoverImage
                    src={table.cover_url}
                    alt={`Capa de ${table.title}`}
                    eager={isEager}
                    className="absolute inset-0 h-full w-full brightness-[0.45] transition-all duration-500 group-hover:brightness-[0.6] group-hover:scale-105"
                  />

                  {/* Overlay gradiente: preto na base → transparente no topo (legibilidade) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20" />

                  {/* Badges no topo */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-20 max-w-[60%]">
                      {isBoosted && (
                        <Badge className="gap-1 bg-primary/90 text-primary-foreground border-0 text-xs shadow-lg backdrop-blur-sm">
                          <Flame className="h-3 w-3" /> Destaque
                        </Badge>
                      )}
                      {isAlmostFull && (
                        <Badge variant="destructive" className="gap-1 animate-pulse text-xs shadow-lg backdrop-blur-sm">
                          <AlertTriangle className="h-3 w-3" /> Últimas vagas
                        </Badge>
                      )}
                      {!isAlmostFull && isFresh && !isBoosted && (
                        <Badge className="gap-1 bg-secondary/90 text-secondary-foreground text-xs shadow-lg backdrop-blur-sm">
                          <Sparkles className="h-3 w-3" /> Nova
                        </Badge>
                      )}
                      {table.is_adult_only && (
                        <Badge className="gap-1 bg-destructive/90 text-destructive-foreground border-0 text-xs shadow-lg backdrop-blur-sm font-bold">
                          18+
                        </Badge>
                      )}
                    </div>

                  {/* Botão de denúncia (canto superior esquerdo) */}
                  {user?.id !== table.profiles?.id && (
                    <div className="absolute top-3 left-3 z-20">
                      <ReportTableButton tableId={table.id} tableTitle={table.title} />
                    </div>
                  )}

                  {/* Botão favoritar (canto inferior esquerdo, sobre overlay) */}
                  {user && (
                    <div className="absolute top-3 left-12 z-20">
                      <FavoriteButton tableId={table.id} />
                    </div>
                  )}

                  {/* Conteúdo: layout natural (flex-col), empurra o conteúdo para baixo */}
                  <div className="relative z-10 flex flex-col justify-end w-full p-4 sm:p-6 gap-3 sm:gap-4 text-white">
                      {/* Título + mestre */}
                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2">
                          {table.title}
                        </h3>
                        {table.profiles && (
                          <p className="text-sm text-white/80 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-primary">Mestre</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/perfil/${table.profiles.id}`);
                              }}
                              className="hover:text-primary transition-colors font-medium truncate max-w-full"
                            >
                              {table.profiles.display_name}
                            </button>
                          </p>
                        )}
                      </div>

                      {/* Tags compactas */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="gap-1 text-xs h-6 px-2 bg-black/40 border-white/20 text-white backdrop-blur-sm font-normal">
                          <Gamepad2 className="h-3 w-3" /> {table.system}
                        </Badge>
                        <Badge variant="outline" className="text-xs h-6 px-2 bg-black/40 border-white/20 text-white backdrop-blur-sm font-normal">
                          {table.theme}
                        </Badge>
                        <Badge variant="outline" className="gap-1 text-xs h-6 px-2 bg-black/40 border-white/20 text-white backdrop-blur-sm font-normal">
                          <Clock className="h-3 w-3" /> {table.duration}
                        </Badge>
                        <Badge variant="outline" className="gap-1 text-xs h-6 px-2 bg-black/40 border-white/20 text-white backdrop-blur-sm font-normal">
                          <Monitor className="h-3 w-3" /> {table.platform}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`gap-1 text-xs h-6 px-2 backdrop-blur-sm font-semibold ${
                            isFreeTable(table.price_cents)
                              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-100"
                              : "bg-primary/25 border-primary/50 text-white"
                          }`}
                        >
                          <Coins className="h-3 w-3" />
                          {formatPriceBRL(table.price_cents)}
                          {!isFreeTable(table.price_cents) && (
                            <span className="opacity-80 font-normal">/ jogador</span>
                          )}
                        </Badge>
                      </div>

                      {/* Vagas + urgência */}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-sm ${
                          isFull
                            ? "bg-white/10 text-white/80"
                            : isAlmostFull
                              ? "bg-destructive/30 text-white border border-destructive/50"
                              : "bg-primary/20 text-white border border-primary/40"
                        }`}>
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">{acceptedCount}/{table.max_players}</span>
                          <span className="text-xs opacity-80">vagas</span>
                        </div>

                        {!isFull && seatsLeft <= 2 && (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive-foreground bg-destructive/40 px-2 py-1 rounded-md backdrop-blur-sm">
                            <Flame className="h-3 w-3" />
                            Faltam {seatsLeft}
                          </span>
                        )}

                        {cd?.schedule_time && (
                          <span className="inline-flex items-center gap-1 text-xs text-white/80 break-words">
                            <Clock className="h-3 w-3" />
                            {cd.frequency ? `${cd.frequency} · ` : ""}{cd.schedule_time}
                          </span>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        {table.master_id !== user?.id && (
                          <Button
                            size="default"
                            className="gap-2 w-full sm:flex-1 h-10 font-semibold"
                            disabled={isFull}
                            onClick={() => navigate(`/dashboard/mesa/${table.id}`)}
                          >
                            <Send className="h-4 w-4" />
                            {isFull ? "Mesa cheia" : "Entrar na aventura"}
                          </Button>
                        )}
                        <Button
                          size="default"
                          variant="outline"
                          className="gap-2 w-full sm:w-auto h-10 bg-black/40 border-white/30 text-white hover:bg-black/60 hover:text-white backdrop-blur-sm"
                          onClick={() => navigate(`/dashboard/mesa/${table.id}/detalhes`)}
                        >
                          <ScrollText className="h-4 w-4" /> Ver detalhes
                        </Button>
                      </div>
                    </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Explorar;
