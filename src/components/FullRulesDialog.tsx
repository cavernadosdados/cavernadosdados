import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Swords,
  Target,
  TrendingUp,
  UserX,
  ShieldAlert,
  Calendar,
  Clock,
  Globe,
  BookOpen,
  Sparkles,
} from "lucide-react";

type CampaignLike = {
  campaign_objectives?: string | null;
  progression_expectation?: string | null;
  house_rules?: string | null;
  combat_rules?: string | null;
  pvp_rules?: string | null;
  safety_lines?: string | null;
  safety_veils?: string | null;
  restricted_races?: string | null;
  restricted_classes?: string | null;
  restricted_spells?: string | null;
  absence_policy?: string | null;
  lateness_policy?: string | null;
  frequency?: string | null;
  schedule_time?: string | null;
  timezone?: string | null;
} | null | undefined;

interface FullRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableTitle: string;
  campaign: CampaignLike;
  scheduleLabel?: string;
  /** Show the "Modo leitura fácil" toggle (for accepted players). */
  showReaderMode?: boolean;
}

/**
 * Modal de regras completas da mesa.
 * - Mostra todas as regras, segurança e logística agrupadas em seções.
 * - "Modo leitura fácil" aumenta a fonte, o espaçamento e melhora o contraste,
 *   pensado para jogadores aceitos lerem antes da sessão.
 */
export function FullRulesDialog({
  open,
  onOpenChange,
  tableTitle,
  campaign,
  scheduleLabel,
  showReaderMode = true,
}: FullRulesDialogProps) {
  const [easyRead, setEasyRead] = useState(showReaderMode);

  const textBase = easyRead ? "text-base leading-relaxed" : "text-sm leading-normal";
  const labelBase = easyRead
    ? "text-sm font-semibold tracking-wide text-primary"
    : "text-xs uppercase tracking-wider text-muted-foreground";
  const sectionGap = easyRead ? "space-y-6" : "space-y-4";
  const blockGap = easyRead ? "space-y-3" : "space-y-1.5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <DialogTitle className="text-xl flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">Regras completas</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {tableTitle}
              </DialogDescription>
            </div>
            {showReaderMode && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Leitura fácil
                <Switch checked={easyRead} onCheckedChange={setEasyRead} />
              </label>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-5">
          <div className={sectionGap}>
            {/* Logística rápida */}
            <Section title="Logística da mesa" icon={<Calendar className="h-4 w-4 text-primary" />} easyRead={easyRead}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Pill icon={<Calendar className="h-3.5 w-3.5" />} label="Frequência" value={campaign?.frequency} easyRead={easyRead} />
                <Pill icon={<Clock className="h-3.5 w-3.5" />} label="Horário" value={scheduleLabel} easyRead={easyRead} />
                <Pill icon={<Globe className="h-3.5 w-3.5" />} label="Fuso" value={campaign?.timezone || "GMT-3"} easyRead={easyRead} />
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${easyRead ? "mt-3" : "mt-2"}`}>
                <Pill label="Política de faltas" value={campaign?.absence_policy} easyRead={easyRead} />
                <Pill label="Política de atrasos" value={campaign?.lateness_policy} easyRead={easyRead} />
              </div>
            </Section>

            <Separator />

            {/* Expectativas e regras */}
            <Section title="Expectativas e regras" icon={<Swords className="h-4 w-4 text-primary" />} easyRead={easyRead}>
              <div className={blockGap}>
                <Block icon={<Target className="h-3.5 w-3.5" />} label="Objetivos da campanha" value={campaign?.campaign_objectives} labelClass={labelBase} textClass={textBase} />
                <Block icon={<TrendingUp className="h-3.5 w-3.5" />} label="Progressão esperada" value={campaign?.progression_expectation} labelClass={labelBase} textClass={textBase} />
                <Block icon={<Swords className="h-3.5 w-3.5" />} label="Regras da casa" value={campaign?.house_rules} labelClass={labelBase} textClass={textBase} />
                <Block icon={<Swords className="h-3.5 w-3.5" />} label="Combate" value={campaign?.combat_rules} labelClass={labelBase} textClass={textBase} />
                <Block icon={<UserX className="h-3.5 w-3.5" />} label="PvP" value={campaign?.pvp_rules} labelClass={labelBase} textClass={textBase} />
              </div>
            </Section>

            <Separator />

            {/* Segurança */}
            <Section
              title="Segurança na mesa"
              icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
              easyRead={easyRead}
              note="Linhas e véus indicam temas que devem ser evitados ou tratados com cuidado durante a sessão."
            >
              <div className={blockGap}>
                <Block label="Linhas (temas proibidos)" value={campaign?.safety_lines} labelClass={labelBase} textClass={textBase} highlight="destructive" />
                <Block label="Véus / gatilhos" value={campaign?.safety_veils} labelClass={labelBase} textClass={textBase} highlight="destructive" />
                <Block label="Raças restritas" value={campaign?.restricted_races} labelClass={labelBase} textClass={textBase} />
                <Block label="Classes restritas" value={campaign?.restricted_classes} labelClass={labelBase} textClass={textBase} />
                <Block label="Magias restritas" value={campaign?.restricted_spells} labelClass={labelBase} textClass={textBase} />
              </div>
            </Section>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Section = ({
  title,
  icon,
  easyRead,
  note,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  easyRead: boolean;
  note?: string;
  children: React.ReactNode;
}) => (
  <section className={easyRead ? "space-y-3" : "space-y-2"}>
    <h3 className={`flex items-center gap-2 font-semibold ${easyRead ? "text-lg" : "text-base"}`}>
      {icon}
      {title}
    </h3>
    {note && (
      <p className={`text-xs text-muted-foreground italic ${easyRead ? "text-sm" : ""}`}>{note}</p>
    )}
    {children}
  </section>
);

const Block = ({
  icon,
  label,
  value,
  labelClass,
  textClass,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  labelClass: string;
  textClass: string;
  highlight?: "destructive";
}) => {
  const hasValue = !!(value && value.trim());
  return (
    <div
      className={`rounded-md border px-3 py-2.5 ${
        highlight === "destructive" && hasValue
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-background/40"
      }`}
    >
      <div className={`flex items-center gap-1.5 mb-1 ${labelClass}`}>
        {icon}
        {label}
      </div>
      <p className={`whitespace-pre-wrap text-foreground/90 ${textClass}`}>
        {hasValue ? value : <span className="italic text-muted-foreground">Não definido.</span>}
      </p>
    </div>
  );
};

const Pill = ({
  icon,
  label,
  value,
  easyRead,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  easyRead: boolean;
}) => (
  <div className="rounded-md border border-border bg-background/40 px-3 py-2">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className={`font-medium mt-0.5 ${easyRead ? "text-base" : "text-sm"}`}>
      {value && value.trim() ? value : <span className="italic text-muted-foreground">—</span>}
    </p>
  </div>
);

export default FullRulesDialog;