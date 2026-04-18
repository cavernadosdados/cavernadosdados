import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Clock, Monitor, Gamepad2, Send, Inbox, Pencil, Trash2, ScrollText, Flame, Sparkles, AlertTriangle } from "lucide-react";
import { CreateTableDialog } from "@/components/CreateTableDialog";
import { ApplyTableDialog } from "@/components/ApplyTableDialog";
import { TableApplicationsDialog } from "@/components/TableApplicationsDialog";
import { EditTableDialog } from "@/components/EditTableDialog";
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

const Mesas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userType = user?.user_metadata?.user_type;
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTable, setApplyTable] = useState<{ id: string; title: string } | null>(null);
  const [viewAppsTable, setViewAppsTable] = useState<{ id: string; title: string } | null>(null);
  const [editTable, setEditTable] = useState<any | null>(null);
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Aggregate counts of accepted applications per table (for FOMO badges)
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

  // Fetch player's existing applications to know which tables they already applied to
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
        ) : tables && tables.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tables.map((table: any) => {
              const appStatus = userType !== "master" ? getApplicationStatus(table.id) : null;
              return (
                <Card key={table.id} className="bg-card border-border hover:border-primary transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{table.title}</CardTitle>
                      <Badge variant={table.status === "open" ? "default" : "secondary"}>
                        {table.status === "open" ? "Aberta" : "Fechada"}
                      </Badge>
                    </div>
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
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" /> {table.max_players} jogadores
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Monitor className="h-3 w-3" /> {table.platform}
                      </Badge>
                    </div>

                    {/* Player: view details + apply / status */}
                    {userType !== "master" && (
                      <div className="pt-2 flex flex-col sm:flex-row gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 w-full sm:w-auto min-h-10"
                          onClick={() => navigate(`/dashboard/mesa/${table.id}`)}
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
                          ) : (
                            <Button
                              size="sm"
                              className="gap-1 w-full sm:w-auto min-h-10"
                              onClick={() => setApplyTable({ id: table.id, title: table.title })}
                            >
                              <Send className="h-3 w-3" /> Quero jogar essa mesa!
                            </Button>
                          ))}
                      </div>
                    )}

                    {/* Master: actions */}
                    {userType === "master" && (
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
                          variant="outline"
                          className="gap-1 min-h-10 w-full sm:w-auto"
                          onClick={() => setViewAppsTable({ id: table.id, title: table.title })}
                        >
                          <Inbox className="h-3 w-3" /> Candidaturas
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 min-h-10 w-full sm:w-auto"
                          onClick={() => setEditTable(table)}
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1 min-h-10 w-full sm:w-auto"
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
                  ? "Comece criando sua primeira mesa épica!"
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

      {viewAppsTable && (
        <TableApplicationsDialog
          open={!!viewAppsTable}
          onOpenChange={(o) => !o && setViewAppsTable(null)}
          tableId={viewAppsTable.id}
          tableTitle={viewAppsTable.title}
        />
      )}

      {editTable && (
        <EditTableDialog
          open={!!editTable}
          onOpenChange={(o) => !o && setEditTable(null)}
          table={editTable}
          onUpdated={refetch}
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
    </DashboardLayout>
  );
};

export default Mesas;
