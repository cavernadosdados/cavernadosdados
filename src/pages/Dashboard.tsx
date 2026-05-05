import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useUserType } from "@/hooks/useUserType";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Compass,
  Dice1,
  Inbox,
  Plus,
  ScrollText,
  Sparkles,
  Users,
  Hourglass,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OnboardingModal } from "@/components/OnboardingModal";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useOnboarding } from "@/hooks/useOnboarding";
import { LevelProgress } from "@/components/LevelProgress";
import { useCheckAchievements } from "@/hooks/useAchievements";
import { useEffect } from "react";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasMasteredTables, hasPlayerActivity } = useUserType();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0];
  const { showOnboarding, completeOnboarding, restartOnboarding } = useOnboarding();
  const checkAchievements = useCheckAchievements();

  // Verifica conquistas pendentes ao abrir o Dashboard
  useEffect(() => {
    if (user) checkAchievements.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ============== MASTER DATA ============== */
  const { data: masterTables } = useQuery({
    queryKey: ["dashboard-master-tables", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("id, title, status")
        .eq("master_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingApplications } = useQuery({
    queryKey: ["dashboard-master-pending", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_applications")
        .select(
          "id, status, created_at, message, table_id, tables!inner(id, title, master_id), profiles:player_id(id, display_name, avatar_url)"
        )
        .eq("status", "pending")
        .eq("tables.master_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: masterUpcomingSessions } = useQuery({
    queryKey: ["dashboard-master-sessions", user?.id, masterTables?.length],
    enabled: !!user && (masterTables?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = (masterTables ?? []).map((t) => t.id);
      if (!ids.length) return [];
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("session_logs")
        .select("id, title, session_date, table_id, tables(title)")
        .in("table_id", ids)
        .gte("session_date", today)
        .order("session_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ============== PLAYER DATA ============== */
  const { data: playerApps } = useQuery({
    queryKey: ["dashboard-player-apps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_applications")
        .select(
          "id, status, created_at, table_id, tables(id, title, status, master_id, profiles:master_id(display_name, avatar_url))"
        )
        .eq("player_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeAdventures = (playerApps ?? []).filter(
    (a) => a.status === "accepted" && a.tables?.status !== "closed"
  );
  const pendingAdventures = (playerApps ?? []).filter((a) => a.status === "pending");

  const activeIds = activeAdventures.map((a) => a.table_id);
  const { data: playerNextSessions } = useQuery({
    queryKey: ["dashboard-player-sessions", user?.id, activeIds.join(",")],
    enabled: !!user && activeIds.length > 0,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("session_logs")
        .select("id, title, session_date, table_id, tables(title)")
        .in("table_id", activeIds)
        .gte("session_date", today)
        .order("session_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ============== RENDER ============== */
  const showMasterSection = hasMasteredTables || (masterTables?.length ?? 0) > 0;
  const showPlayerSection = hasPlayerActivity || (playerApps?.length ?? 0) > 0;
  const showBoth = showMasterSection && showPlayerSection;
  const showNeither = !showMasterSection && !showPlayerSection;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold glow-gold">
              Pronto pra próxima aventura, {displayName}!
            </h1>
            <p className="text-muted-foreground mt-2">
              {showBoth
                ? "Suas mesas, candidaturas e próximas sessões em um só lugar"
                : showMasterSection
                  ? "Conduza suas mesas e acompanhe novas candidaturas"
                  : "Acompanhe suas aventuras e descubra novas mesas"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => restartOnboarding()}
            className="shrink-0"
          >
            <HelpCircle className="h-4 w-4" />
            Refazer tour
          </Button>
        </div>

        <LevelProgress />

        <OnboardingChecklist />

        {(showMasterSection || showNeither) && (
          <MasterView
            tables={masterTables ?? []}
            pending={pendingApplications ?? []}
            sessions={masterUpcomingSessions ?? []}
            navigate={navigate}
          />
        )}

        {(showPlayerSection || showNeither) && (
          <PlayerView
            active={activeAdventures}
            pending={pendingAdventures}
            sessions={playerNextSessions ?? []}
            navigate={navigate}
          />
        )}
      </div>

      <OnboardingModal
        open={showOnboarding}
        onComplete={() => completeOnboarding()}
      />
    </DashboardLayout>
  );
};

/* ============== MASTER VIEW ============== */
const MasterView = ({
  tables,
  pending,
  sessions,
  navigate,
}: {
  tables: any[];
  pending: any[];
  sessions: any[];
  navigate: (to: string) => void;
}) => {
  const openTables = tables.filter((t) => t.status === "open").length;
  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Mesas ativas"
          value={tables.length}
          hint={`${openTables} com vagas abertas`}
          icon={<Dice1 className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Candidaturas pendentes"
          value={pending.length}
          hint="Aguardando sua resposta"
          icon={<Inbox className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Próximas sessões"
          value={sessions.length}
          hint="A conduzir"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card to-card/50 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Criar nova mesa
            </CardTitle>
            <CardDescription>Comece uma nova aventura épica</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/dashboard/mesas")}>
              Ir para Minhas Mesas
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-card/50 border-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Impulsionar visibilidade
            </CardTitle>
            <CardDescription>Use Tokens para destacar suas mesas</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/dashboard/tokens")}>
              Ver Tokens
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Candidaturas recebidas
          </CardTitle>
          <CardDescription>Últimas candidaturas pendentes nas suas mesas</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState text="Nenhuma candidatura pendente no momento." />
          ) : (
            <ul className="space-y-3">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-mystical cursor-pointer"
                  onClick={() => navigate(`/dashboard/mesa/${p.table_id}`)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {(p.profiles?.display_name ?? "??").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {p.profiles?.display_name ?? "Jogador"}{" "}
                      <span className="text-muted-foreground font-normal">candidatou-se a</span>{" "}
                      <span className="text-primary">{p.tables?.title}</span>
                    </p>
                    {p.message && (
                      <p className="text-sm text-muted-foreground truncate">{p.message}</p>
                    )}
                  </div>
                  <Badge variant="secondary">Pendente</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Upcoming sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Próximas sessões a conduzir
          </CardTitle>
          <CardDescription>Sessões agendadas nas suas mesas</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState text="Nenhuma sessão futura agendada." />
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-mystical cursor-pointer"
                  onClick={() => navigate(`/dashboard/mesa/${s.table_id}`)}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{s.tables?.title}</p>
                  </div>
                  <Badge>
                    {format(new Date(s.session_date), "dd MMM", { locale: ptBR })}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
};

/* ============== PLAYER VIEW ============== */
const PlayerView = ({
  active,
  pending,
  sessions,
  navigate,
}: {
  active: any[];
  pending: any[];
  sessions: any[];
  navigate: (to: string) => void;
}) => {
  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Aventuras ativas"
          value={active.length}
          hint="Mesas em andamento"
          icon={<ScrollText className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Candidaturas pendentes"
          value={pending.length}
          hint="Aguardando resposta do mestre"
          icon={<Hourglass className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Próximas sessões"
          value={sessions.length}
          hint="Já agendadas pra você"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card to-card/50 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5" /> Explorar mesas
            </CardTitle>
            <CardDescription>Encontre sua próxima aventura</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/dashboard/explorar")}>
              Explorar agora
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-card/50 border-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" /> Minhas aventuras
            </CardTitle>
            <CardDescription>Acompanhe suas mesas e candidaturas</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/dashboard/aventuras")}>
              Ver todas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active adventures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" /> Aventuras ativas
          </CardTitle>
          <CardDescription>Mesas que você está participando</CardDescription>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <EmptyState
              text="Você ainda não participa de nenhuma mesa."
              actionLabel="Explorar mesas"
              onAction={() => navigate("/dashboard/explorar")}
            />
          ) : (
            <ul className="space-y-3">
              {active.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-mystical cursor-pointer"
                  onClick={() => navigate(`/dashboard/mesa/${a.table_id}`)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={a.tables?.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {(a.tables?.profiles?.display_name ?? "??").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-primary">{a.tables?.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      Mestre: {a.tables?.profiles?.display_name ?? "—"}
                    </p>
                  </div>
                  <Badge variant="default">Em andamento</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pending applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hourglass className="h-5 w-5" /> Candidaturas pendentes
          </CardTitle>
          <CardDescription>Aguardando resposta do mestre</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState text="Nenhuma candidatura pendente." />
          ) : (
            <ul className="space-y-3">
              {pending.slice(0, 5).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-mystical cursor-pointer"
                  onClick={() => navigate(`/dashboard/aventuras`)}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate text-primary">{p.tables?.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      Enviada em {format(new Date(p.created_at), "dd MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="secondary">Aguardando</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
};

/* ============== HELPERS ============== */
const StatCard = ({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ReactNode;
}) => (
  <Card className="bg-card border-border hover:border-primary transition-mystical">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{label}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-primary">{value}</div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </CardContent>
  </Card>
);

const EmptyState = ({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="text-center py-6">
    <p className="text-sm text-muted-foreground">{text}</p>
    {actionLabel && onAction && (
      <Button className="mt-3" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default Dashboard;
