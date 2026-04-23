import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CoverImage } from "@/components/CoverImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { composeSchedule, parseSchedule } from "@/components/WeekdaySelector";
import { FullRulesDialog } from "@/components/FullRulesDialog";
import { ApplyTableDialog } from "@/components/ApplyTableDialog";
import { ReportTableButton } from "@/components/ReportTableButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Coins,
  Copy,
  Check,
  Flame,
  Gamepad2,
  Globe,
  Hourglass,
  LayoutDashboard,
  Lock,
  Monitor,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import { formatPriceBRL, isFreeTable } from "@/lib/price";
import { toast } from "sonner";

/**
 * Public, read-only "Table Details" page.
 * Anyone authenticated can open it (from "Ver detalhes" buttons).
 * - Shows cover, description, system info, vacancies, schedule, rules, sessions.
 * - Does NOT expose any edit controls.
 * - The table owner (master) sees a "Gerenciar mesa" CTA that opens the full panel.
 * - Accepted players see an "Entrar na mesa" CTA that opens the full panel.
 */
const MesaDetalhes = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Public table info (RLS allows any authenticated user to read tables).
  const { data: table, isLoading: loadingTable } = useQuery({
    queryKey: ["mesa-detalhes-table", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*, profiles(id, display_name, avatar_url)")
        .eq("id", tableId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tableId,
  });

  // Campaign details — visible to master & accepted players via RLS.
  // For other viewers this returns null and we just hide rule sections gracefully.
  const { data: campaign } = useQuery({
    queryKey: ["mesa-detalhes-campaign", tableId],
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

  // Accepted player count (just the count → vagas restantes).
  const { data: acceptedCount } = useQuery({
    queryKey: ["mesa-detalhes-accepted", tableId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("table_applications")
        .select("id", { count: "exact", head: true })
        .eq("table_id", tableId!)
        .eq("status", "accepted");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!tableId,
  });

  // Sessions (RLS only returns rows for master + accepted players).
  const { data: sessions } = useQuery({
    queryKey: ["mesa-detalhes-sessions", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_logs")
        .select("id, title, session_number, session_date, created_at")
        .eq("table_id", tableId!)
        .order("session_number", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tableId,
  });

  // Viewer's application (to decide which CTA to show).
  const { data: myApp } = useQuery({
    queryKey: ["mesa-detalhes-myapp", tableId, user?.id],
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
    enabled: !!tableId && !!user,
  });

  // SEO
  useEffect(() => {
    if (table?.title) {
      document.title = `${table.title} — Detalhes da Mesa`;
    }
  }, [table?.title]);

  if (loadingTable) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!table) {
    return (
      <DashboardLayout>
        <Card className="bg-card/60 border-border">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-xl font-bold">Mesa não encontrada</h2>
            <p className="text-sm text-muted-foreground">
              Esta mesa pode ter sido removida ou o link está incorreto.
            </p>
            <Button onClick={() => navigate("/dashboard/explorar")}>
              Explorar mesas
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isOwner = !!user && user.id === table.master_id;
  const isAccepted = myApp?.status === "accepted";
  const isPending = myApp?.status === "pending";
  const isRejected = myApp?.status === "rejected";

  const maxPlayers = table.max_players ?? 0;
  const accepted = acceptedCount ?? 0;
  const seatsLeft = Math.max(0, maxPlayers - accepted);
  const isFull = seatsLeft === 0;

  const { days, time } = parseSchedule(campaign?.schedule_time || "");
  const scheduleLabel = composeSchedule(days, time);

  // Sections visible only to master + accepted players (RLS hides campaign rows otherwise).
  const canSeePrivateRules = !!campaign;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top nav */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>

          {/* Compartilhar — disponível para qualquer pessoa */}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              setCopied(false);
              setShareOpen(true);
            }}
          >
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>

          {/* Owner-only quick action */}
          {isOwner && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => navigate(`/dashboard/mesa/${table.id}`)}
            >
              <LayoutDashboard className="h-4 w-4" />
              Gerenciar mesa
            </Button>
          )}

          {/* Accepted players quick action */}
          {!isOwner && isAccepted && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => navigate(`/dashboard/mesa/${table.id}`)}
            >
              <BookOpen className="h-4 w-4" />
              Entrar na mesa
            </Button>
          )}

          {/* Botão de denúncia disponível para qualquer usuário que não seja o dono */}
          {!isOwner && (
            <ReportTableButton
              tableId={table.id}
              tableTitle={table.title}
              variant="menu-item"
              className="text-muted-foreground hover:text-destructive"
            />
          )}
        </div>

        {/* Hero cover */}
        <Card className="overflow-hidden border-primary/20 rounded-2xl relative min-h-[280px] sm:min-h-[340px]">
          <CoverImage
            src={table.cover_url}
            alt={`Capa de ${table.title}`}
            eager
            className="absolute inset-0 h-full w-full brightness-[0.45]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />

          <div className="relative z-10 flex flex-col justify-end h-full w-full p-5 sm:p-8 gap-3 text-white min-h-[280px] sm:min-h-[340px]">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1 text-xs bg-black/40 border-white/20 text-white backdrop-blur-sm">
                <Gamepad2 className="h-3 w-3" /> {table.system}
              </Badge>
              <Badge variant="outline" className="text-xs bg-black/40 border-white/20 text-white backdrop-blur-sm">
                {table.theme}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs bg-black/40 border-white/20 text-white backdrop-blur-sm">
                <Clock className="h-3 w-3" /> {table.duration}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs bg-black/40 border-white/20 text-white backdrop-blur-sm">
                <Monitor className="h-3 w-3" /> {table.platform}
              </Badge>
              <Badge
                variant="outline"
                className={`gap-1 text-xs backdrop-blur-sm font-semibold ${
                  isFreeTable(table.price_cents)
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-100"
                    : "bg-primary/25 border-primary/50 text-white"
                }`}
              >
                <Coins className="h-3 w-3" />
                {formatPriceBRL(table.price_cents)}
                {!isFreeTable(table.price_cents) && (
                  <span className="opacity-80 font-normal">/ jogador</span>
                )}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {table.title}
            </h1>

            {table.profiles && (
              <button
                type="button"
                onClick={() => navigate(`/dashboard/perfil/${(table.profiles as any).id ?? table.master_id}`)}
                className="group inline-flex items-center gap-2 text-sm text-white/90 hover:text-primary transition-colors w-fit"
              >
                <Avatar className="h-7 w-7 border border-white/40">
                  <AvatarImage src={(table.profiles as any).avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs bg-black/40">
                    {((table.profiles as any).display_name ?? "M").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] uppercase tracking-wider text-primary">Mestre</span>
                <span className="font-medium">
                  {(table.profiles as any).display_name ?? "Mestre"}
                </span>
              </button>
            )}
          </div>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card/60 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" /> Vagas
              </div>
              <p className="text-lg font-bold">
                {accepted}/{maxPlayers}
                {!isFull && (
                  <span className="text-xs text-primary ml-2 font-medium">
                    {seatsLeft} disponí{seatsLeft === 1 ? "vel" : "veis"}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Hourglass className="h-3.5 w-3.5" /> Duração
              </div>
              <p className="text-sm font-semibold truncate">{table.duration}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" /> Frequência
              </div>
              <p className="text-sm font-semibold truncate">
                {campaign?.frequency || "Não definida"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" /> Horário
              </div>
              <p className="text-sm font-semibold truncate">
                {scheduleLabel || "A definir"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left column — narrative */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Sobre a aventura
                </CardTitle>
              </CardHeader>
              <CardContent>
                {table.description ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {table.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    O mestre ainda não escreveu uma descrição para esta mesa.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Campaign rules — only if campaign data is visible (master/accepted) */}
            {canSeePrivateRules && (
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Swords className="h-4 w-4 text-primary" />
                      Regras e expectativas
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 h-8"
                      onClick={() => setRulesOpen(true)}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Ver regras completas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <RuleBlock
                    icon={<Target className="h-3.5 w-3.5" />}
                    label="Objetivos da campanha"
                    value={campaign?.campaign_objectives}
                  />
                  <Separator />
                  <RuleBlock
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    label="Progressão"
                    value={campaign?.progression_expectation}
                  />
                  <Separator />
                  <RuleBlock
                    icon={<Swords className="h-3.5 w-3.5" />}
                    label="Regras da casa"
                    value={campaign?.house_rules}
                  />
                  <Separator />
                  <RuleBlock
                    icon={<Swords className="h-3.5 w-3.5" />}
                    label="Combate"
                    value={campaign?.combat_rules}
                  />
                  <Separator />
                  <RuleBlock
                    icon={<UserX className="h-3.5 w-3.5" />}
                    label="PvP"
                    value={campaign?.pvp_rules}
                  />
                </CardContent>
              </Card>
            )}

            {/* Safety — only visible to master/accepted */}
            {canSeePrivateRules && (
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    Segurança na mesa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <RuleBlock label="Linhas (temas proibidos)" value={campaign?.safety_lines} />
                  <Separator />
                  <RuleBlock label="Véus / gatilhos" value={campaign?.safety_veils} />
                  <Separator />
                  <RuleBlock label="Raças restritas" value={campaign?.restricted_races} />
                  <Separator />
                  <RuleBlock label="Classes restritas" value={campaign?.restricted_classes} />
                  <Separator />
                  <RuleBlock label="Magias restritas" value={campaign?.restricted_spells} />
                </CardContent>
              </Card>
            )}

            {/* Sessions list — visible only to master/accepted (RLS) */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Sessões registradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions && sessions.length > 0 ? (
                  <ol className="space-y-2">
                    {sessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            #{s.session_number} · {s.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(s.session_date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {canSeePrivateRules
                      ? "Nenhuma sessão registrada ainda."
                      : "O histórico de sessões fica disponível após você ser aceito na mesa."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-6">
            {/* Vacancies card */}
            <Card className="border-primary/20 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Vagas disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold glow-gold">{seatsLeft}</span>
                  <span className="text-sm text-muted-foreground">
                    de {maxPlayers} vagas
                  </span>
                </div>
                {isFull ? (
                  <Badge variant="secondary" className="w-full justify-center py-1.5">
                    Mesa cheia
                  </Badge>
                ) : seatsLeft <= 1 ? (
                  <Badge variant="destructive" className="w-full justify-center py-1.5 gap-1">
                    <Flame className="h-3 w-3" /> Última vaga!
                  </Badge>
                ) : (
                  <Badge className="w-full justify-center py-1.5 bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30">
                    Aberta para candidaturas
                  </Badge>
                )}

                {/* Status / CTA — only for non-owners */}
                {!isOwner && (
                  <>
                    {isAccepted && (
                      <Button
                        className="w-full gap-2"
                        onClick={() => navigate(`/dashboard/mesa/${table.id}`)}
                      >
                        <BookOpen className="h-4 w-4" />
                        Entrar na mesa
                      </Button>
                    )}
                    {isPending && (
                      <Badge variant="secondary" className="w-full justify-center py-1.5">
                        Candidatura em análise
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="destructive" className="w-full justify-center py-1.5">
                        Candidatura recusada
                      </Badge>
                    )}
                    {!myApp && !isFull && (
                      <Button
                        className="w-full gap-2"
                        onClick={() => setApplyOpen(true)}
                      >
                        <Send className="h-4 w-4" />
                        Quero participar
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Logistics card */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Logística
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Frequência" value={campaign?.frequency} />
                <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Horário" value={scheduleLabel} />
                <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Fuso" value={campaign?.timezone || "GMT-3"} />
                <InfoRow icon={<Monitor className="h-3.5 w-3.5" />} label="Plataforma" value={table.platform} />
                {canSeePrivateRules && (
                  <>
                    <Separator />
                    <InfoRow label="Política de faltas" value={campaign?.absence_policy} />
                    <InfoRow label="Política de atrasos" value={campaign?.lateness_policy} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Restricted info notice for outside viewers */}
            {!canSeePrivateRules && (
              <Card className="border-border bg-card/40">
                <CardContent className="p-4 flex items-start gap-3">
                  <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Algumas informações detalhadas (regras da casa, segurança, sessões) ficam
                    disponíveis apenas para o mestre e os jogadores aceitos.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {canSeePrivateRules && (
        <FullRulesDialog
          open={rulesOpen}
          onOpenChange={setRulesOpen}
          tableTitle={table.title}
          campaign={campaign}
          scheduleLabel={scheduleLabel}
          showReaderMode={isAccepted || isOwner}
        />
      )}

      <ApplyTableDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        tableId={table.id}
        tableTitle={table.title}
        onApplied={() => {
          setApplyOpen(false);
        }}
      />

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Compartilhar mesa
            </DialogTitle>
            <DialogDescription>
              Qualquer pessoa com o link consegue ver a página pública desta mesa, mesmo sem login.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const shareUrl = `${window.location.origin}/m/${table.id}`;
            const handleCopy = async () => {
              try {
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(shareUrl);
                } else {
                  // Fallback para iframes/contextos sem Clipboard API
                  const ta = document.createElement("textarea");
                  ta.value = shareUrl;
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  document.body.removeChild(ta);
                }
                setCopied(true);
                toast.success("Link copiado!");
                setTimeout(() => setCopied(false), 2000);
              } catch {
                toast.error("Não foi possível copiar", {
                  description: "Selecione o link manualmente e copie.",
                });
              }
            };
            const handleNativeShare = async () => {
              try {
                await navigator.share?.({ title: table.title, url: shareUrl });
              } catch {
                // usuário cancelou
              }
            };
            return (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleCopy}
                    className="gap-2 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar link
                      </>
                    )}
                  </Button>
                </div>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNativeShare}
                    className="w-full gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartilhar via…
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// Small helpers (kept local — only used by this page)
const RuleBlock = ({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
}) => (
  <div>
    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
      {value && value.trim() ? value : <span className="italic text-muted-foreground">Não definido.</span>}
    </p>
  </div>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
}) => (
  <div className="flex items-start justify-between gap-2">
    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
      {icon}
      {label}
    </span>
    <span className="text-sm font-medium text-right truncate max-w-[55%]">
      {value && value.trim() ? value : <span className="italic text-muted-foreground">—</span>}
    </span>
  </div>
);

export default MesaDetalhes;