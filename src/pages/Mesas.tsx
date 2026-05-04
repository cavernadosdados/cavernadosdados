import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useUserType } from "@/hooks/useUserType";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Clock,
  Monitor,
  Gamepad2,
  Send,
  Trash2,
  ScrollText,
  Flame,
  Sparkles,
  AlertTriangle,
  Rocket,
  Coins,
} from "lucide-react";
import { CreateTableDialog } from "@/components/CreateTableDialog";
import { ApplyTableDialog } from "@/components/ApplyTableDialog";
import { ReportTableButton } from "@/components/ReportTableButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActiveTableBoosts, useBoostTable } from "@/hooks/useTableBoosts";
import { useTokens } from "@/hooks/useTokens";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPriceBRL, isFreeTable } from "@/lib/price";

const Mesas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userType } = useUserType();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTable, setApplyTable] = useState<{ id: string; title: string } | null>(null);
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [boostConfirm, setBoostConfirm] = useState<{ id: string; title: string } | null>(null);

  const { boostsMap } = useActiveTableBoosts();
  const { balance } = useTokens();
  const boostMutation = useBoostTable();

  const {
    data: tables,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["tables", userType === "master" ? user?.id : "all"],
    queryFn: async () => {
      let query = supabase.from("tables").select("*, profiles(id, display_name, avatar_url)");
      if (userType === "master") {
        query = query.eq("master_id", user!.id);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Sort: boosted tables first (by expires_at desc), then by created_at desc
  const sortedTables = (tables ?? []).slice().sort((a: any, b: any) => {
    const aBoost = boostsMap[a.id];
    const bBoost = boostsMap[b.id];
    if (aBoost && !bBoost) return -1;
    if (!aBoost && bBoost) return 1;
    if (aBoost && bBoost) {
      return new Date(bBoost).getTime() - new Date(aBoost).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const { data: acceptedCounts } = useQuery({
    queryKey: ["accepted-counts", (tables ?? []).map((t: any) => t.id).join(",")],
    enabled: !!tables && tables.length > 0,
    queryFn: async () => {
      const ids = (tables ?? []).map((t: any) => t.id);
      const { data, error } = await supabase
        .from("table_applications")
        .select("table_id, status")
        .in("table_id", ids)
        .eq("status", "accepted");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((a) => {
        counts[a.table_id] = (counts[a.table_id] ?? 0) + 1;
      });
      return counts;
    },
  });

  const { data: myApplications } = useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_applications")
        .select("table_id, status")
        .eq("player_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user && userType !== "master",
  });

  const getApplicationStatus = (tableId: string) => {
    return myApplications?.find((a) => a.table_id === tableId);
  };

  const appStatusLabel: Record<string, string> = {
    pending: "Candidatura Enviada",
    accepted: "Aceito",
    rejected: "Recusado",
  };

  const handleDelete = async () => {
    if (!deleteTableId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("tables").delete().eq("id", deleteTableId);
      if (error) throw error;
      toast({ title: "Mesa excluída", description: "A mesa foi removida com sucesso." });
      refetch();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTableId(null);
    }
  };

  const handleConfirmBoost = () => {
    if (!boostConfirm) return;
    boostMutation.mutate(boostConfirm.id, {
      onSettled: () => setBoostConfirm(null),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold glow-gold">
              {userType === "master" ? "Minhas Mesas" : "Mesas Disponíveis"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              {userType === "master" ? "Gerencie suas campanhas e sessões" : "Encontre e participe de aventuras"}
            </p>
          </div>
          {userType === "master" && (
            <Button className="gap-2 w-full sm:w-auto min-h-11" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Criar Nova Mesa
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : sortedTables && sortedTables.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedTables.map((table: any) => {
              const appStatus = userType !== "master" ? getApplicationStatus(table.id) : null;
              const acceptedCount = acceptedCounts?.[table.id] ?? 0;
              const seatsLeft = Math.max(0, (table.max_players ?? 0) - acceptedCount);
              const isFull = seatsLeft === 0;
              const isAlmostFull = !isFull && seatsLeft <= 1 && table.max_players > 1;
              const ageMs = Date.now() - new Date(table.created_at).getTime();
              const isFresh = ageMs < 1000 * 60 * 60 * 48;
              const boostExpires = boostsMap[table.id];
              const isBoosted = !!boostExpires;
              const isOwner = userType === "master" && table.master_id === user?.id;

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
                        <Badge variant={table.status === "open" ? "default" : "secondary"}>
                          {table.status === "open" ? "Aberta" : "Fechada"}
                        </Badge>
                        {table.status === "open" && isAlmostFull && (
                          <Badge variant="destructive" className="gap-1 animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> Últimas vagas
                          </Badge>
                        )}
                        {table.status === "open" && !isAlmostFull && isFresh && !isBoosted && (
                          <Badge className="gap-1 bg-secondary text-secondary-foreground">
                            <Sparkles className="h-3 w-3" /> Nova
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isBoosted && (
                      <p className="text-[11px] text-primary/80 mt-1">
                        Destaque expira {formatDistanceToNow(new Date(boostExpires), { addSuffix: true, locale: ptBR })}
                      </p>
                    )}
                    {userType !== "master" && table.profiles && (
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
                        {isFull && " · cheia"}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Monitor className="h-3 w-3" /> {table.platform}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`gap-1 ${
                          isFreeTable(table.price_cents)
                            ? "border-emerald-500/40 text-emerald-400"
                            : "border-primary/50 text-primary"
                        }`}
                      >
                        <Coins className="h-3 w-3" />
                        {formatPriceBRL(table.price_cents)}
                        {!isFreeTable(table.price_cents) && (
                          <span className="opacity-70 font-normal">/ jogador</span>
                        )}
                      </Badge>
                      {acceptedCount > 0 && !isFull && (
                        <Badge variant="outline" className="gap-1 border-secondary/50 text-secondary">
                          <Flame className="h-3 w-3" /> {acceptedCount} confirmado{acceptedCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>

                    {/* Player actions */}
                    {userType !== "master" && (
                      <div className="pt-2 flex flex-col sm:flex-row gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 w-full sm:w-auto min-h-10"
                          onClick={() => navigate(`/dashboard/mesa/${table.id}/detalhes`)}
                        >
                          <ScrollText className="h-3 w-3" /> Ver Detalhes
                        </Button>
                        {table.status === "open" &&
                          (appStatus ? (
                            <Badge
                              variant={
                                appStatus.status === "accepted"
                                  ? "default"
                                  : appStatus.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="self-center"
                            >
                              {appStatusLabel[appStatus.status] || appStatus.status}
                            </Badge>
                          ) : isFull ? (
                            <Badge variant="secondary" className="self-center">Mesa cheia</Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="gap-1 w-full sm:w-auto min-h-10"
                              onClick={() => setApplyTable({ id: table.id, title: table.title })}
                            >
                              <Send className="h-3 w-3" /> Quero jogar essa mesa!
                            </Button>
                          ))}
                        {table.master_id !== user?.id && (
                          <ReportTableButton
                            tableId={table.id}
                            tableTitle={table.title}
                            variant="menu-item"
                            className="text-muted-foreground hover:text-destructive"
                          />
                        )}
                      </div>
                    )}

                    {/* Master actions */}
                    {isOwner && (
                      <div className="pt-2 grid grid-cols-2 sm:flex gap-2 sm:flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 min-h-10 w-full sm:w-auto"
                          onClick={() => navigate(`/dashboard/mesa/${table.id}`)}
                        >
                          <ScrollText className="h-3 w-3" /> Gerenciar
                        </Button>
                        <Button
                          size="sm"
                          variant={isBoosted ? "outline" : "default"}
                          className={`gap-1 min-h-10 w-full sm:w-auto ${
                            !isBoosted ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                          }`}
                          onClick={() => setBoostConfirm({ id: table.id, title: table.title })}
                          title={isBoosted ? "Renovar destaque por +24h" : "Destacar no topo por 24h"}
                        >
                          <Rocket className="h-3 w-3" />
                          {isBoosted ? "Renovar (+24h)" : "Destacar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1 min-h-10 w-full sm:w-auto col-span-2 sm:col-auto"
                          onClick={() => setDeleteTableId(table.id)}
                        >
                          <Trash2 className="h-3 w-3" /> Excluir
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <CardTitle>{userType === "master" ? "Nenhuma mesa criada ainda" : "Nenhuma mesa encontrada"}</CardTitle>
              <CardDescription>
                {userType === "master"
                  ? "Crie sua primeira mesa — ela ganha destaque grátis por 24h!"
                  : "Explore o catálogo e encontre sua aventura perfeita"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userType === "master" && <Button onClick={() => setCreateOpen(true)}>Criar Primeira Mesa</Button>}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateTableDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refetch} />

      {applyTable && (
        <ApplyTableDialog
          open={!!applyTable}
          onOpenChange={(o) => !o && setApplyTable(null)}
          tableId={applyTable.id}
          tableTitle={applyTable.title}
          onApplied={refetch}
        />
      )}

      <AlertDialog open={!!deleteTableId} onOpenChange={(o) => !o && setDeleteTableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é irreversível. Todas as candidaturas associadas também serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm boost dialog */}
      <AlertDialog open={!!boostConfirm} onOpenChange={(o) => !o && setBoostConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Destacar mesa por 24h?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong>{boostConfirm?.title}</strong> aparecerá no topo da listagem por 24 horas
                e receberá um badge "🔥 Em destaque".
              </span>
              <span className="block text-foreground">
                Custo: <strong>1 token</strong> · Seu saldo: <strong className="tabular-nums">{balance}</strong>
              </span>
              {balance < 1 && (
                <span className="block text-destructive text-xs">
                  Você não tem tokens suficientes.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBoost}
              disabled={boostMutation.isPending || balance < 1}
            >
              {boostMutation.isPending ? "Destacando..." : "Destacar (-1 token)"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Mesas;
