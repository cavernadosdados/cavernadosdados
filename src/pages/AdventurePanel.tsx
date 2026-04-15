import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SessionFeedbackDialog } from "@/components/SessionFeedbackDialog";
import {
  ArrowLeft,
  Save,
  Clock,
  Calendar,
  Globe,
  Swords,
  ShieldAlert,
  Scroll,
  UserX,
  Target,
  TrendingUp,
  Gavel,
  AlertTriangle,
  Ban,
  Flag,
} from "lucide-react";

const AdventurePanel = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userType = user?.user_metadata?.user_type;
  const isMaster = userType === "master";

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch table info
  const { data: table } = useQuery({
    queryKey: ["table", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*, profiles(display_name)")
        .eq("id", tableId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tableId,
  });

  // Fetch campaign details
  const { data: campaign, refetch: refetchCampaign } = useQuery({
    queryKey: ["campaign_details", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_details")
        .select("*")
        .eq("table_id", tableId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tableId,
  });

  // Form state
  const [form, setForm] = useState({
    campaign_objectives: "",
    progression_expectation: "",
    house_rules: "",
    combat_rules: "",
    pvp_rules: "",
    safety_lines: "",
    safety_veils: "",
    restricted_races: "",
    restricted_classes: "",
    restricted_spells: "",
    absence_policy: "",
    lateness_policy: "",
    frequency: "",
    schedule_time: "",
  });

  useEffect(() => {
    if (campaign) {
      setForm({
        campaign_objectives: campaign.campaign_objectives || "",
        progression_expectation: campaign.progression_expectation || "",
        house_rules: campaign.house_rules || "",
        combat_rules: campaign.combat_rules || "",
        pvp_rules: campaign.pvp_rules || "",
        safety_lines: campaign.safety_lines || "",
        safety_veils: campaign.safety_veils || "",
        restricted_races: campaign.restricted_races || "",
        restricted_classes: campaign.restricted_classes || "",
        restricted_spells: campaign.restricted_spells || "",
        absence_policy: campaign.absence_policy || "",
        lateness_policy: campaign.lateness_policy || "",
        frequency: campaign.frequency || "",
        schedule_time: campaign.schedule_time || "",
      });
    }
  }, [campaign]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!tableId || !user) return;
    setSaving(true);
    try {
      if (campaign) {
        const { error } = await supabase
          .from("campaign_details")
          .update({ ...form })
          .eq("table_id", tableId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaign_details")
          .insert({ table_id: tableId, ...form });
        if (error) throw error;
      }
      toast({ title: "Salvo!", description: "Detalhes da campanha atualizados." });
      refetchCampaign();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Fetch accepted players for feedback
  const { data: acceptedPlayers } = useQuery({
    queryKey: ["accepted_players", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_applications")
        .select("player_id, profiles(display_name)")
        .eq("table_id", tableId!)
        .eq("status", "accepted");
      if (error) throw error;
      return data;
    },
    enabled: !!tableId && isMaster,
  });

  const [feedbackTarget, setFeedbackTarget] = useState<string>("");

  const openFeedbackForPlayer = (playerId: string) => {
    setFeedbackTarget(playerId);
    setFeedbackOpen(true);
  };

  const openFeedbackForMaster = () => {
    if (table) {
      setFeedbackTarget(table.master_id);
      setFeedbackOpen(true);
    }
  };

  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/mesas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold glow-gold leading-tight">{table.title}</h1>
              <p className="text-xs text-muted-foreground">{table.system}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {form.frequency || "Sem frequência"}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {form.schedule_time || "Sem horário"}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Globe className="h-3 w-3" />
              GMT-3
            </Badge>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (isMaster && acceptedPlayers && acceptedPlayers.length > 0) {
                  openFeedbackForPlayer(acceptedPlayers[0].player_id);
                } else if (!isMaster) {
                  openFeedbackForMaster();
                } else {
                  toast({ title: "Sem jogadores", description: "Nenhum jogador aceito para avaliar." });
                }
              }}
            >
              <Flag className="h-4 w-4 mr-1" />
              Finalizar Sessão
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start mb-6 bg-card border border-border">
            <TabsTrigger value="overview" className="gap-1">
              <Target className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1">
              <Gavel className="h-4 w-4" />
              Regras & Limites
            </TabsTrigger>
            <TabsTrigger value="logistics" className="gap-1">
              <UserX className="h-4 w-4" />
              Logística
            </TabsTrigger>
          </TabsList>

          {/* ===== VISÃO GERAL ===== */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Objetivos da Campanha
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isMaster ? (
                    <Textarea
                      value={form.campaign_objectives}
                      onChange={(e) => handleChange("campaign_objectives", e.target.value)}
                      placeholder="Descreva os objetivos principais desta campanha..."
                      className="min-h-[160px] bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {form.campaign_objectives || "Nenhum objetivo definido ainda."}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Expectativa de Progressão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isMaster ? (
                    <Textarea
                      value={form.progression_expectation}
                      onChange={(e) => handleChange("progression_expectation", e.target.value)}
                      placeholder="Como os personagens vão progredir? Ritmo de XP, marcos..."
                      className="min-h-[160px] bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {form.progression_expectation || "Nenhuma expectativa definida ainda."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {isMaster && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ===== REGRAS & LIMITES ===== */}
          <TabsContent value="rules" className="space-y-6">
            {/* Regras da Casa */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  Regras da Casa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Modificações Gerais</Label>
                  {isMaster ? (
                    <Textarea
                      value={form.house_rules}
                      onChange={(e) => handleChange("house_rules", e.target.value)}
                      placeholder="Regras homebrew, ajustes de sistema..."
                      className="mt-1 bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {form.house_rules || "Nenhuma regra da casa definida."}
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Regras de Combate</Label>
                  {isMaster ? (
                    <Textarea
                      value={form.combat_rules}
                      onChange={(e) => handleChange("combat_rules", e.target.value)}
                      placeholder="Regras específicas de combate, iniciativa..."
                      className="mt-1 bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {form.combat_rules || "Nenhuma regra de combate definida."}
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Regras de PVP</Label>
                  {isMaster ? (
                    <Textarea
                      value={form.pvp_rules}
                      onChange={(e) => handleChange("pvp_rules", e.target.value)}
                      placeholder="PVP permitido? Em quais condições?"
                      className="mt-1 bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {form.pvp_rules || "Nenhuma regra de PVP definida."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Segurança na Mesa */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Segurança na Mesa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Linhas (Temas proibidos)</Label>
                  {isMaster ? (
                    <Textarea
                      value={form.safety_lines}
                      onChange={(e) => handleChange("safety_lines", e.target.value)}
                      placeholder="Temas que NUNCA aparecerão no jogo..."
                      className="mt-1 bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {form.safety_lines || "Nenhuma linha definida."}
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Véus / Gatilhos</Label>
                  {isMaster ? (
                    <Textarea
                      value={form.safety_veils}
                      onChange={(e) => handleChange("safety_veils", e.target.value)}
                      placeholder="Temas que podem ser mencionados mas não detalhados..."
                      className="mt-1 bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {form.safety_veils || "Nenhum véu/gatilho definido."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Restrições do Cenário */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-4 w-4 text-orange-500" />
                  Restrições do Cenário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Raças Proibidas</Label>
                  {isMaster ? (
                    <Textarea
                      value={form.restricted_races}
                      onChange={(e) => handleChange("restricted_races", e.target.value)}
                      placeholder="Raças não permitidas nesta campanha..."
                      className="mt-1 bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {form.restricted_races || "Nenhuma restrição de raça."}
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Classes Proibidas</Label>
                  {isMaster ? (
                    <Textarea
                      value={form.restricted_classes}
                      onChange={(e) => handleChange("restricted_classes", e.target.value)}
                      placeholder="Classes não permitidas nesta campanha..."
                      className="mt-1 bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {form.restricted_classes || "Nenhuma restrição de classe."}
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Magias Proibidas</Label>
                  {isMaster ? (
                    <Textarea
                      value={form.restricted_spells}
                      onChange={(e) => handleChange("restricted_spells", e.target.value)}
                      placeholder="Magias ou habilidades proibidas..."
                      className="mt-1 bg-background/50"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {form.restricted_spells || "Nenhuma restrição de magia."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {isMaster && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ===== LOGÍSTICA ===== */}
          <TabsContent value="logistics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Frequência e Horário
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Frequência</Label>
                    {isMaster ? (
                      <Input
                        value={form.frequency}
                        onChange={(e) => handleChange("frequency", e.target.value)}
                        placeholder="Ex: Semanal, Quinzenal..."
                        className="mt-1 bg-background/50"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{form.frequency || "Não definida"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Horário (GMT-3)</Label>
                    {isMaster ? (
                      <Input
                        value={form.schedule_time}
                        onChange={(e) => handleChange("schedule_time", e.target.value)}
                        placeholder="Ex: Sábados 19h-23h"
                        className="mt-1 bg-background/50"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{form.schedule_time || "Não definido"}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Faltas e Atrasos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Política de Faltas</Label>
                    {isMaster ? (
                      <Textarea
                        value={form.absence_policy}
                        onChange={(e) => handleChange("absence_policy", e.target.value)}
                        placeholder="O que acontece quando um jogador falta?"
                        className="mt-1 bg-background/50"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {form.absence_policy || "Não definida"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Política de Atrasos</Label>
                    {isMaster ? (
                      <Textarea
                        value={form.lateness_policy}
                        onChange={(e) => handleChange("lateness_policy", e.target.value)}
                        placeholder="Tolerância para atrasos, consequências..."
                        className="mt-1 bg-background/50"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {form.lateness_policy || "Não definida"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {isMaster && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Feedback Dialog */}
      <SessionFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        tableId={tableId!}
        reviewedId={feedbackTarget}
        reviewerRole={isMaster ? "master" : "player"}
        sessionNumber={1}
        onSubmitted={() => {
          // If master and has more players, cycle through them
          if (isMaster && acceptedPlayers) {
            const currentIdx = acceptedPlayers.findIndex((p) => p.player_id === feedbackTarget);
            if (currentIdx < acceptedPlayers.length - 1) {
              setTimeout(() => {
                openFeedbackForPlayer(acceptedPlayers[currentIdx + 1].player_id);
              }, 500);
            }
          }
        }}
      />
    </div>
  );
};

export default AdventurePanel;
