import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass, Users, Monitor, Gamepad2, Calendar, Clock, ScrollText, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AppRow = {
  id: string;
  status: string;
  created_at: string;
  table_id: string;
  tables: {
    id: string;
    title: string;
    system: string;
    theme: string;
    platform: string;
    duration: string;
    max_players: number;
    status: string;
    master_id: string;
    profiles: { id: string; display_name: string | null; avatar_url: string | null } | null;
  } | null;
};

const MinhasAventuras = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["my-adventures", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_applications")
        .select(
          "id, status, created_at, table_id, tables(id, title, system, theme, platform, duration, max_players, status, master_id, profiles(id, display_name, avatar_url))"
        )
        .eq("player_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AppRow[];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from("table_applications")
        .delete()
        .eq("id", applicationId)
        .eq("player_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-adventures", user?.id] });
      toast({
        title: "Candidatura retirada",
        description: "Você pode se candidatar novamente quando quiser.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao cancelar",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const tableIds = (applications ?? []).map((a) => a.table_id);

  const { data: nextSessions } = useQuery({
    queryKey: ["next-sessions", tableIds.join(",")],
    enabled: tableIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_logs")
        .select("table_id, session_date, title")
        .in("table_id", tableIds)
        .gte("session_date", new Date().toISOString().split("T")[0])
        .order("session_date", { ascending: true });
      if (error) throw error;
      const map: Record<string, { date: string; title: string }> = {};
      (data ?? []).forEach((s: any) => {
        if (!map[s.table_id]) map[s.table_id] = { date: s.session_date, title: s.title };
      });
      return map;
    },
  });

  const apps = applications ?? [];
  const inProgress = apps.filter((a) => a.status === "accepted" && a.tables?.status !== "closed");
  const pending = apps.filter((a) => a.status === "pending");
  const history = apps.filter(
    (a) =>
      a.status === "rejected" ||
      a.tables?.status === "closed" ||
      a.tables?.status === "finished"
  );

  const isEmpty = !isLoading && apps.length === 0;

  const renderCard = (app: AppRow, kind: "in_progress" | "pending" | "history") => {
    const t = app.tables;
    if (!t) return null;
    const masterName = t.profiles?.display_name || "Mestre";
    const initials = masterName.slice(0, 2).toUpperCase();
    const nextSession = nextSessions?.[t.id];

    return (
      <Card key={app.id} className="bg-card border-border hover:border-primary/50 transition-mystical">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight">{t.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={t.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <button
                  className="text-sm text-muted-foreground hover:text-primary transition-colors truncate"
                  onClick={() => t.profiles?.id && navigate(`/dashboard/perfil/${t.profiles.id}`)}
                >
                  {masterName}
                </button>
              </div>
            </div>
            {kind === "pending" && (
              <Badge variant="secondary" className="shrink-0">
                Aguardando resposta
              </Badge>
            )}
            {kind === "history" && app.status === "rejected" && (
              <Badge variant="destructive" className="shrink-0">
                Recusado
              </Badge>
            )}
            {kind === "history" && app.status !== "rejected" && (
              <Badge variant="outline" className="shrink-0">
                Finalizado
              </Badge>
            )}
            {kind === "in_progress" && (
              <Badge className="shrink-0 bg-primary/20 text-primary border-primary/30">
                Em andamento
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Gamepad2 className="h-3 w-3" /> {t.system}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Monitor className="h-3 w-3" /> {t.platform}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> {t.duration}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" /> {t.max_players}
            </Badge>
          </div>

          {kind === "in_progress" && nextSession && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Calendar className="h-4 w-4" />
              <span>
                Próxima sessão:{" "}
                {new Date(nextSession.date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </div>
          )}

          {kind === "pending" && (
            <p className="text-xs text-muted-foreground">
              Candidatura enviada em{" "}
              {new Date(app.created_at).toLocaleDateString("pt-BR")}
            </p>
          )}

          <div className="pt-2 space-y-2">
            {kind === "in_progress" ? (
              <Button className="w-full" onClick={() => navigate(`/dashboard/mesa/${t.id}`)}>
                Ver mesa
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/dashboard/mesa/${t.id}`)}
              >
                Ver detalhes
              </Button>
            )}
            {kind === "pending" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={cancelMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar candidatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar candidatura?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Sua candidatura para "{t.title}" será removida. Você poderá se candidatar
                      novamente mais tarde, se ainda houver vagas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelMutation.mutate(app.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, cancelar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    items: AppRow[],
    kind: "in_progress" | "pending" | "history",
    emptyMsg: string
  ) => (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
        <Badge variant="secondary" className="ml-1">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {emptyMsg}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => renderCard(a, kind))}
        </div>
      )}
    </section>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold glow-gold">Minhas Aventuras</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe suas mesas, candidaturas e histórico
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 flex flex-col items-center text-center gap-4">
              <ScrollText className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Nenhuma aventura por aqui ainda</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Você ainda não participa de nenhuma aventura.
                </p>
              </div>
              <Button onClick={() => navigate("/dashboard/explorar")} className="gap-2">
                <Compass className="h-4 w-4" />
                Explorar mesas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {renderSection(
              "Em andamento",
              <Gamepad2 className="h-5 w-5 text-primary" />,
              inProgress,
              "in_progress",
              "Você ainda não foi aceito em nenhuma mesa."
            )}
            {renderSection(
              "Pendentes",
              <Clock className="h-5 w-5 text-secondary" />,
              pending,
              "pending",
              "Nenhuma candidatura aguardando resposta."
            )}
            {renderSection(
              "Histórico",
              <ScrollText className="h-5 w-5 text-muted-foreground" />,
              history,
              "history",
              "Nenhuma mesa no histórico."
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MinhasAventuras;