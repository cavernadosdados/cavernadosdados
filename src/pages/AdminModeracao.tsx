import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Shield, ExternalLink, CheckCircle2, XCircle, Loader2, Webhook, Save, FlaskConical,
  Users, LayoutDashboard, Activity, Search, ShieldAlert, ShieldCheck, Coins, Gamepad2, Flag, FileText, UserPlus, Ban
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlimerAvatar } from "@/components/GlimerAvatar";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const REASON_LABEL: Record<string, string> = {
  inappropriate: "Conteúdo impróprio",
  hate_speech: "Discurso de ódio",
  spam_scam: "Spam / Golpe",
  harassment: "Assédio",
  other: "Outros",
};

export default function AdminModeracao() {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "users" | "tables" | "activity" | "under_review" | "reports" | "integrations">("overview");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState<string>("all");

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["admin-metrics"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_metrics");
      if (error) throw error;
      return data as Record<string, number>;
    },
  });

  const { data: activity, isLoading: loadingActivity } = useQuery({
    queryKey: ["admin-activity"],
    enabled: !!isAdmin && (tab === "activity" || tab === "overview"),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_recent_activity", { _limit: 30 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: usersList, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users", userSearch],
    enabled: !!isAdmin && tab === "users",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { _search: userSearch, _limit: 100 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allTables, isLoading: loadingAllTables } = useQuery({
    queryKey: ["admin-all-tables", tableStatusFilter],
    enabled: !!isAdmin && tab === "tables",
    queryFn: async () => {
      let q = supabase
        .from("tables")
        .select("id, title, status, master_id, created_at, max_players, is_adult_only, profiles:master_id(display_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (tableStatusFilter !== "all") q = q.eq("status", tableStatusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_role", {
        _target_user_id: userId, _role: "admin", _grant: grant,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast({ title: vars.grant ? "Admin promovido" : "Admin removido" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const adminRemoveTable = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase.from("tables").delete().eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Mesa removida" });
      qc.invalidateQueries({ queryKey: ["admin-all-tables"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const adminDisableTable = useMutation({
    mutationFn: async ({ tableId, reason }: { tableId: string; reason: string }) => {
      const { error } = await supabase.rpc("admin_disable_table" as any, {
        _table_id: tableId,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Mesa desabilitada", description: "O mestre foi notificado e a mesa não aparecerá nas buscas." });
      qc.invalidateQueries({ queryKey: ["admin-all-tables"] });
      qc.invalidateQueries({ queryKey: ["admin-under-review"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const resolveReport = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: "resolved" | "dismissed" | "pending" }) => {
      const { error } = await supabase.rpc("admin_resolve_report" as any, {
        _report_id: reportId,
        _new_status: status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Denúncia atualizada" });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const { data: webhookStatus, refetch: refetchWebhook } = useQuery({
    queryKey: ["admin-webhook-status"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-update-webhook", {
        method: "GET",
      });
      if (error) throw error;
      return data as { configured: boolean; masked: string };
    },
  });

  const handleSaveWebhook = async (testOnly: boolean) => {
    if (!webhookUrl.trim()) {
      toast({ title: "URL vazia", description: "Cole o webhook do Discord antes de continuar.", variant: "destructive" });
      return;
    }
    if (testOnly) setTestingWebhook(true); else setSavingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-webhook", {
        body: { webhook_url: webhookUrl.trim(), test_only: testOnly },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
      toast({
        title: testOnly ? "Teste enviado!" : "Webhook atualizado",
        description: testOnly
          ? "Confira o canal do Discord para a mensagem de teste."
          : "O novo destino de notificações está ativo.",
      });
      if (!testOnly) {
        setWebhookUrl("");
        refetchWebhook();
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message ?? "Falha ao processar webhook", variant: "destructive" });
    } finally {
      setSavingWebhook(false);
      setTestingWebhook(false);
    }
  };

  const { data: underReview, isLoading: loadingTables } = useQuery({
    queryKey: ["admin-under-review"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("id, title, status, master_id, cover_url, created_at, profiles:master_id(display_name)")
        .eq("status", "under_review")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["admin-reports"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, table_id, reporter_id, reason, description, status, created_at, tables(title, status)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase
        .from("tables")
        .update({ status: "open", updated_at: new Date().toISOString() })
        .eq("id", tableId);
      if (error) throw error;
      // Marca denúncias como dismissed
      await supabase
        .from("reports")
        .update({ status: "dismissed", reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
        .eq("table_id", tableId)
        .eq("status", "pending");
    },
    onSuccess: () => {
      toast({ title: "Mesa restaurada", description: "Voltou a aparecer publicamente." });
      qc.invalidateQueries({ queryKey: ["admin-under-review"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const removeTable = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase.from("tables").delete().eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Mesa removida", description: "A aventura foi excluída permanentemente." });
      qc.invalidateQueries({ queryKey: ["admin-under-review"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-32" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="container max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Moderação</h1>
            <p className="text-sm text-muted-foreground">Revise mesas em análise e denúncias enviadas pela comunidade.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-1"><LayoutDashboard className="h-3.5 w-3.5" /> Painel</TabsTrigger>
            <TabsTrigger value="users" className="gap-1"><Users className="h-3.5 w-3.5" /> Usuários</TabsTrigger>
            <TabsTrigger value="tables" className="gap-1"><Gamepad2 className="h-3.5 w-3.5" /> Mesas</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1"><Activity className="h-3.5 w-3.5" /> Atividade</TabsTrigger>
            <TabsTrigger value="under_review">
              Em revisão {underReview?.length ? `(${underReview.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="reports">Denúncias</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>

          {/* PAINEL: métricas gerais */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {loadingMetrics ? (
              <Skeleton className="h-48" />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard icon={<Users className="h-4 w-4" />} label="Usuários" value={metrics?.users_total ?? 0} hint={`+${metrics?.users_new_7d ?? 0} em 7d`} />
                  <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="Criadores ativos" value={metrics?.users_active_creators ?? 0} hint="criaram ≥1 mesa" />
                  <MetricCard icon={<UserPlus className="h-4 w-4" />} label="Jogadores ativos" value={metrics?.users_active_players ?? 0} hint="≥1 candidatura" />
                  <MetricCard icon={<Gamepad2 className="h-4 w-4" />} label="Mesas" value={metrics?.tables_total ?? 0} hint={`+${metrics?.tables_new_7d ?? 0} em 7d`} />
                  <MetricCard icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} label="Mesas abertas" value={metrics?.tables_open ?? 0} />
                  <MetricCard icon={<ShieldAlert className="h-4 w-4 text-destructive" />} label="Em revisão" value={metrics?.tables_under_review ?? 0} />
                  <MetricCard icon={<FileText className="h-4 w-4" />} label="Sessões" value={metrics?.sessions_total ?? 0} hint={`+${metrics?.sessions_new_7d ?? 0} em 7d`} />
                  <MetricCard icon={<Flag className="h-4 w-4 text-destructive" />} label="Denúncias" value={metrics?.reports_total ?? 0} hint={`${metrics?.reports_pending ?? 0} pendentes`} />
                  <MetricCard icon={<UserPlus className="h-4 w-4" />} label="Candidaturas" value={metrics?.applications_total ?? 0} hint={`${metrics?.applications_pending ?? 0} pendentes`} />
                  <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Aceitas" value={metrics?.applications_accepted ?? 0} />
                  <MetricCard icon={<Coins className="h-4 w-4 text-primary" />} label="Tokens em circulação" value={metrics?.tokens_circulating ?? 0} />
                  <MetricCard icon={<Coins className="h-4 w-4" />} label="Tokens gastos (7d)" value={metrics?.tokens_spent_7d ?? 0} hint={`+${metrics?.tokens_granted_7d ?? 0} concedidos`} />
                </div>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Atividade recente</CardTitle></CardHeader>
                  <CardContent className="space-y-1 max-h-96 overflow-y-auto">
                    {loadingActivity ? <Skeleton className="h-24" /> : (activity ?? []).slice(0, 15).map((a: any, i: number) => (
                      <ActivityRow key={i} a={a} onClick={() => navigate(a.link)} />
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* USUÁRIOS */}
          <TabsContent value="users" className="mt-4 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {loadingUsers ? <Skeleton className="h-32" /> : usersList?.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum usuário encontrado.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {usersList?.map((u: any) => (
                  <Card key={u.id}>
                    <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                      <GlimerAvatar
                        userId={u.id}
                        fallbackText={u.display_name ?? "?"}
                        label={u.display_name ?? "Usuário"}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{u.display_name ?? "Sem nome"}</span>
                          {u.has_created_tables && <Badge variant="outline">Mestre</Badge>}
                          {u.has_player_activity && <Badge variant="outline">Jogador</Badge>}
                          {!u.has_created_tables && !u.has_player_activity && <Badge variant="outline" className="text-muted-foreground">Sem atividade</Badge>}
                          {u.is_admin && <Badge className="gap-1 bg-destructive/90"><Shield className="h-3 w-3" /> admin</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-3 flex-wrap mt-0.5">
                          <span>🪙 {u.tokens_balance}</span>
                          <span>⭐ {u.xp} XP</span>
                          <span>🎲 {u.tables_count} mesas</span>
                          <span>📩 {u.applications_count} candidaturas</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/perfil/${u.id}`)} className="gap-1">
                          <ExternalLink className="h-3 w-3" /> Perfil
                        </Button>
                        {u.id !== user.id && (
                          <Button
                            size="sm"
                            variant={u.is_admin ? "destructive" : "outline"}
                            onClick={() => toggleAdmin.mutate({ userId: u.id, grant: !u.is_admin })}
                            disabled={toggleAdmin.isPending}
                            className="gap-1"
                          >
                            <Shield className="h-3 w-3" /> {u.is_admin ? "Remover admin" : "Tornar admin"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MESAS */}
          <TabsContent value="tables" className="mt-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {["all", "open", "under_review", "closed"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={tableStatusFilter === s ? "default" : "outline"}
                  onClick={() => setTableStatusFilter(s)}
                >
                  {s === "all" ? "Todas" : s === "open" ? "Abertas" : s === "under_review" ? "Em revisão" : "Fechadas"}
                </Button>
              ))}
            </div>
            {loadingAllTables ? <Skeleton className="h-32" /> : allTables?.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhuma mesa.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {allTables?.map((t: any) => (
                  <Card key={t.id}>
                    <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{t.title}</span>
                          <Badge variant={t.status === "under_review" ? "destructive" : t.status === "open" ? "default" : "secondary"}>{t.status}</Badge>
                          {t.is_adult_only && <Badge className="bg-destructive/90 text-destructive-foreground">18+</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Mestre: {t.profiles?.display_name ?? "—"} • Máx {t.max_players} jogadores • {new Date(t.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/mesa/${t.id}/detalhes`)} className="gap-1">
                          <ExternalLink className="h-3 w-3" /> Ver
                        </Button>
                        {t.status !== "under_review" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const reason = prompt(`Desabilitar "${t.title}"\n\nMotivo (visível ao mestre, mín. 5 caracteres):`);
                              if (reason && reason.trim().length >= 5) {
                                adminDisableTable.mutate({ tableId: t.id, reason: reason.trim() });
                              } else if (reason !== null) {
                                toast({ title: "Motivo muito curto", description: "Descreva o motivo com pelo menos 5 caracteres.", variant: "destructive" });
                              }
                            }}
                            disabled={adminDisableTable.isPending}
                            className="gap-1"
                          >
                            <Ban className="h-3 w-3" /> Desabilitar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { if (confirm(`Remover "${t.title}"?`)) adminRemoveTable.mutate(t.id); }}
                          disabled={adminRemoveTable.isPending}
                          className="gap-1"
                        >
                          <XCircle className="h-3 w-3" /> Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ATIVIDADE */}
          <TabsContent value="activity" className="mt-4 space-y-2">
            {loadingActivity ? <Skeleton className="h-32" /> : (activity ?? []).length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Sem atividade recente.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-2 space-y-1">
                  {(activity ?? []).map((a: any, i: number) => (
                    <ActivityRow key={i} a={a} onClick={() => navigate(a.link)} />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="under_review" className="mt-4 space-y-3">
            {loadingTables ? (
              <Skeleton className="h-24" />
            ) : underReview?.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhuma mesa em revisão. ✨</CardContent></Card>
            ) : (
              underReview?.map((t: any) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span className="truncate">{t.title}</span>
                      <Badge variant="destructive">Em revisão</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Mestre: {t.profiles?.display_name ?? "—"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/mesa/${t.id}/detalhes`)} className="gap-1">
                        <ExternalLink className="h-3 w-3" /> Ver mesa
                      </Button>
                      <Button size="sm" onClick={() => approve.mutate(t.id)} disabled={approve.isPending} className="gap-1">
                        {approve.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Aprovar e restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Remover permanentemente a mesa "${t.title}"?`)) removeTable.mutate(t.id);
                        }}
                        disabled={removeTable.isPending}
                        className="gap-1"
                      >
                        <XCircle className="h-3 w-3" /> Remover mesa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-4 space-y-2">
            {loadingReports ? (
              <Skeleton className="h-24" />
            ) : reports?.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Sem denúncias.</CardContent></Card>
            ) : (
              reports?.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{REASON_LABEL[r.reason] ?? r.reason}</Badge>
                        <Badge variant={r.status === "pending" ? "default" : r.status === "resolved" ? "secondary" : "outline"}>
                          {r.status === "pending" ? "pendente" : r.status === "resolved" ? "resolvida" : r.status === "dismissed" ? "descartada" : r.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/mesa/${r.table_id}/detalhes`)} className="gap-1">
                        <ExternalLink className="h-3 w-3" /> {r.tables?.title ?? "mesa"}
                      </Button>
                    </div>
                    {r.description && (
                      <p className="text-sm text-muted-foreground italic">"{r.description}"</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {r.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => resolveReport.mutate({ reportId: r.id, status: "resolved" })}
                            disabled={resolveReport.isPending}
                            className="gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Marcar como resolvida
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveReport.mutate({ reportId: r.id, status: "dismissed" })}
                            disabled={resolveReport.isPending}
                            className="gap-1"
                          >
                            <XCircle className="h-3 w-3" /> Descartar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resolveReport.mutate({ reportId: r.id, status: "pending" })}
                          disabled={resolveReport.isPending}
                          className="gap-1"
                        >
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="integrations" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Webhook className="h-4 w-4 text-primary" />
                  Webhook do Discord (Moderação)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-medium mb-1">Status atual</p>
                  {webhookStatus?.configured ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Configurado
                      </Badge>
                      <code className="text-xs text-muted-foreground break-all">{webhookStatus.masked}</code>
                    </div>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> Não configurado
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Novo webhook do Discord</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole a URL completa do webhook. No Discord: Configurações do canal → Integrações → Webhooks → Copiar URL.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSaveWebhook(true)}
                    disabled={testingWebhook || savingWebhook}
                    className="gap-2"
                  >
                    {testingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                    Testar (sem salvar)
                  </Button>
                  <Button
                    onClick={() => handleSaveWebhook(false)}
                    disabled={savingWebhook || testingWebhook}
                    className="gap-2"
                  >
                    {savingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar e ativar
                  </Button>
                </div>

                <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground space-y-1">
                  <p>💡 <strong>Como funciona:</strong> ao salvar, validamos o formato, enviamos uma mensagem de teste e atualizamos o secret <code>MODERATION_DISCORD_WEBHOOK</code> automaticamente.</p>
                  <p>⚠️ Para ativar a atualização automática, é necessário configurar o secret <code>SUPABASE_MANAGEMENT_TOKEN</code> com um Personal Access Token. Sem ele, o teste funciona, mas a troca precisa ser feita manualmente.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
        <div className="text-2xl font-bold mt-1">{value.toLocaleString("pt-BR")}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

const KIND_LABEL: Record<string, { label: string; cls: string }> = {
  report: { label: "Denúncia", cls: "bg-destructive/15 text-destructive" },
  table: { label: "Mesa", cls: "bg-primary/15 text-primary" },
  application: { label: "Candidatura", cls: "bg-blue-500/15 text-blue-500" },
  session: { label: "Sessão", cls: "bg-green-500/15 text-green-500" },
  user: { label: "Usuário", cls: "bg-amber-500/15 text-amber-500" },
};

function ActivityRow({ a, onClick }: { a: any; onClick: () => void }) {
  const meta = KIND_LABEL[a.kind] ?? { label: a.kind, cls: "bg-muted" };
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
    >
      <Badge className={`${meta.cls} shrink-0`} variant="outline">{meta.label}</Badge>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{a.title}</div>
        <div className="text-xs text-muted-foreground truncate">{a.subtitle}</div>
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0">
        {new Date(a.occurred_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
      </span>
    </button>
  );
}