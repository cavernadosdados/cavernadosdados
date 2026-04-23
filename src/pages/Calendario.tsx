import { useState, useMemo } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionsCalendar, type CalendarSession } from "@/hooks/useSessionsCalendar";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";

type ViewMode = "month" | "week";

const Calendario = () => {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selectedSession, setSelectedSession] = useState<CalendarSession | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openSession = (s: CalendarSession) => {
    setSelectedSession(s);
    setDetailsOpen(true);
  };

  // Intervalo a buscar (sempre cobre o que está visível na grade)
  const { rangeStart, rangeEnd, days, headerLabel } = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(cursor);
      const monthEnd = endOfMonth(cursor);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      const days: Date[] = [];
      let d = gridStart;
      while (d <= gridEnd) {
        days.push(d);
        d = addDays(d, 1);
      }
      return {
        rangeStart: gridStart,
        rangeEnd: gridEnd,
        days,
        headerLabel: format(cursor, "MMMM 'de' yyyy", { locale: ptBR }),
      };
    }
    const weekStart = startOfWeek(cursor, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(cursor, { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = weekStart;
    while (d <= weekEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return {
      rangeStart: weekStart,
      rangeEnd: weekEnd,
      days,
      headerLabel: `${format(weekStart, "dd MMM", { locale: ptBR })} – ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`,
    };
  }, [view, cursor]);

  const { data: sessions, isLoading } = useSessionsCalendar(rangeStart, rangeEnd);

  // Indexa sessões por dia (YYYY-MM-DD) pra lookup rápido
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    (sessions ?? []).forEach((s) => {
      const key = s.session_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [sessions]);

  const goPrev = () => setCursor((c) => (view === "month" ? subMonths(c, 1) : subWeeks(c, 1)));
  const goNext = () => setCursor((c) => (view === "month" ? addMonths(c, 1) : addWeeks(c, 1)));
  const goToday = () => setCursor(new Date());

  const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold glow-gold flex items-center gap-2">
              <CalendarIcon className="h-8 w-8" /> Calendário de Sessões
            </h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe todas as suas sessões agendadas em um só lugar.
            </p>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="capitalize text-xl">{headerLabel}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={goPrev} aria-label="Anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goNext} aria-label="Próximo">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-px mb-1">
              {weekdayLabels.map((d) => (
                <div
                  key={d}
                  className="text-xs font-medium text-muted-foreground uppercase text-center py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {Array.from({ length: view === "month" ? 35 : 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-none" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const daySessions = sessionsByDay.get(key) ?? [];
                  const inMonth = view === "week" ? true : isSameMonth(day, cursor);
                  const today = isToday(day);
                  return (
                    <div
                      key={key}
                      className={`bg-card min-h-[110px] p-1.5 flex flex-col ${
                        inMonth ? "" : "opacity-40"
                      } ${today ? "ring-1 ring-primary ring-inset" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${
                            today
                              ? "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center"
                              : ""
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {daySessions.length > 0 && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                            {daySessions.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        {daySessions.slice(0, 3).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => openSession(s)}
                            className={`w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded transition-mystical truncate ${
                              s.is_upcoming
                                ? "bg-accent/20 text-accent-foreground border border-accent/40 hover:bg-accent/30"
                                : "bg-primary/15 text-primary hover:bg-primary/25"
                            }`}
                            title={`${s.title} – ${s.table_title}`}
                          >
                            <span className="font-medium truncate block">{s.title}</span>
                            <span className="text-muted-foreground truncate block">
                              {s.table_title}
                            </span>
                          </button>
                        ))}
                        {daySessions.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1.5">
                            +{daySessions.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista das próximas sessões abaixo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximas sessões nesta visualização</CardTitle>
          </CardHeader>
          <CardContent>
            {(sessions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma sessão agendada neste período.
              </p>
            ) : (
              <ul className="space-y-2">
                {(sessions ?? []).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-mystical cursor-pointer"
                    onClick={() => openSession(s)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{s.table_title}</p>
                    </div>
                    <Badge>
                      {format(new Date(s.session_date + "T00:00:00"), "dd MMM", { locale: ptBR })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <SessionDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          session={selectedSession}
        />
      </div>
    </DashboardLayout>
  );
};

export default Calendario;