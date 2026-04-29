import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";

interface ChipSelectorProps {
  label?: string;
  chips: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: "append" | "single";
  prefix?: string;
  helperText?: string;
  showTextarea?: boolean;
  hideChipsByDefault?: boolean;
}

export function ChipSelector({
  label,
  chips,
  value,
  onChange,
  placeholder,
  mode = "append",
  prefix = "• ",
  helperText,
  showTextarea = true,
  hideChipsByDefault = true,
}: ChipSelectorProps) {
  const [showChips, setShowChips] = useState(!hideChipsByDefault);
  const isActive = (chip: string) => {
    if (mode === "single") {
      return value.trim().toLowerCase() === chip.trim().toLowerCase();
    }
    const line = `${prefix}${chip}`;
    return value
      .split("\n")
      .some((l) => l.trim().toLowerCase() === line.trim().toLowerCase());
  };

  const toggleChip = (chip: string) => {
    if (mode === "single") {
      onChange(isActive(chip) ? "" : chip);
      return;
    }
    const line = `${prefix}${chip}`;
    const lines = value ? value.split("\n") : [];
    const matchIdx = lines.findIndex(
      (l) => l.trim().toLowerCase() === line.trim().toLowerCase()
    );
    if (matchIdx >= 0) {
      lines.splice(matchIdx, 1);
    } else {
      lines.push(line);
    }
    onChange(lines.filter((l, i, arr) => !(l === "" && i === arr.length - 1)).join("\n"));
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {chips.length > 0 && (
        <button
          type="button"
          onClick={() => setShowChips((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[hsl(var(--cavern-gold))] transition-colors"
          aria-expanded={showChips}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {showChips ? "Ocultar sugestões" : "Ver sugestões"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              showChips && "rotate-180"
            )}
          />
        </button>
      )}
      {showChips && (
        <div className="flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {chips.map((chip) => {
          const active = isActive(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggleChip(chip)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 min-h-[32px]",
                "hover:scale-[1.03] active:scale-95",
                active
                  ? "bg-[hsl(var(--cavern-gold))]/20 border-[hsl(var(--cavern-gold))] text-[hsl(var(--cavern-gold))] shadow-[0_0_12px_hsl(var(--cavern-gold)/0.35)]"
                  : "bg-muted border-border text-muted-foreground hover:border-[hsl(var(--cavern-gold))]/50 hover:text-foreground"
              )}
            >
              {chip}
            </button>
          );
          })}
        </div>
      )}
      {showTextarea && mode === "append" && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] bg-background/50"
        />
      )}
      {showTextarea && mode === "single" && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}
    </div>
  );
}
