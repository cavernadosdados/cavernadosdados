import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass, Dice1, Inbox, Plus, Sparkles, Star, TrendingUp, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userType = user?.user_metadata?.user_type;
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0];

  // ===== MASTER: minhas mesas + candidaturas pendentes =====
  const { data: masterStats, isLoading: loadingMaster } = useQuery({
    queryKey: ["dashboard-master", user?.id],
    enabled: !!user && userType === "master",
    queryFn: async () => {
      const { data: tables } = await supabase
        .from("tables")
        .select("id, title, status, max_players, created_at")
        .eq("master_id", user!.id)
        .order("created_at", { ascending: false });

      const tableIds = (tables ?? []).map((t) => t.id);
      let pendingByTable: Record<string, number> = {};
      let acceptedByTable: Record<string, number> = {};
      let totalPending = 0;

      if (tableIds.length > 0) {
        const { data: apps } = await supabase
          .from("table_applications")
          .select("table_id, status")
          .in("table_id", tableIds);
        (apps ?? []).forEach((a) => {
          if (a.status === "pending") {
            pendingByTable[a.table_id] = (pendingByTable[a.table_id] ?? 0) + 1;
            totalPending += 1;
          } else if (a.status === "accepted") {
            acceptedByTable[a.table_id] = (acceptedByTable[a.table_id] ?? 0) + 1;
          }
        });
      }

      return { tables: tables ?? [], pendingByTable, acceptedByTable, totalPending };
    },
  });

  // ===== PLAYER: aventuras aceitas =====
  const { data: playerStats, isLoading: loadingPlayer } = useQuery({
    queryKey: ["dashboard-player", user?.id],
    enabled: !!user && userType !== "master",
    queryFn: async () => {
      const { data: apps } = await supabase
        .from("table_applications")
        .select("status, table_id, tables(id, title, status, max_players)")
        .eq("player_id", user!.id);

      const accepted = (apps ?? []).filter((a) => a.status === "accepted");
      const pending = (apps ?? []).filter((a) => a.status === "pending");
      return { accepted, pending };
    },
  });

  const isLoading = userType === "master" ? loadingMaster : loadingPlayer;
  const acceptedCount = playerStats?.accepted.length ?? 0;
  const pendingCount = playerStats?.pending.length ?? 0;
  const masterTablesCount = masterStats?.tables.length ?? 0;
  const masterAcceptedTotal = Object.values(masterStats?.acceptedByTable ?? {}).reduce((a, b) => a + b, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold glow-gold">Bem-vindo, {displayName}!</h1>
          <p className="text-muted-foreground mt-2">
            {userType === "master"
              ? "Gerencie suas mesas e aventuras épicas"
              : "Encontre sua próxima aventura na Caverna"}
          </p>
        </div>

        {/* ============ MASTER ============ */}
        {userType === "master" ? (
          <>
            {/* CTA principal: criar mesa OU revisar candidaturas */}
            {isLoading ? (
              <Skeleton className="h-40 rounded-lg" />
            ) : masterTablesCount === 0 ? (
              <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Crie sua primeira mesa épica
                  </CardTitle>
                  <CardDescription>
                    Em poucos minutos sua aventura aparece na praça. Custa 1 token (você ganha 3 ao se cadastrar).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="lg" className="gap-2" onClick={() => navigate("/dashboard/mesas")}>
                    <Plus className="h-4 w-4" /> Criar minha primeira mesa
                  </Button>
                </CardContent>
              </Card>
            ) : (masterStats?.totalPending ?? 0) > 0 ? (
              <Card className="bg-gradient-to-br from-secondary/10 via-card to-card border-secondary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-secondary" />
                    Você tem {masterStats!.totalPending} candidatura{masterStats!.totalPending > 1 ? "s" : ""} aguardando
                  </CardTitle>
                  <CardDescription>Não deixe seus jogadores esperando — aceite ou recuse agora.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate("/dashboard/mesas")}>Ver candidaturas</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-card to-card/50 border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Tudo em dia, mestre
                  </CardTitle>
                  <CardDescription>Quer aumentar seu alcance? Crie mais uma mesa ou registre uma sessão.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate("/dashboard/mesas")} className="gap-2">
                    <Plus className="h-4 w-4" /> Nova mesa
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard/mesas")}>
                    Ver minhas mesas
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick stats reais */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mesas ativas</CardTitle>
                  <Dice1 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{masterTablesCount}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jogadores aceitos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{masterAcceptedTotal}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Candidaturas pendentes</CardTitle>
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{masterStats?.totalPending ?? 0}</div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          /* ============ PLAYER ============ */
          <>
            {isLoading ? (
              <Skeleton className="h-44 rounded-lg" />
            ) : acceptedCount === 0 ? (
              /* Estado VAZIO — ação guiada (anti-dashboard morto) */
              <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Compass className="h-6 w-6 text-primary" />
                    🎯 Comece sua primeira aventura
                  </CardTitle>
                  <CardDescription>
                    Você ainda não participa de nenhuma mesa.
                    {pendingCount > 0 && (
                      <span className="block mt-1 text-foreground">
                        Você tem <strong>{pendingCount}</strong> candidatura{pendingCount > 1 ? "s" : ""} aguardando
                        resposta do mestre.
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" className="gap-2" onClick={() => navigate("/dashboard/mesas")}>
                    <Compass className="h-4 w-4" /> Explorar mesas agora
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate("/dashboard/mensagens")}>
                    <Sparkles className="h-4 w-4" /> Conversar na taverna
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-secondary/10 via-card to-card border-secondary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-secondary" />
                    Suas aventuras em andamento
                  </CardTitle>
                  <CardDescription>
                    Você está em {acceptedCount} mesa{acceptedCount > 1 ? "s" : ""}. Continue a jornada!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {playerStats!.accepted.slice(0, 3).map((a: any) => (
                    <button
                      key={a.table_id}
                      type="button"
                      onClick={() => navigate(`/dashboard/mesa/${a.table_id}`)}
                      className="w-full flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 hover:border-primary transition-mystical text-left"
                    >
                      <span className="font-medium truncate">{a.tables?.title ?? "Mesa"}</span>
                      <Badge variant="outline">Abrir →</Badge>
                    </button>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate("/dashboard/mesas")}>
                    Ver todas
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Stats player */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aventuras ativas</CardTitle>
                  <Dice1 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{acceptedCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Candidaturas pendentes</CardTitle>
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{pendingCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Explorar</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/dashboard/mesas")}>
                    Ver mesas abertas
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
