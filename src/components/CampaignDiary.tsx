import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Plus,
  Sparkles,
  Save,
  Pin,
  PinOff,
  Send,
  Crown,
  Hash,
  Loader2,
  Trash2,
  MessageCircle,
  Wand2,
  Copy,
} from "lucide-react";
import { SessionPresencePanel } from "@/components/SessionPresencePanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const REACTION_EMOJIS = ["⚔️", "🎲", "🔥", "💀", "✨", "🛡️"];

interface CampaignDiaryProps {
  tableId: string;
  tableTitle: string;
  tableSystem: string;
  isMaster: boolean;
  webhookUrl?: string;
}

export const CampaignDiary = ({ tableId, tableTitle, tableSystem, isMaster, webhookUrl }: CampaignDiaryProps) => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const qc = useQueryClient();

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [narrative, setNarrative] = useState("");
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [sendingDiscord, setSendingDiscord] = useState(false);
  const [hookOpen, setHookOpen] = useState(false);
  const [hookLoading, setHookLoading] = useState(false);
  const [hookHint, setHookHint] = useState("");
  const [hookResult, setHookResult] = useState<{ title?: string; hook?: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [newReport, setNewReport] = useState("");
  const [characterName, setCharacterName] = useState("");

  // === Logs ===
  const { data: logs = [] } = useQuery({
    queryKey: ["session_logs", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_logs")
        .select("*")
        .eq("table_id", tableId)
        .order("session_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!selectedLogId && logs.length > 0) {
      setSelectedLogId(logs[0].id);
    }
  }, [logs, selectedLogId]);

  const selectedLog = useMemo(() => logs.find((l) => l.id === selectedLogId), [logs, selectedLogId]);

  useEffect(() => {
    if (selectedLog) {
      setNarrative(selectedLog.master_narrative || "");
      setSummary(selectedLog.ai_epic_summary || "");
    } else {
      setNarrative("");
      setSummary("");
    }
  }, [selectedLog]);

  // === Reports for selected log ===
  const { data: reports = [] } = useQuery({
    queryKey: ["player_reports", selectedLogId],
    queryFn: async () => {
      if (!selectedLogId) return [];
      const { data, error } = await supabase
        .from("player_reports")
        .select("*")
        .eq("session_log_id", selectedLogId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLogId,
  });

  const reportIds = reports.map((r) => r.id);

  const { data: reactions = [] } = useQuery({
    queryKey: ["report_reactions", selectedLogId, reportIds.join(",")],
    queryFn: async () => {
      if (reportIds.length === 0) return [];
      const { data, error } = await supabase
        .from("report_reactions")
        .select("*")
        .in("report_id", reportIds);
      if (error) throw error;
      return data || [];
    },
    enabled: reportIds.length > 0,
  });

  // Realtime
  useEffect(() => {
    if (!selectedLogId) return;
    const ch = supabase
      .channel(`diary-${selectedLogId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_reports", filter: `session_log_id=eq.${selectedLogId}` }, () => {
        qc.invalidateQueries({ queryKey: ["player_reports", selectedLogId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "report_reactions" }, () => {
        qc.invalidateQueries({ queryKey: ["report_reactions", selectedLogId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "session_logs", filter: `table_id=eq.${tableId}` }, () => {
        qc.invalidateQueries({ queryKey: ["session_logs", tableId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedLogId, tableId, qc]);

  // === Actions ===
  const handleNewSession = async () => {
    const nextNumber = (logs[0]?.session_number || 0) + 1;
    const { data, error } = await supabase
      .from("session_logs")
      .insert({
        table_id: tableId,
        session_number: nextNumber,
        title: `Sessão ${nextNumber}`,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setSelectedLogId(data.id);
    qc.invalidateQueries({ queryKey: ["session_logs", tableId] });
  };

  const handleSaveLog = async () => {
    if (!selectedLogId) return;
    setSavingLog(true);
    const { error } = await supabase
      .from("session_logs")
      .update({ master_narrative: narrative, ai_epic_summary: summary })
      .eq("id", selectedLogId);
    setSavingLog(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Salvo!", description: "Diário atualizado." });
    qc.invalidateQueries({ queryKey: ["session_logs", tableId] });
  };

  const handleGenerateSummary = async () => {
    if (narrative.trim().length < 20) {
      toast({ title: "Relato curto", description: "Escreva ao menos 20 caracteres antes de gerar.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const res = await supabase.functions.invoke("generate-epic-summary", {
        body: { narrative, table_title: tableTitle, system: tableSystem },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      setSummary(res.data.summary);
      toast({ title: "✨ Resumo épico gerado!", description: "Revise e salve quando estiver bom." });
    } catch (err: any) {
      toast({ title: "Erro na IA", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSuggestNextHook = async () => {
    setHookLoading(true);
    setHookResult(null);
    try {
      const narratives = logs
        .slice()
        .reverse()
        .map((l: any) => (l.ai_epic_summary || l.master_narrative || "").trim())
        .filter((s) => s.length > 0);
      if (narratives.length === 0) {
        toast({
          title: "Diário vazio",
          description: "Escreva pelo menos uma sessão antes de pedir um gancho.",
          variant: "destructive",
        });
        return;
      }
      const res = await supabase.functions.invoke("generate-lore-suggestion", {
        body: {
          type: "next_hook",
          table_title: tableTitle,
          system: tableSystem,
          narratives,
          hint: hookHint.trim() || undefined,
        },
      });
      if (res.error) throw res.error;
      if ((res.data as any)?.error) throw new Error((res.data as any).error);
      setHookResult((res.data as any)?.result || {});
    } catch (err: any) {
      toast({ title: "Erro na IA", description: err.message, variant: "destructive" });
    } finally {
      setHookLoading(false);
    }
  };

  const handleSendDiscord = async () => {
    if (!webhookUrl) {
      toast({ title: "Webhook não configurado", description: "Configure na aba Integrações.", variant: "destructive" });
      return;
    }
    if (!summary && !narrative) {
      toast({ title: "Nada para enviar", description: "Gere um resumo ou escreva o relato.", variant: "destructive" });
      return;
    }
    setSendingDiscord(true);
    try {
      const pinned = reports.find((r) => r.id === selectedLog?.pinned_report_id);
      const res = await supabase.functions.invoke("discord-webhook", {
        body: {
          webhook_url: webhookUrl,
          type: "diary_entry",
          table_title: tableTitle,
          table_id: tableId,
          session_number: selectedLog?.session_number,
          session_title: selectedLog?.title,
          summary: summary || narrative.slice(0, 500),
          pinned_report: pinned ? { character_name: pinned.character_name, content: pinned.content } : null,
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      await supabase.from("session_logs").update({ sent_to_discord: true }).eq("id", selectedLogId!);
      qc.invalidateQueries({ queryKey: ["session_logs", tableId] });
      toast({ title: "📜 Enviado ao Discord!", description: "O canal recebeu o relato épico." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSendingDiscord(false);
    }
  };

  const handleAddReport = async () => {
    if (!selectedLogId || !user || !newReport.trim()) return;
    const { error } = await supabase.from("player_reports").insert({
      session_log_id: selectedLogId,
      player_id: user.id,
      character_name: characterName.trim() || profile?.display_name || "Aventureiro",
      character_avatar_url: profile?.avatar_url || "",
      content: newReport.trim(),
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setNewReport("");
    qc.invalidateQueries({ queryKey: ["player_reports", selectedLogId] });
  };

  const handleDeleteReport = async (id: string) => {
    const { error } = await supabase.from("player_reports").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["player_reports", selectedLogId] });
  };

  const handleToggleReaction = async (reportId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.report_id === reportId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("report_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("report_reactions").insert({ report_id: reportId, user_id: user.id, emoji });
    }
    qc.invalidateQueries({ queryKey: ["report_reactions", selectedLogId] });
  };

  const handleTogglePin = async (reportId: string) => {
    if (!selectedLogId) return;
    const newPin = selectedLog?.pinned_report_id === reportId ? null : reportId;
    const { error } = await supabase.from("session_logs").update({ pinned_report_id: newPin }).eq("id", selectedLogId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["session_logs", tableId] });
    toast({ title: newPin ? "📌 Relato fixado!" : "Relato desfixado", description: newPin ? "Este será o relato oficial enviado ao Discord." : "" });
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    const { error } = await supabase.from("session_logs").delete().eq("id", sessionToDelete);
    setDeleteOpen(false);
    setSessionToDelete(null);
    if (error) {
      toast({ title: "Erro ao excluir sessão", description: error.message, variant: "destructive" });
      return;
    }
    if (selectedLogId === sessionToDelete) setSelectedLogId(null);
    qc.invalidateQueries({ queryKey: ["session_logs", tableId] });
    toast({ title: "Sessão excluída", description: "O registro foi removido do diário." });
  };

  const groupReactions = (reportId: string) => {
    const grouped = new Map<string, { count: number; mine: boolean }>();
    reactions
      .filter((r) => r.report_id === reportId)
      .forEach((r) => {
        const cur = grouped.get(r.emoji) || { count: 0, mine: false };
        cur.count += 1;
        if (r.user_id === user?.id) cur.mine = true;
        grouped.set(r.emoji, cur);
      });
    return Array.from(grouped.entries());
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* === SIDEBAR DE SESSÕES === */}
      <Card className="border-border bg-card/60 h-fit lg:sticky lg:top-24">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Sessões
          </CardTitle>
          {isMaster && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleNewSession}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 pr-2">
              {logs.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 text-center">
                  {isMaster ? "Crie sua primeira sessão" : "Nenhuma sessão registrada"}
                </p>
              )}
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLogId(log.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-mystical text-sm ${
                    selectedLogId === log.id
                      ? "bg-[hsl(var(--cavern-gold))]/15 border border-[hsl(var(--cavern-gold))]/30 glow-gold"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{log.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                    {new Date(log.session_date).toLocaleDateString("pt-BR")}
                    {log.sent_to_discord && " • 📜 enviado"}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* === EDITOR / VISUALIZAÇÃO === */}
      <div className="space-y-4">
        {!selectedLog ? (
          <Card className="border-border bg-card/60">
            <CardContent className="p-12 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
              {isMaster ? "Crie uma sessão para começar a escrever o diário." : "O mestre ainda não criou registros do diário."}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Editor do mestre */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Relato da Sessão
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isMaster && (
                      <>
                        <Button
                          size="sm"
                          onClick={handleGenerateSummary}
                          disabled={generating}
                          className="gap-2 bg-gradient-to-r from-[hsl(var(--cavern-gold))] to-[hsl(var(--cavern-copper))] text-background hover:opacity-90 border-0 shadow-[0_0_20px_hsl(var(--cavern-gold)/0.4)]"
                        >
                          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          Gerar Resumo Épico com IA
                          <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 border-background/30 text-background/80">PREMIUM</Badge>
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleSaveLog} disabled={savingLog} className="gap-2">
                          {savingLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setHookResult(null); setHookHint(""); setHookOpen(true); }}
                          className="gap-2 border-[hsl(var(--cavern-gold))]/40 text-[hsl(var(--cavern-gold))] hover:bg-[hsl(var(--cavern-gold))]/10"
                        >
                          <Wand2 className="h-4 w-4" />
                          Sugerir gancho
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isMaster ? (
                  <>
                    <div>
                      <Label className="text-xs">Relato bruto (anotações da sessão)</Label>
                      <Textarea
                        value={narrative}
                        onChange={(e) => setNarrative(e.target.value)}
                        placeholder="Anote tudo o que aconteceu na sessão... combates, diálogos, descobertas..."
                        className="mt-1 min-h-[180px] bg-background/50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-[hsl(var(--cavern-gold))]" />
                        Resumo Épico (gerado pela IA, editável)
                      </Label>
                      <Textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Clique em 'Gerar Resumo Épico' para criar uma versão narrativa do relato..."
                        className="mt-1 min-h-[140px] bg-background/50 italic"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    {summary && (
                      <div className="p-4 rounded-lg bg-[hsl(var(--cavern-gold))]/5 border border-[hsl(var(--cavern-gold))]/20">
                        <p className="text-sm whitespace-pre-wrap italic leading-relaxed">{summary}</p>
                      </div>
                    )}
                    {narrative && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Relato do Mestre</p>
                        <p className="text-sm whitespace-pre-wrap">{narrative}</p>
                      </div>
                    )}
                    {!summary && !narrative && (
                      <p className="text-sm text-muted-foreground">O mestre ainda não escreveu o relato desta sessão.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview Discord */}
            {isMaster && (summary || narrative) && (
              <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" style={{ color: "#5865F2" }} />
                      Preview no Discord
                      <Badge variant="outline" className="text-[9px] gap-1 border-[hsl(var(--cavern-gold))]/40 text-[hsl(var(--cavern-gold))]">
                        <Sparkles className="h-2.5 w-2.5" />
                        PREMIUM
                      </Badge>
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={handleSendDiscord}
                      disabled={sendingDiscord || !webhookUrl}
                      className="gap-2"
                      style={{ background: "#5865F2", color: "white" }}
                    >
                      {sendingDiscord ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Enviar ao Discord
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <DiscordPreview
                    tableTitle={tableTitle}
                    sessionTitle={selectedLog.title}
                    sessionNumber={selectedLog.session_number}
                    summary={summary || narrative.slice(0, 500)}
                    pinnedReport={reports.find((r) => r.id === selectedLog.pinned_report_id)}
                  />
                </CardContent>
              </Card>
            )}

            {/* === PRESENÇA DA SESSÃO === */}
            <SessionPresencePanel
              tableId={tableId}
              sessionLogId={selectedLog.id}
              sessionDate={selectedLog.session_date}
              isMaster={isMaster}
            />

            {/* === RELATOS DOS AVENTUREIROS === */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="h-4 w-4 text-[hsl(var(--cavern-gold))]" />
                  Relatos dos Aventureiros
                  <Badge variant="secondary" className="text-[10px]">{reports.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reports.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum relato ainda. Seja o primeiro a contar a história sob sua perspectiva!
                  </p>
                )}

                {reports.map((report) => {
                  const isPinned = selectedLog.pinned_report_id === report.id;
                  const grouped = groupReactions(report.id);
                  const isMine = report.player_id === user?.id;
                  return (
                    <div
                      key={report.id}
                      className={`flex gap-3 p-3 rounded-lg border transition-mystical ${
                        isPinned
                          ? "border-[hsl(var(--cavern-gold))]/40 bg-[hsl(var(--cavern-gold))]/5 shadow-[0_0_20px_hsl(var(--cavern-gold)/0.15)]"
                          : "border-border bg-background/30"
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={report.character_avatar_url || undefined} />
                        <AvatarFallback>{report.character_name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{report.character_name}</span>
                          {isPinned && (
                            <Badge className="text-[10px] gap-1 bg-[hsl(var(--cavern-gold))] text-background hover:bg-[hsl(var(--cavern-gold))]">
                              <Pin className="h-2.5 w-2.5" />
                              Oficial
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(report.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{report.content}</p>
                        {/* Reactions */}
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          {grouped.map(([emoji, info]) => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(report.id, emoji)}
                              className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-mystical ${
                                info.mine
                                  ? "bg-[hsl(var(--cavern-gold))]/20 border-[hsl(var(--cavern-gold))]/50"
                                  : "bg-muted/50 border-border hover:bg-muted"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-muted-foreground">{info.count}</span>
                            </button>
                          ))}
                          <div className="flex items-center gap-0.5 ml-1">
                            {REACTION_EMOJIS.filter((e) => !grouped.find(([emo]) => emo === e)).slice(0, 4).map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(report.id, emoji)}
                                className="text-sm opacity-40 hover:opacity-100 hover:scale-125 transition-all px-1"
                                title={`Reagir com ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          <div className="ml-auto flex items-center gap-1">
                            {isMaster && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => handleTogglePin(report.id)}
                              >
                                {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                {isPinned ? "Desfixar" : "Fixar"}
                              </Button>
                            )}
                            {isMine && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteReport(report.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Form para jogador (não-mestre) adicionar relato */}
                {!isMaster && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs">Adicionar seu relato</Label>
                      <Input
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        placeholder="Nome do seu personagem"
                        className="bg-background/50 text-sm"
                      />
                      <Textarea
                        value={newReport}
                        onChange={(e) => setNewReport(e.target.value)}
                        placeholder="O que seu personagem sentiu ou fez nesta sessão?"
                        className="bg-background/50 min-h-[80px]"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={handleAddReport} disabled={!newReport.trim()} className="gap-2">
                          <Send className="h-3 w-3" />
                          Publicar relato
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Dialog: Sugerir gancho de próxima sessão */}
      <Dialog open={hookOpen} onOpenChange={setHookOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-[hsl(var(--cavern-gold))]" />
              Sugerir gancho da próxima sessão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              A IA lê os relatos/resumos do diário e sugere um gancho para abrir a próxima sessão.
            </p>
            <div>
              <Label className="text-xs">Direção desejada (opcional)</Label>
              <Input
                value={hookHint}
                onChange={(e) => setHookHint(e.target.value)}
                placeholder="Ex: foco em traição política, voltar à masmorra..."
                className="mt-1 bg-background/50"
              />
            </div>
            <Button
              onClick={handleSuggestNextHook}
              disabled={hookLoading}
              className="w-full gap-2 bg-gradient-to-r from-[hsl(var(--cavern-gold))] to-[hsl(var(--cavern-copper))] text-background hover:opacity-90 border-0"
            >
              {hookLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {hookResult ? "Gerar outro" : "Gerar gancho"}
            </Button>
            {hookResult && (
              <div className="rounded-md border border-[hsl(var(--cavern-gold))]/30 bg-[hsl(var(--cavern-gold))]/5 p-4 space-y-2">
                {hookResult.title && (
                  <div className="font-bold text-[hsl(var(--cavern-gold))]">{hookResult.title}</div>
                )}
                <p className="text-sm whitespace-pre-wrap italic leading-relaxed">{hookResult.hook}</p>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={async () => {
                      const text = [hookResult.title, hookResult.hook].filter(Boolean).join("\n\n");
                      try {
                        await navigator.clipboard.writeText(text);
                        toast({ title: "Copiado!" });
                      } catch {
                        toast({ title: "Falha ao copiar", variant: "destructive" });
                      }
                    }}
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHookOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ===== Discord Preview Component =====
interface DiscordPreviewProps {
  tableTitle: string;
  sessionTitle: string;
  sessionNumber: number;
  summary: string;
  pinnedReport?: { character_name: string; character_avatar_url?: string; content: string };
}

const DiscordPreview = ({ tableTitle, sessionTitle, sessionNumber, summary, pinnedReport }: DiscordPreviewProps) => {
  return (
    <div className="rounded-md p-4 font-sans" style={{ background: "#313338", color: "#dbdee1" }}>
      {/* Bot header */}
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: "hsl(var(--cavern-gold))" }}
        >
          🎲
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold" style={{ color: "#f2f3f5" }}>Caverna dos Dados</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "#5865F2", color: "white" }}>BOT</span>
            <span className="text-[11px]" style={{ color: "#949ba4" }}>hoje às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          {/* Embed */}
          <div
            className="mt-1 rounded p-3 max-w-full"
            style={{ background: "#2b2d31", borderLeft: "4px solid hsl(var(--cavern-gold))" }}
          >
            <div className="text-xs mb-1" style={{ color: "#949ba4" }}>{tableTitle}</div>
            <div className="font-bold mb-2" style={{ color: "hsl(var(--cavern-gold))" }}>
              📜 Sessão {sessionNumber}: {sessionTitle}
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#dbdee1" }}>
              {summary || "(sem resumo ainda)"}
            </p>

            {pinnedReport && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "#3f4147" }}>
                <div className="text-xs mb-1 flex items-center gap-1" style={{ color: "hsl(var(--cavern-gold))" }}>
                  <Pin className="h-3 w-3" /> Relato Oficial — {pinnedReport.character_name}
                </div>
                <p className="text-xs italic" style={{ color: "#b5bac1" }}>
                  "{pinnedReport.content}"
                </p>
              </div>
            )}

            <div className="mt-3 text-[10px]" style={{ color: "#949ba4" }}>
              Caverna dos Dados • Diário da Campanha
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
