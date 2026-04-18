import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface WeekdaySelectorProps {
  value: string[]; // e.g. ["Sáb", "Dom"]
  onChange: (value: string[]) => void;
  label?: string;
}

const DAYS = [
  { short: "Seg", full: "Segunda" },
  { short: "Ter", full: "Terça" },
  { short: "Qua", full: "Quarta" },
  { short: "Qui", full: "Quinta" },
  { short: "Sex", full: "Sexta" },
  { short: "Sáb", full: "Sábado" },
  { short: "Dom", full: "Domingo" },
];

export const WeekdaySelector = ({ value, onChange, label = "Dias da semana" }: WeekdaySelectorProps) => {
  const toggle = (short: string) => {
    if (value.includes(short)) {
      onChange(value.filter((d) => d !== short));
    } else {
      // keep order canonical (Seg → Dom)
      const next = [...value, short];
      onChange(DAYS.map((d) => d.short).filter((d) => next.includes(d)));
    }
  };

  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {DAYS.map((d) => {
          const active = value.includes(d.short);
          return (
            <button
              key={d.short}
              type="button"
              onClick={() => toggle(d.short)}
              title={d.full}
              className={cn(
                "min-w-10 h-10 px-2 rounded-md text-xs font-semibold border transition-all",
                active
                  ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_hsl(var(--cavern-gold)/0.4)]"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
            >
              {d.short}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Helpers to compose / parse "DaysLabel, HH:MM" stored in schedule_time
export const WEEKDAY_SHORTS = DAYS.map((d) => d.short);

export const composeSchedule = (days: string[], time: string): string => {
  const label = formatDaysLabel(days);
  if (!label && !time) return "";
  if (!label) return time;
  if (!time) return label;
  return `${label}, ${time}`;
};

export const parseSchedule = (raw: string): { days: string[]; time: string } => {
  if (!raw) return { days: [], time: "" };
  // Match trailing HH:MM
  const timeMatch = raw.match(/(\d{1,2}:\d{2})\s*$/);
  const time = timeMatch ? timeMatch[1] : "";
  const labelPart = timeMatch ? raw.slice(0, raw.lastIndexOf(timeMatch[1])).replace(/[,\\s]+$/, "").trim() : raw.trim();
  const days = WEEKDAY_SHORTS.filter((s) => new RegExp(`\\b${s}`, "i").test(labelPart));
  return { days, time };
};

const PLURALS: Record<string, string> = {
  Seg: "Segundas",
  Ter: "Terças",
  Qua: "Quartas",
  Qui: "Quintas",
  Sex: "Sextas",
  Sáb: "Sábados",
  Dom: "Domingos",
};

export const formatDaysLabel = (days: string[]): string => {
  if (!days.length) return "";
  if (days.length === 1) return PLURALS[days[0]] || days[0];
  if (days.length === 7) return "Todos os dias";
  if (days.length <= 3) return days.map((d) => PLURALS[d] || d).join(" e ");
  return days.join("/");
};
