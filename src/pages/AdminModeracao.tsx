import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, ExternalLink, CheckCircle2, XCircle, Loader2, Webhook, Save, FlaskConical } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [tab, setTab] = useState<"under_review" | "reports" | "integrations">("under_review");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

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
          <TabsList>
            <TabsTrigger value="under_review">
              Em revisão {underReview?.length ? `(${underReview.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="reports">Todas denúncias</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>

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
                        <Badge variant={r.status === "pending" ? "default" : "secondary"}>{r.status}</Badge>
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