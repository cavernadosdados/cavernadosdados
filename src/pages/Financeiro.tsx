import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { Wallet, TrendingUp, Clock, CheckCircle2, AlertCircle, Coins, ArrowUpRight, Calendar, Users, Receipt, ExternalLink, Info } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useUserType } from "@/hooks/useUserType";
import { supabase } from "@/integrations/supabase/client";
import { formatPriceBRL, isFreeTable } from "@/lib/price";
import { cn } from "@/lib/utils";

type PaymentRow = {
  id: string;
  table_id: string;
  amount_cents: number;
  commission_cents: number;
  master_payout_cents: number;
  status: string;
  currency: string;
  created_at: string;
  escrow_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  payer_id: string;
};

type MasterTableRow = {
  id: string;
  title: string;
  price_cents: number;
  commission_pct: number;
  max_players: number;
  status: string;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; tone: string; icon: any }> = {
  pending: { label: "Pendente", tone: "bg-muted text-muted-foreground", icon: Clock },
  escrow: { label: "Em garantia", tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400", icon: Clock },
  released: { label: "Liberado", tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  refunded: { label: "Estornado", tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400", icon: AlertCircle },
  failed: { label: "Falhou", tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400", icon: AlertCircle },
};

const Financeiro = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { userType } = useUserType();
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);

  // Mesas do mestre
  const { data: tables, isLoading: loadingTables } = useQuery({
    queryKey: ["finance-tables", user?.id],
    enabled: !!user && userType === "master",
    queryFn: async (): Promise<MasterTableRow[]> => {
      const { data, error } = await supabase
        .from("tables")
        .select("id,title,price_cents,commission_pct,max_players,status,created_at")
        .eq("master_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MasterTableRow[];
    },
  });

  // Pagamentos recebidos (master_id = user)
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["finance-payments", user?.id],
    enabled: !!user && userType === "master",
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,table_id,amount_cents,commission_cents,master_payout_cents,status,currency,created_at,escrow_at,released_at,refunded_at,payer_id")
        .eq("master_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });

  // Candidaturas aceitas (para estimar receita potencial em mesas pagas)
  const tableIds = useMemo(() => (tables ?? []).map((t) => t.id), [tables]);
  const { data: acceptedByTable } = useQuery({
    queryKey: ["finance-accepted", user?.id, tableIds.join(",")],
    enabled: tableIds.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("table_applications")
        .select("table_id")
        .in("table_id", tableIds)
        .eq("status", "accepted");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((row: any) => {
        map[row.table_id] = (map[row.table_id] ?? 0) + 1;
      });
      return map;
    },
  });

  // Próximas sessões com mesas pagas
  const { data: upcoming } = useQuery({
    queryKey: ["finance-upcoming", user?.id, tableIds.join(",")],
    enabled: tableIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_details")
        .select("table_id,next_session_date")
        .in("table_id", tableIds)
        .not("next_session_date", "is", null)
        .gte("next_session_date", new Date().toISOString())
        .order("next_session_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { table_id: string; next_session_date: string }[];
    },
  });

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-32 w-full" />
      </DashboardLayout>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (userType !== "master") return <Navigate to="/dashboard" replace />;

  // ====== Cálculos ======
  const paidTables = (tables ?? []).filter((t) => !isFreeTable(t.price_cents));
  const freeTables = (tables ?? []).filter((t) => isFreeTable(t.price_cents));

  const releasedCents = (payments ?? [])
    .filter((p) => p.status === "released")
    .reduce((s, p) => s + (p.master_payout_cents || 0), 0);
  const escrowCents = (payments ?? [])
    .filter((p) => p.status === "escrow")
    .reduce((s, p) => s + (p.master_payout_cents || 0), 0);
  const pendingCents = (payments ?? [])
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + (p.master_payout_cents || 0), 0);
  const refundedCount = (payments ?? []).filter((p) => p.status === "refunded").length;

  // Lookup de título da mesa para o histórico
  const tableTitleById: Record<string, string> = {};
  (tables ?? []).forEach((t) => { tableTitleById[t.id] = t.title; });

  // Receita potencial: para cada mesa paga, payout estimado * vagas aceitas (ou max_players se 0)
  const potentialCents = paidTables.reduce((sum, t) => {
    const accepted = acceptedByTable?.[t.id] ?? 0;
    const seats = accepted > 0 ? accepted : t.max_players;
    const commission = Math.round((t.price_cents * Number(t.commission_pct)) / 100);
    const payout = t.price_cents - commission;
    return sum + payout * seats;
  }, 0);

  // Próximos repasses: junta upcoming sessions com mesas pagas
  const upcomingPayouts = (upcoming ?? [])
    .map((u) => {
      const t = paidTables.find((x) => x.id === u.table_id);
      if (!t) return null;
      const accepted = acceptedByTable?.[t.id] ?? 0;
      const commission = Math.round((t.price_cents * Number(t.commission_pct)) / 100);
      const payoutPerSeat = t.price_cents - commission;
      const totalPayout = payoutPerSeat * (accepted > 0 ? accepted : 0);
      return { table: t, date: u.next_session_date, accepted, totalPayout, payoutPerSeat };
    })
    .filter(Boolean) as Array<{
      table: MasterTableRow;
      date: string;
      accepted: number;
      totalPayout: number;
      payoutPerSeat: number;
    }>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold glow-gold flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              Financeiro
            </h1>
            <p className="text-muted-foreground mt-2">
              Histórico de ganhos, próximos repasses e desempenho das suas mesas pagas.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/mesas")}>
            Gerenciar mesas
          </Button>
        </div>

        {/* Aviso scaffolding */}
        {(payments?.length ?? 0) === 0 && paidTables.length === 0 && (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-6 flex items-start gap-3">
              <Coins className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                Você ainda não tem mesas pagas. Defina um valor por vaga ao criar ou editar
                uma mesa para começar a receber repasses. As cobranças automáticas via cartão/Pix
                serão ativadas em breve.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Recebido"
            value={formatPriceBRL(releasedCents)}
            hint="Já liberado para você"
            icon={<CheckCircle2 className="h-5 w-5 text-[hsl(var(--primary))]" />}
            tone="emerald"
          />
          <StatCard
            label="Em garantia"
            value={formatPriceBRL(escrowCents)}
            hint="Liberado após a sessão"
            icon={<Clock className="h-5 w-5 text-muted-foreground" />}
            tone="amber"
          />
          <StatCard
            label="Pendente"
            value={formatPriceBRL(pendingCents)}
            hint="Aguardando confirmação"
            icon={<AlertCircle className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            label="Receita potencial"
            value={formatPriceBRL(potentialCents)}
            hint={`${paidTables.length} mesa(s) paga(s)`}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            tone="primary"
          />
        </div>

        {/* Mesas pagas vs gratuitas */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" /> Mesas pagas
              </CardTitle>
              <CardDescription>{paidTables.length} mesa(s) com cobrança ativa</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTables ? (
                <Skeleton className="h-20 w-full" />
              ) : paidTables.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma mesa paga ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {paidTables.slice(0, 5).map((t) => {
                    const accepted = acceptedByTable?.[t.id] ?? 0;
                    const commission = Math.round((t.price_cents * Number(t.commission_pct)) / 100);
                    const payout = t.price_cents - commission;
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2 hover:border-primary/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/dashboard/mesa/${t.id}`)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPriceBRL(t.price_cents)}/vaga · você recebe {formatPriceBRL(payout)}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          <Users className="h-3 w-3 mr-1" />
                          {accepted}/{t.max_players}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> Mesas gratuitas
              </CardTitle>
              <CardDescription>{freeTables.length} mesa(s) sem cobrança</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTables ? (
                <Skeleton className="h-20 w-full" />
              ) : freeTables.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma mesa gratuita.</p>
              ) : (
                <ul className="space-y-2">
                  {freeTables.slice(0, 5).map((t) => {
                    const accepted = acceptedByTable?.[t.id] ?? 0;
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2 hover:border-primary/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/dashboard/mesa/${t.id}`)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">Grátis · sem repasse</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          <Users className="h-3 w-3 mr-1" />
                          {accepted}/{t.max_players}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs de detalhes */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">
              <Calendar className="h-4 w-4 mr-2" /> Próximos repasses
            </TabsTrigger>
            <TabsTrigger value="history">
              <ArrowUpRight className="h-4 w-4 mr-2" /> Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Próximos repasses estimados</CardTitle>
                <CardDescription>
                  Calculado a partir das próximas sessões agendadas das suas mesas pagas.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {upcomingPayouts.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Nenhum repasse previsto. Agende a próxima sessão de uma mesa paga para
                    estimar o valor a receber.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mesa</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-center">Jogadores</TableHead>
                        <TableHead className="text-right">Valor estimado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingPayouts.map((row) => (
                        <TableRow
                          key={row.table.id + row.date}
                          className="cursor-pointer"
                          onClick={() => navigate(`/dashboard/mesa/${row.table.id}`)}
                        >
                          <TableCell className="font-medium">{row.table.title}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {format(new Date(row.date), "dd 'de' MMM", { locale: ptBR })}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(row.date), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {row.accepted}/{row.table.max_players}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPriceBRL(row.totalPayout)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
                <CardDescription>
                  Todos os pagamentos recebidos por suas mesas.
                  {refundedCount > 0 && ` ${refundedCount} estorno(s).`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPayments ? (
                  <div className="p-6"><Skeleton className="h-32 w-full" /></div>
                ) : (payments?.length ?? 0) === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Nenhum pagamento registrado ainda.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Mesa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor pago</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                        <TableHead className="text-right">Você recebe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(payments ?? []).map((p) => {
                        const meta = STATUS_META[p.status] ?? STATUS_META.pending;
                        const Icon = meta.icon;
                        return (
                          <TableRow
                            key={p.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedPayment(p)}
                          >
                            <TableCell className="text-sm">
                              {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {tableTitleById[p.table_id] ?? "—"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                  meta.tone,
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {meta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatPriceBRL(p.amount_cents)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              −{formatPriceBRL(p.commission_cents)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPriceBRL(p.master_payout_cents)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PaymentDetailsDialog
        payment={selectedPayment}
        tableTitle={selectedPayment ? tableTitleById[selectedPayment.table_id] : undefined}
        onClose={() => setSelectedPayment(null)}
        onOpenTable={(id) => {
          setSelectedPayment(null);
          navigate(`/dashboard/mesa/${id}`);
        }}
      />
    </DashboardLayout>
  );
};

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone?: "emerald" | "amber" | "primary";
}) {
  const ring =
    tone === "emerald"
      ? "ring-emerald-500/20"
      : tone === "amber"
      ? "ring-amber-500/20"
      : tone === "primary"
      ? "ring-primary/30"
      : "ring-border/40";
  return (
    <Card className={cn("ring-1", ring)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function PaymentDetailsDialog({
  payment,
  tableTitle,
  onClose,
  onOpenTable,
}: {
  payment: PaymentRow | null;
  tableTitle?: string;
  onClose: () => void;
  onOpenTable: (tableId: string) => void;
}) {
  const open = !!payment;
  const meta = payment ? STATUS_META[payment.status] ?? STATUS_META.pending : null;
  const StatusIcon = meta?.icon ?? Clock;

  const fmtDate = (iso: string | null) =>
    iso ? format(new Date(iso), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : null;

  const timeline = payment
    ? [
        { key: "created", label: "Pagamento criado", date: payment.created_at, icon: Receipt },
        { key: "escrow", label: "Retido em garantia", date: payment.escrow_at, icon: Clock },
        { key: "released", label: "Liberado para você", date: payment.released_at, icon: CheckCircle2 },
        { key: "refunded", label: "Estornado ao jogador", date: payment.refunded_at, icon: AlertCircle },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Detalhes do pagamento
          </DialogTitle>
          <DialogDescription>
            {tableTitle ? `Mesa: ${tableTitle}` : "Detalhamento financeiro deste pagamento."}
          </DialogDescription>
        </DialogHeader>

        {payment && meta && (
          <div className="space-y-5">
            {/* Status + ID */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  meta.tone,
                )}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <code className="text-[10px] text-muted-foreground font-mono">
                #{payment.id.slice(0, 8)}
              </code>
            </div>

            {/* Breakdown */}
            <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor pago pelo jogador</span>
                <span className="font-medium">{formatPriceBRL(payment.amount_cents)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Comissão da plataforma</span>
                <span className="text-muted-foreground">−{formatPriceBRL(payment.commission_cents)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Você recebe</span>
                <span className="text-lg font-bold text-primary">
                  {formatPriceBRL(payment.master_payout_cents)}
                </span>
              </div>
            </div>

            {/* Cálculo da comissão */}
            <CommissionBreakdown payment={payment} />

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Linha do tempo
              </h4>
              <ul className="space-y-3">
                {timeline.map((step) => {
                  const StepIcon = step.icon;
                  const reached = !!step.date;
                  return (
                    <li key={step.key} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                          reached
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground/60",
                        )}
                      >
                        <StepIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            !reached && "text-muted-foreground/70",
                          )}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reached ? fmtDate(step.date) : "—"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {payment && (
            <Button
              variant="outline"
              onClick={() => onOpenTable(payment.table_id)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir mesa
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommissionBreakdown({ payment }: { payment: PaymentRow }) {
  const amount = payment.amount_cents;
  const commission = payment.commission_cents;
  const payout = payment.master_payout_cents;

  // % efetivo armazenado (pode diferir da regra atual da mesa se ela mudou depois)
  const effectivePct = amount > 0 ? (commission / amount) * 100 : 0;

  // Reproduz a regra: commission = round(amount * pct / 100)
  const rawProduct = (amount * effectivePct) / 100;
  const rounded = Math.round(rawProduct);
  const wasRounded = Math.abs(rawProduct - rounded) > 0.0001;

  // Verifica se payout = amount - commission (auditoria)
  const sumCheck = amount - commission === payout;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold">Como a comissão foi calculada</h4>
          <p className="text-xs text-muted-foreground">
            Aplicamos uma porcentagem fixa sobre o valor pago e arredondamos para o
            centavo mais próximo.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs font-mono bg-card/60 rounded-md p-3 border border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Base (valor pago)</span>
          <span>{formatPriceBRL(amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Taxa aplicada</span>
          <span>{effectivePct.toFixed(2).replace(".", ",")}%</span>
        </div>
        <Separator className="my-1.5" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {formatPriceBRL(amount)} × {effectivePct.toFixed(2).replace(".", ",")}%
          </span>
          <span>= {formatPriceBRL(Math.trunc(rawProduct)) /* aproximado */}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Arredondado para o centavo
          </span>
          <span className={cn(wasRounded && "text-primary")}>
            = {formatPriceBRL(commission)}
          </span>
        </div>
        <Separator className="my-1.5" />
        <div className="flex items-center justify-between font-semibold">
          <span>{formatPriceBRL(amount)} − {formatPriceBRL(commission)}</span>
          <span className="text-primary">= {formatPriceBRL(payout)}</span>
        </div>
      </div>

      <ul className="text-[11px] text-muted-foreground space-y-1 pl-1">
        <li>
          • <strong>Base:</strong> valor total pago pelo jogador (sem descontos prévios).
        </li>
        <li>
          • <strong>Taxa:</strong> percentual definido na mesa no momento do pagamento — fica
          congelado no registro mesmo se você alterar a mesa depois.
        </li>
        <li>
          • <strong>Arredondamento:</strong> bancário, ao centavo mais próximo (
          <code>round(base × taxa ÷ 100)</code>) para evitar frações de centavo.
        </li>
        <li>
          • <strong>Seu repasse:</strong> base − comissão. Moeda: {payment.currency}.
        </li>
      </ul>

      {!sumCheck && (
        <p className="text-[11px] text-destructive flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          Diferença de arredondamento detectada entre comissão e repasse — o valor exato
          gravado prevalece.
        </p>
      )}
    </div>
  );
}

export default Financeiro;
