import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SessionFeedbackDialog } from "@/components/SessionFeedbackDialog";
import { CampaignDiary } from "@/components/CampaignDiary";
import { MesaChat } from "@/components/MesaChat";
import { ChipSelector } from "@/components/ChipSelector";
import { ClockTimePicker } from "@/components/ClockTimePicker";
import { WeekdaySelector, composeSchedule, parseSchedule } from "@/components/WeekdaySelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarkMesaChatRead } from "@/hooks/useUnreadMesaChat";
import { EditTableForm } from "@/components/EditTableForm";
import { TableApplicationsList } from "@/components/TableApplicationsList";
import { NextSessionCard } from "@/components/NextSessionCard";
import { CampaignDashboard } from "@/components/CampaignDashboard";
import { WorldbuildingTab } from "@/components/worldbuilding/WorldbuildingTab";

// Chip presets for quick-fill multi-select
const CHIPS = {
  campaign_objectives: ["Salvar o reino", "Vingança pessoal", "Exploração de ruínas", "Política e intriga", "Sobrevivência", "Ascensão ao poder", "Mistério/investigação"],
  progression_expectation: ["XP por sessão", "XP por marcos", "Subida lenta", "Subida rápida", "Nível máximo 10", "Nível máximo 20", "Sem level cap"],
  house_rules: ["Inspiração heroica", "Crítico = dano máximo + rolagem", "Ponto de heroísmo", "Flanqueamento", "Sem multiclasse", "HP máximo no nível 1"],
  combat_rules: ["Iniciativa em grupo", "Iniciativa lateral", "Ataques de oportunidade simplificados", "Morte instantânea em -CON", "Healing surges"],
  pvp_rules: ["PVP proibido", "PVP só com consenso", "PVP em arenas específicas", "PVP narrativo apenas"],
  safety_lines: ["Violência sexual", "Tortura gráfica", "Abuso infantil", "Automutilação", "Racismo explícito", "Violência contra animais"],
  safety_veils: ["Cenas românticas", "Violência gráfica", "Drogas/vícios", "Terror psicológico", "Doenças graves", "Morte de NPCs próximos"],
  restricted_races: ["Drow", "Tiefling", "Aasimar", "Goliath", "Kender", "Warforged", "Goblin", "Kobold"],
  restricted_classes: ["Bruxo", "Feiticeiro", "Monge", "Artífice", "Bárbaro Berserker", "Necromante"],
  restricted_spells: ["Ressurreição", "Desejo", "Bola de Fogo", "Conjurar Elemental", "Teleporte", "Meteoros"],
  frequency: ["Semanal", "Quinzenal", "Mensal", "Esporádico"],
  absence_policy: ["NPC controlado pelo mestre", "Personagem fica em background", "Sessão cancelada se >2 faltas", "Aviso com 24h de antecedência", "Tolerância máxima de 3 faltas"],
  lateness_policy: ["Tolerância de 15min", "Tolerância de 30min", "Sessão começa no horário", "Resumo rápido para atrasados", "Sem tolerância"],
};
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
  Star,
  Plug,
  HelpCircle,
  Send,
  Loader2,
  BookOpen,
  Users,
  Lock,
  Sparkles,
  Hourglass,
  Monitor,
  MessageSquare,
  Pencil,
  Inbox,
  Globe2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Converte ISO timestamp -> string YYYY-MM-DD compatível com <input type="date"> */
function toDateLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Combina YYYY-MM-DD + HH:mm -> ISO timestamp local. Se hora vazia, usa 20:00. */
function combineDateTime(date: string, time?: string | null): string {
  const safeTime = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "20:00";
  return new Date(`${date}T${safeTime}:00`).toISOString();
}

/** Retorna true se a data YYYY-MM-DD é estritamente anterior a hoje (no fuso local). */
function isPastDate(date: string): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${date}T00:00:00`);
  return d < today;
}

const AdventurePanel = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // NOTE: this panel is the OWNER/PARTICIPANT view of a table.
  // Edit/management controls below are gated by table OWNERSHIP, never by the
  // user_type role — otherwise other masters could see edit affordances on
  // tables they don't own. `isMaster` below is true ONLY for the table owner.

  // Marca o chat da mesa como lido para o usuário atual ao abrir o painel.
  const markChatRead = useMarkMesaChatRead();
  useEffect(() => {
    if (tableId && user) {
      markChatRead.mutate(tableId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, user?.id]);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [feedbackTarget, setFeedbackTarget] = useState<string>("");
  const [feedbackTargetName, setFeedbackTargetName] = useState<string>("");

  // Player overlay state (triggered by realtime)
  const [showPlayerOverlay, setShowPlayerOverlay] = useState(false);

  // Fetch table info
  const { data: table, refetch: refetchTable } = useQuery({
    queryKey: ["table", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*, profiles(id, display_name, avatar_url)")
        .eq("id", tableId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tableId,
  });

  // Ownership-based flag: true ONLY for the master who owns this table.
  // All edit/management UI is gated by this — never by user_metadata.user_type.
  const isMaster = !!user && !!table && table.master_id === user.id;

  // Fetch campaign details
  const { data: campaign, refetch: refetchCampaign } = useQuery({
    queryKey: ["campaign_details", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_details")
        .select(
          "id, table_id, campaign_objectives, progression_expectation, house_rules, combat_rules, pvp_rules, safety_lines, safety_veils, restricted_races, restricted_classes, restricted_spells, absence_policy, lateness_policy, frequency, schedule_time, timezone, next_session_date, created_at, updated_at"
        )
        .eq("table_id", tableId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tableId,
  });

  // Master-only: fetch Discord webhook URL via a SECURITY DEFINER RPC so it
  // is never exposed to other authenticated users (e.g. accepted players).
  const { data: discordWebhookUrl, refetch: refetchDiscordWebhook } = useQuery({
    queryKey: ["campaign_discord_webhook", tableId, user?.id],
    enabled: !!tableId && isMaster,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_campaign_discord_webhook",
        { _table_id: tableId! }
      );
      if (error) throw error;
      return (data as string | null) ?? "";
    },
  });

  // Fetch accepted players
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
    enabled: !!tableId,
  });

  // Fetch current player's application status (for access control)
  const { data: myApplication, isLoading: loadingApp } = useQuery({
    queryKey: ["my_application", tableId, user?.id],
    queryFn: async () => {
      if (!user || !tableId) return null;
      const { data, error } = await supabase
        .from("table_applications")
        .select("status")
        .eq("table_id", tableId)
        .eq("player_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tableId && !!user && !isMaster,
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
    discord_webhook_url: "",
    next_session_date: "", // datetime-local string ("" = não definida)
  });

  const [testingWebhook, setTestingWebhook] = useState(false);

  useEffect(() => {
    if (campaign) {
      const rawDate = (campaign as any).next_session_date;
      const dateStr = rawDate ? toDateLocal(rawDate) : "";
      // Limpa automaticamente datas que já passaram
      const cleanedDate = dateStr && isPastDate(dateStr) ? "" : dateStr;
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
        discord_webhook_url: discordWebhookUrl || "",
        next_session_date: cleanedDate,
      });

      // Se a data armazenada já passou, persiste a limpeza no banco (somente o mestre)
      if (rawDate && cleanedDate === "" && isMaster) {
        supabase
          .from("campaign_details")
          .update({ next_session_date: null })
          .eq("table_id", tableId!)
          .then(({ error }) => {
            if (!error) refetchCampaign();
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, isMaster, discordWebhookUrl]);

  // Realtime: listen for table status changes (players detect "evaluation")
  useEffect(() => {
    if (!tableId || isMaster) return;

    const channel = supabase
      .channel(`table-status-${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
          filter: `id=eq.${tableId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          if (newStatus === "evaluation") {
            setShowPlayerOverlay(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, isMaster]);

  // Check if table is already in evaluation on load (player)
  useEffect(() => {
    if (!isMaster && table?.status === "evaluation") {
      setShowPlayerOverlay(true);
    }
  }, [table, isMaster]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestWebhook = async () => {
    if (!form.discord_webhook_url) {
      toast({ title: "URL vazia", description: "Cole a URL do webhook do Discord primeiro.", variant: "destructive" });
      return;
    }
    setTestingWebhook(true);
    try {
      const res = await supabase.functions.invoke("discord-webhook", {
        body: { webhook_url: form.discord_webhook_url, type: "test" },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Sucesso! 🎲", description: "Mensagem enviada ao Discord." });
    } catch (err: any) {
      toast({ title: "Erro no webhook", description: err.message, variant: "destructive" });
    } finally {
      setTestingWebhook(false);
    }
  };

  const sendDiscordSessionEnd = async () => {
    const webhookUrl = form.discord_webhook_url || (campaign as any)?.discord_webhook_url;
    if (!webhookUrl) return;
    try {
      await supabase.functions.invoke("discord-webhook", {
        body: { webhook_url: webhookUrl, type: "session_end", table_title: table?.title, table_id: tableId },
      });
    } catch (err) {
      console.error("Discord webhook error:", err);
    }
  };

  const handleSave = async () => {
    if (!tableId || !user) return;
    setSaving(true);
    try {
      // Normaliza next_session_date: "" -> null; combina YYYY-MM-DD com schedule_time -> ISO
      const payload: Record<string, any> = { ...form };
      if (form.next_session_date && isPastDate(form.next_session_date)) {
        // Não permite agendar no passado: força limpeza
        payload.next_session_date = null;
      } else {
        payload.next_session_date = form.next_session_date
          ? combineDateTime(form.next_session_date, form.schedule_time)
          : null;
      }

      if (campaign) {
        const { error } = await supabase
          .from("campaign_details")
          .update(payload)
          .eq("table_id", tableId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaign_details")
          .insert({ table_id: tableId, ...payload });
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

  // Master: confirm end session
  const handleConfirmEndSession = async () => {
    if (!tableId) return;
    setConfirmEndOpen(false);

    // Update table status to 'evaluation'
    const { error } = await supabase
      .from("tables")
      .update({ status: "evaluation" })
      .eq("id", tableId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    refetchTable();

    // Send Discord notification
    await sendDiscordSessionEnd();

    // Start sequential player evaluation
    if (acceptedPlayers && acceptedPlayers.length > 0) {
      setCurrentPlayerIndex(0);
      const first = acceptedPlayers[0];
      setFeedbackTarget(first.player_id);
      setFeedbackTargetName((first.profiles as any)?.display_name || "Jogador");
      setFeedbackOpen(true);
    } else {
      toast({ title: "Sem jogadores", description: "Nenhum jogador aceito para avaliar." });
      // Revert status
      await supabase.from("tables").update({ status: "open" }).eq("id", tableId);
      refetchTable();
    }
  };

  // Master: cycle through players after each feedback
  const handleMasterFeedbackSubmitted = useCallback(() => {
    if (!acceptedPlayers) return;
    const nextIdx = currentPlayerIndex + 1;
    if (nextIdx < acceptedPlayers.length) {
      setCurrentPlayerIndex(nextIdx);
      const next = acceptedPlayers[nextIdx];
      setFeedbackTarget(next.player_id);
      setFeedbackTargetName((next.profiles as any)?.display_name || "Jogador");
      setTimeout(() => setFeedbackOpen(true), 400);
    } else {
      // All players evaluated, restore table status
      toast({ title: "Avaliações concluídas!", description: "Todas as avaliações foram enviadas." });
      if (tableId) {
        supabase.from("tables").update({ status: "open" }).eq("id", tableId).then(() => refetchTable());
      }
    }
  }, [acceptedPlayers, currentPlayerIndex, tableId]);

  // Player: submit feedback from overlay
  const handlePlayerOverlayFeedback = () => {
    if (table) {
      setFeedbackTarget(table.master_id);
      setFeedbackTargetName((table.profiles as any)?.display_name || "Mestre");
      setFeedbackOpen(true);
    }
  };

  const handlePlayerFeedbackDone = () => {
    setShowPlayerOverlay(false);
    toast({ title: "Obrigado!", description: "Sua avaliação foi enviada." });
  };

  if (!table || (!isMaster && loadingApp)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Access control: only the owner master and accepted players see the management
  // panel. Everyone else (including OTHER masters who don't own this table) is
  // redirected to the read-only public details page.
  const hasAccess = isMaster || myApplication?.status === "accepted";
  if (!hasAccess) {
    // Pending users still see the contextual "in review" notice; everyone else
    // is sent to the public details page.
    if (!myApplication || myApplication.status === "rejected") {
      return <Navigate to={`/dashboard/mesa/${tableId}/detalhes`} replace />;
    }
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-3 sm:px-6 h-16 max-w-screen-xl mx-auto w-full">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate("/dashboard/mesas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-base sm:text-lg font-bold glow-gold truncate">{table.title}</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-primary/20 bg-card/80">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-primary/10 border border-primary/30 shadow-[0_0_30px_hsl(var(--cavern-gold)/0.2)]">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold glow-gold">Acesso restrito</h2>
              <p className="text-sm text-muted-foreground">
                {myApplication?.status === "pending"
                  ? "Sua candidatura ainda está em análise pelo Mestre. Aguarde a aprovação para ver os detalhes desta mesa."
                  : myApplication?.status === "rejected"
                  ? "Sua candidatura para esta mesa não foi aceita."
                  : "Apenas jogadores aceitos podem ver os detalhes desta mesa. Candidate-se primeiro na lista de mesas."}
              </p>
              <Button className="w-full" onClick={() => navigate("/dashboard/mesas")}>
                Voltar para Mesas
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* ===== PLAYER OVERLAY ===== */}
      {showPlayerOverlay && !isMaster && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full mx-4 space-y-6 text-center">
            {/* Glow icon */}
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-[hsl(var(--cavern-gold))]/10 border border-[hsl(var(--cavern-gold))]/30 shadow-[0_0_40px_hsl(var(--cavern-gold)/0.2)]">
                <Star className="h-10 w-10 text-[hsl(var(--cavern-gold))] fill-[hsl(var(--cavern-gold))]" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold glow-gold">
                A aventura de hoje acabou!
              </h2>
              <p className="text-muted-foreground">
                O Mestre encerrou a sessão. Como foi sua experiência?
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="gap-2 w-full"
                onClick={handlePlayerOverlayFeedback}
              >
                <Star className="h-5 w-5" />
                Avaliar o Mestre
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowPlayerOverlay(false)}
              >
                Avaliar mais tarde
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-6 py-3 sm:py-0 sm:h-16 max-w-screen-xl mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => navigate("/dashboard/mesas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold glow-gold leading-tight truncate">{table.title}</h1>
              <p className="text-xs text-muted-foreground truncate">{table.system}</p>
            </div>
            {isMaster && (
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0 sm:hidden min-h-10"
                onClick={() => setConfirmEndOpen(true)}
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {form.frequency || "Sem frequência"}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {(() => {
                const { days, time } = parseSchedule(form.schedule_time);
                return composeSchedule(days, time) || "Sem horário";
              })()}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Globe className="h-3 w-3" />
              GMT-3
            </Badge>

            {isMaster && (
              <Button
                variant="destructive"
                size="sm"
                className="hidden sm:inline-flex min-h-10"
                onClick={() => setConfirmEndOpen(true)}
              >
                <Flag className="h-4 w-4 mr-1" />
                Finalizar Sessão
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-3 sm:p-6 max-w-screen-xl mx-auto w-full overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-3 sm:mx-0 mb-6">
            <TabsList className="w-max sm:w-full sm:justify-start bg-card border border-border mx-3 sm:mx-0">
              <TabsTrigger value="overview" className="gap-1 min-h-10">
                <Target className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="social" className="gap-1 min-h-10">
                <Gavel className="h-4 w-4" />
                Contrato Social
              </TabsTrigger>
              <TabsTrigger value="diary" className="gap-1 min-h-10">
                <BookOpen className="h-4 w-4" />
                Diário
              </TabsTrigger>
              <TabsTrigger value="worldbuilding" className="gap-1 min-h-10">
                <Globe2 className="h-4 w-4" />
                Mundo & Lore
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1 min-h-10">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              {isMaster && (
                <TabsTrigger value="applications" className="gap-1 min-h-10">
                  <Inbox className="h-4 w-4" />
                  Candidaturas
                </TabsTrigger>
              )}
              {isMaster && (
                <TabsTrigger value="integrations" className="gap-1 min-h-10">
                  <Plug className="h-4 w-4" />
                  Integrações
                </TabsTrigger>
              )}
              {isMaster && (
                <TabsTrigger value="edit" className="gap-1 min-h-10">
                  <Pencil className="h-4 w-4" />
                  Editar Mesa
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* ===== VISÃO GERAL ===== */}
          <TabsContent value="overview" className="space-y-6">
            {tableId && (
              <CampaignDashboard
                tableId={tableId}
                isMaster={isMaster}
                nextSessionDate={(campaign as any)?.next_session_date ?? null}
                scheduleTime={form.schedule_time}
                acceptedPlayers={acceptedPlayers as any}
                maxPlayers={table.max_players}
                onGoToTab={setActiveTab}
              />
            )}
            {/* Informações da Mesa (criadas no cadastro) */}
            <Card className="border-primary/20 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Informações da Mesa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Master info */}
                {table.profiles && (
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/perfil/${(table.profiles as any).id ?? table.master_id}`)}
                    className="group mb-4 flex w-full items-center gap-3 rounded-lg border border-primary/20 bg-background/40 p-3 text-left transition-mystical hover:border-primary/50 hover:bg-background/60"
                  >
                    <Avatar className="h-12 w-12 border-2 border-primary/40 group-hover:border-primary transition-mystical">
                      <AvatarImage src={(table.profiles as any).avatar_url ?? undefined} alt={(table.profiles as any).display_name ?? "Mestre"} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {((table.profiles as any).display_name ?? "M").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">Mestre</div>
                      <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-mystical">
                        {(table.profiles as any).display_name ?? "Mestre"}
                      </div>
                    </div>
                    <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-mystical">
                      Ver perfil →
                    </span>
                  </button>
                )}
                {table.description && (
                  <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{table.description}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Swords className="h-3.5 w-3.5" />
                      Sistema
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{table.system}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Tema
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{table.theme}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Hourglass className="h-3.5 w-3.5" />
                      Duração
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{table.duration}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Users className="h-3.5 w-3.5" />
                      Jogadores
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {acceptedPlayers?.length ?? 0} / {table.max_players}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Monitor className="h-3.5 w-3.5" />
                      Plataforma
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{table.platform}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    <ChipSelector
                      chips={CHIPS.campaign_objectives}
                      value={form.campaign_objectives}
                      onChange={(v) => handleChange("campaign_objectives", v)}
                      placeholder="Descreva os objetivos principais desta campanha..."
                      helperText="Clique nos tons de campanha para preencher rapidamente."
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
                    <ChipSelector
                      chips={CHIPS.progression_expectation}
                      value={form.progression_expectation}
                      onChange={(v) => handleChange("progression_expectation", v)}
                      placeholder="Como os personagens vão progredir? Ritmo de XP, marcos..."
                      helperText="Selecione o ritmo de progressão e marcos."
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
          {/* ===== CONTRATO SOCIAL (Regras & Limites + Logística) ===== */}
          <TabsContent value="social" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2 items-start">
            <div className="space-y-6">
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  Regras da Casa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isMaster ? (
                  <ChipSelector
                    label="Modificações Gerais"
                    chips={CHIPS.house_rules}
                    value={form.house_rules}
                    onChange={(v) => handleChange("house_rules", v)}
                    placeholder="Regras homebrew, ajustes de sistema..."
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Modificações Gerais</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.house_rules || "Nenhuma regra da casa definida."}</p>
                  </div>
                )}
                <Separator />
                {isMaster ? (
                  <ChipSelector
                    label="Regras de Combate"
                    chips={CHIPS.combat_rules}
                    value={form.combat_rules}
                    onChange={(v) => handleChange("combat_rules", v)}
                    placeholder="Regras específicas de combate, iniciativa..."
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Regras de Combate</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.combat_rules || "Nenhuma regra de combate definida."}</p>
                  </div>
                )}
                <Separator />
                {isMaster ? (
                  <ChipSelector
                    label="Regras de PVP"
                    chips={CHIPS.pvp_rules}
                    value={form.pvp_rules}
                    onChange={(v) => handleChange("pvp_rules", v)}
                    placeholder="PVP permitido? Em quais condições?"
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Regras de PVP</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.pvp_rules || "Nenhuma regra de PVP definida."}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Segurança na Mesa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isMaster ? (
                  <ChipSelector
                    label="Linhas (Temas proibidos)"
                    helperText="Temas que NUNCA aparecerão no jogo. Selecione os que se aplicam."
                    chips={CHIPS.safety_lines}
                    value={form.safety_lines}
                    onChange={(v) => handleChange("safety_lines", v)}
                    placeholder="Adicione outros temas se necessário..."
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Linhas (Temas proibidos)</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.safety_lines || "Nenhuma linha definida."}</p>
                  </div>
                )}
                <Separator />
                {isMaster ? (
                  <ChipSelector
                    label="Véus / Gatilhos"
                    helperText="Temas que podem ser mencionados mas não detalhados."
                    chips={CHIPS.safety_veils}
                    value={form.safety_veils}
                    onChange={(v) => handleChange("safety_veils", v)}
                    placeholder="Adicione outros gatilhos se necessário..."
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Véus / Gatilhos</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.safety_veils || "Nenhum véu/gatilho definido."}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-4 w-4 text-destructive" />
                  Restrições do Cenário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isMaster ? (
                  <ChipSelector
                    label="Raças Proibidas"
                    chips={CHIPS.restricted_races}
                    value={form.restricted_races}
                    onChange={(v) => handleChange("restricted_races", v)}
                    placeholder="Adicione outras raças se necessário..."
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Raças Proibidas</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.restricted_races || "Nenhuma restrição de raça."}</p>
                  </div>
                )}
                <Separator />
                {isMaster ? (
                  <ChipSelector
                    label="Classes Proibidas"
                    chips={CHIPS.restricted_classes}
                    value={form.restricted_classes}
                    onChange={(v) => handleChange("restricted_classes", v)}
                    placeholder="Adicione outras classes se necessário..."
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Classes Proibidas</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.restricted_classes || "Nenhuma restrição de classe."}</p>
                  </div>
                )}
                <Separator />
                {isMaster ? (
                  <ChipSelector
                    label="Magias Proibidas"
                    chips={CHIPS.restricted_spells}
                    value={form.restricted_spells}
                    onChange={(v) => handleChange("restricted_spells", v)}
                    placeholder="Adicione outras magias se necessário..."
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Magias Proibidas</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.restricted_spells || "Nenhuma restrição de magia."}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            </div>
            <div className="space-y-6">
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Frequência e Horário
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Frequência</Label>
                    {isMaster ? (
                      <Select value={form.frequency} onValueChange={(v) => handleChange("frequency", v)}>
                        <SelectTrigger className="mt-1 bg-background/50">
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border z-50">
                          {CHIPS.frequency.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{form.frequency || "Não definida"}</p>
                    )}
                  </div>
                  {(() => {
                    const { days, time } = parseSchedule(form.schedule_time);
                    const fullLabel = composeSchedule(days, time);
                    return (
                      <>
                        {isMaster ? (
                          <>
                            <WeekdaySelector
                              value={days}
                              onChange={(newDays) => handleChange("schedule_time", composeSchedule(newDays, time))}
                            />
                            <div>
                              <Label className="text-sm font-medium">Horário (GMT-3)</Label>
                              <div className="mt-1.5">
                                <ClockTimePicker
                                  value={time}
                                  onChange={(newTime) => handleChange("schedule_time", composeSchedule(days, newTime))}
                                  placeholder="Selecionar horário"
                                />
                              </div>
                            </div>
                            {fullLabel && (
                              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                                <span className="text-muted-foreground">Resumo: </span>
                                <span className="text-primary font-semibold">{fullLabel} (GMT-3)</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            <Label className="text-sm font-medium">Horário (GMT-3)</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {fullLabel ? `${fullLabel} (GMT-3)` : "Não definido"}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {tableId && (
                    <NextSessionCard
                      tableId={tableId}
                      isMaster={isMaster}
                      nextSessionDate={(campaign as any)?.next_session_date ?? null}
                      editorValue={form.next_session_date}
                      onEditorChange={(v) => handleChange("next_session_date", v)}
                      scheduleTime={form.schedule_time}
                      acceptedPlayers={acceptedPlayers as any}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Faltas e Atrasos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isMaster ? (
                    <ChipSelector
                      label="Política de Faltas"
                      chips={CHIPS.absence_policy}
                      value={form.absence_policy}
                      onChange={(v) => handleChange("absence_policy", v)}
                      placeholder="O que acontece quando um jogador falta?"
                    />
                  ) : (
                    <div>
                      <Label className="text-sm font-medium">Política de Faltas</Label>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.absence_policy || "Não definida"}</p>
                    </div>
                  )}
                  {isMaster ? (
                    <ChipSelector
                      label="Política de Atrasos"
                      chips={CHIPS.lateness_policy}
                      value={form.lateness_policy}
                      onChange={(v) => handleChange("lateness_policy", v)}
                      placeholder="Tolerância para atrasos, consequências..."
                    />
                  ) : (
                    <div>
                      <Label className="text-sm font-medium">Política de Atrasos</Label>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{form.lateness_policy || "Não definida"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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

          {/* ===== DIÁRIO DA CAMPANHA ===== */}
          <TabsContent value="diary" className="space-y-6">
            <CampaignDiary
              tableId={tableId!}
              tableTitle={table.title}
              tableSystem={table.system}
              isMaster={isMaster}
              webhookUrl={form.discord_webhook_url}
            />
          </TabsContent>

          {/* ===== WORLDBUILDING & LORE ===== */}
          <TabsContent value="worldbuilding" className="space-y-6">
            <WorldbuildingTab tableId={tableId!} isMaster={isMaster} />
          </TabsContent>

          {/* ===== CHAT DA MESA ===== */}
          <TabsContent value="chat" className="space-y-6">
            <MesaChat tableId={tableId!} tableTitle={table.title} />
          </TabsContent>

          {isMaster && (
            <TabsContent value="integrations" className="space-y-6">
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plug className="h-4 w-4 text-primary" />
                    Webhook do Discord
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs text-sm">
                        <p className="font-medium mb-1">Como obter a URL do Webhook:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Abra as Configurações do canal no Discord</li>
                          <li>Vá em <strong>Integrações → Webhooks</strong></li>
                          <li>Clique em <strong>Novo Webhook</strong></li>
                          <li>Copie a <strong>URL do Webhook</strong></li>
                        </ol>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">URL do Webhook</Label>
                    <Input
                      value={form.discord_webhook_url}
                      onChange={(e) => handleChange("discord_webhook_url", e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="mt-1 bg-background/50 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ao finalizar uma sessão, uma mensagem será enviada automaticamente ao canal configurado.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook || !form.discord_webhook_url}
                      className="gap-2"
                    >
                      {testingWebhook ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Testar Conexão
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </TabsContent>
          )}

          {/* ===== EDITAR MESA ===== */}
          {isMaster && (
            <TabsContent value="edit" className="space-y-6">
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-primary" />
                    Informações da Mesa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EditTableForm
                    table={{
                      id: table.id,
                      title: table.title,
                      description: table.description,
                      system: table.system,
                      theme: table.theme,
                      duration: table.duration,
                      max_players: table.max_players,
                      platform: table.platform,
                      status: table.status,
                      price_cents: table.price_cents,
                      cover_url: table.cover_url,
                    }}
                    onSaved={() => {
                      refetchTable();
                      queryClient.invalidateQueries({ queryKey: ["tables"] });
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ===== CANDIDATURAS ===== */}
          {isMaster && (
            <TabsContent value="applications" className="space-y-6">
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-primary" />
                    Candidaturas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TableApplicationsList tableId={tableId!} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>


      {/* Confirmation dialog for ending session */}
      <AlertDialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <AlertDialogContent className="border-[hsl(var(--cavern-gold))]/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="glow-gold">Finalizar Sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja encerrar a sessão de hoje e iniciar as avaliações? Os jogadores serão notificados em tempo real para avaliar o mestre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEndSession}>
              Encerrar e Avaliar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Dialog */}
      <SessionFeedbackDialog
        open={feedbackOpen}
        onOpenChange={(open) => {
          setFeedbackOpen(open);
          if (!open && !isMaster) {
            handlePlayerFeedbackDone();
          }
        }}
        tableId={tableId!}
        reviewedId={feedbackTarget}
        reviewedName={feedbackTargetName}
        reviewerRole={isMaster ? "master" : "player"}
        sessionNumber={1}
        onSubmitted={() => {
          if (isMaster) {
            handleMasterFeedbackSubmitted();
          } else {
            handlePlayerFeedbackDone();
          }
        }}
      />
    </div>
  );
};

export default AdventurePanel;
