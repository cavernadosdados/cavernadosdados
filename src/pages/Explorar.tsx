import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import { useActiveTableBoosts } from "@/hooks/useTableBoosts";

const ANY = "__any__";

const Explorar = () => {
  const navigate = useNavigate();
  const { boostsMap } = useActiveTableBoosts();

  const [system, setSystem] = useState<string>(ANY);
  const [theme, setTheme] = useState<string>(ANY);
  const [duration, setDuration] = useState<string>(ANY);
  const [schedule, setSchedule] = useState<string>(ANY);
  const [price, setPrice] = useState<string>(ANY);

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
    // Plataforma de preço: hoje todas mesas são gratuitas
    if (price === "paid") return false;
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
  };

  const hasFilters =
    system !== ANY || theme !== ANY || duration !== ANY || schedule !== ANY || price !== ANY;

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
            <CardHeader>
              <CardTitle>Nenhuma mesa encontrada</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ajuste os filtros para descobrir novas aventuras.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sorted.map((table: any) => {
              const acceptedCount = acceptedCounts?.[table.id] ?? 0;
              const seatsLeft = Math.max(0, (table.max_players ?? 0) - acceptedCount);
              const isFull = seatsLeft === 0;
              const isAlmostFull = !isFull && seatsLeft <= 1 && table.max_players > 1;
              const ageMs = Date.now() - new Date(table.created_at).getTime();
              const isFresh = ageMs < 1000 * 60 * 60 * 48;
              const isBoosted = !!boostsMap[table.id];
              const cd = campaignDetails?.[table.id];

              return (
                <Card
                  key={table.id}
                  className={`bg-card border-border hover:border-primary transition-all ${
                    isBoosted ? "border-primary/60 shadow-[0_0_20px_-8px_hsl(var(--primary))]" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg">{table.title}</CardTitle>
                      <div className="flex flex-col items-end gap-1">
                        {isBoosted && (
                          <Badge className="gap-1 bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30">
                            <Flame className="h-3 w-3" /> Em destaque
                          </Badge>
                        )}
                        <Badge variant="default">Aberta</Badge>
                        {isAlmostFull && (
                          <Badge variant="destructive" className="gap-1 animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> Últimas vagas
                          </Badge>
                        )}
                        {!isAlmostFull && isFresh && !isBoosted && (
                          <Badge className="gap-1 bg-secondary text-secondary-foreground">
                            <Sparkles className="h-3 w-3" /> Nova
                          </Badge>
                        )}
                      </div>
                    </div>

                    {table.profiles && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/perfil/${table.profiles.id}`);
                        }}
                        className="group mt-2 flex w-full items-center gap-2 rounded-md border border-primary/20 bg-background/40 p-2 text-left transition-mystical hover:border-primary/50"
                      >
                        <Avatar className="h-8 w-8 border border-primary/40">
                          <AvatarImage src={table.profiles.avatar_url ?? undefined} alt={table.profiles.display_name} />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {(table.profiles.display_name || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mestre</div>
                          <div className="text-xs font-semibold truncate group-hover:text-primary">
                            {table.profiles.display_name}
                          </div>
                        </div>
                        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver perfil →
                        </span>
                      </button>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {table.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{table.description}</p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Gamepad2 className="h-3 w-3" /> {table.system}
                      </Badge>
                      <Badge variant="outline">{table.theme}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" /> {table.duration}
                      </Badge>
                      <Badge
                        variant={isFull ? "secondary" : isAlmostFull ? "destructive" : "outline"}
                        className="gap-1"
                      >
                        <Users className="h-3 w-3" />
                        {acceptedCount}/{table.max_players} vagas
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Monitor className="h-3 w-3" /> {table.platform}
                      </Badge>
                    </div>

                    {/* Urgência */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {!isFull && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Flame className="h-3 w-3" />
                          Faltam {seatsLeft} jogador{seatsLeft > 1 ? "es" : ""}
                        </span>
                      )}
                      {cd?.schedule_time && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {cd.frequency ? `${cd.frequency} · ` : ""}{cd.schedule_time}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        className="gap-1 w-full sm:w-auto min-h-10"
                        disabled={isFull}
                        onClick={() => navigate(`/dashboard/mesa/${table.id}`)}
                      >
                        <Send className="h-3 w-3" />
                        {isFull ? "Mesa cheia" : "Entrar na aventura"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 w-full sm:w-auto min-h-10"
                        onClick={() => navigate(`/dashboard/mesa/${table.id}`)}
                      >
                        <ScrollText className="h-3 w-3" /> Ver detalhes
                      </Button>
                    </div>
                  </CardContent>
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
