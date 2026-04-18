import { useState, useRef, useEffect, useMemo } from "react";
import { Clock, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ClockTimePickerProps {
  value: string; // "HH:MM" 24h format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

type Mode = "hour" | "minute";

/**
 * Analog clock-style time picker.
 * Stores value as 24h "HH:MM" but displays in 12h with AM/PM.
 * Themed with cavern gold/dark palette.
 */
export const ClockTimePicker = ({ value, onChange, placeholder = "Selecionar horário", className }: ClockTimePickerProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("hour");
  const [keyboardMode, setKeyboardMode] = useState(false);

  // Parse current value
  const parsed = useMemo(() => {
    const m = value?.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return { h24: 19, m: 0 };
    return { h24: parseInt(m[1], 10), m: parseInt(m[2], 10) };
  }, [value]);

  const [tempH24, setTempH24] = useState(parsed.h24);
  const [tempMin, setTempMin] = useState(parsed.m);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.h24 >= 12 ? "PM" : "AM");

  useEffect(() => {
    if (open) {
      setTempH24(parsed.h24);
      setTempMin(parsed.m);
      setPeriod(parsed.h24 >= 12 ? "PM" : "AM");
      setMode("hour");
      setKeyboardMode(false);
    }
  }, [open, parsed.h24, parsed.m]);

  const display12h = () => {
    let h = tempH24 % 12;
    if (h === 0) h = 12;
    return h;
  };

  const formatDisplay = () => {
    if (!value) return placeholder;
    const m = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return value;
    return `${m[1].padStart(2, "0")}:${m[2]} (GMT-3)`;
  };

  const handleSelectHour = (hour12: number) => {
    // hour12 is 1-12 from clock face
    let h24 = hour12 % 12;
    if (period === "PM") h24 += 12;
    setTempH24(h24);
    setMode("minute");
  };

  const handleSelectMinute = (minute: number) => {
    setTempMin(minute);
  };

  const handlePeriodChange = (p: "AM" | "PM") => {
    setPeriod(p);
    let h = tempH24 % 12;
    if (p === "PM") h += 12;
    setTempH24(h);
  };

  const handleConfirm = () => {
    const hh = String(tempH24).padStart(2, "0");
    const mm = String(tempMin).padStart(2, "0");
    onChange(`${hh}:${mm}`);
    setOpen(false);
  };

  // Clock geometry
  const clockSize = 240;
  const center = clockSize / 2;
  const radius = clockSize / 2 - 24;

  // Hand position
  const handAngle = useMemo(() => {
    if (mode === "hour") {
      const h = display12h();
      return (h % 12) * 30 - 90; // 30° per hour, -90 to start at 12
    }
    return tempMin * 6 - 90; // 6° per minute
  }, [mode, tempH24, tempMin]);

  const handX = center + radius * Math.cos((handAngle * Math.PI) / 180);
  const handY = center + radius * Math.sin((handAngle * Math.PI) / 180);

  const clockRef = useRef<SVGSVGElement>(null);

  const handleClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;
    const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    const normalized = (angle + 360) % 360;

    if (mode === "hour") {
      let h = Math.round(normalized / 30);
      if (h === 0) h = 12;
      if (h > 12) h = 12;
      handleSelectHour(h);
    } else {
      const min = Math.round(normalized / 6) % 60;
      handleSelectMinute(min);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 bg-background/50 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="h-4 w-4 text-primary" />
          {formatDisplay()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 bg-card border-border shadow-[0_10px_40px_hsl(var(--cavern-gold)/0.15)]"
        align="start"
      >
        {/* Header: SELECT TIME */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">Selecionar horário</p>
        </div>

        {/* Big time display */}
        <div className="flex items-center justify-center gap-2 px-5 pb-3">
          <button
            type="button"
            onClick={() => setMode("hour")}
            className={cn(
              "flex-1 h-20 rounded-lg flex items-center justify-center text-5xl font-light tabular-nums transition-all",
              mode === "hour"
                ? "bg-primary/20 text-primary border border-primary shadow-[0_0_20px_hsl(var(--cavern-gold)/0.3)]"
                : "bg-muted text-foreground border border-border hover:bg-muted/70",
            )}
          >
            {String(display12h()).padStart(2, "0")}
          </button>
          <span className="text-5xl font-light text-muted-foreground">:</span>
          <button
            type="button"
            onClick={() => setMode("minute")}
            className={cn(
              "flex-1 h-20 rounded-lg flex items-center justify-center text-5xl font-light tabular-nums transition-all",
              mode === "minute"
                ? "bg-primary/20 text-primary border border-primary shadow-[0_0_20px_hsl(var(--cavern-gold)/0.3)]"
                : "bg-muted text-foreground border border-border hover:bg-muted/70",
            )}
          >
            {String(tempMin).padStart(2, "0")}
          </button>

          {/* AM/PM toggle */}
          <div className="flex flex-col rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handlePeriodChange("AM")}
              className={cn(
                "px-3 py-2 text-xs font-semibold transition-colors",
                period === "AM"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange("PM")}
              className={cn(
                "px-3 py-2 text-xs font-semibold transition-colors",
                period === "PM"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              PM
            </button>
          </div>
        </div>

        {/* Clock face OR keyboard input */}
        {!keyboardMode ? (
          <div className="px-5 pb-3 flex justify-center">
            <svg
              ref={clockRef}
              width={clockSize}
              height={clockSize}
              viewBox={`0 0 ${clockSize} ${clockSize}`}
              onClick={handleClockClick}
              className="cursor-pointer"
            >
              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={center - 4}
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />

              {/* Hand line + dot */}
              <line
                x1={center}
                y1={center}
                x2={handX}
                y2={handY}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
              <circle cx={center} cy={center} r={3} fill="hsl(var(--primary))" />

              {/* Selected dot */}
              <circle
                cx={handX}
                cy={handY}
                r={18}
                fill="hsl(var(--primary))"
                style={{ filter: "drop-shadow(0 0 8px hsl(var(--cavern-gold) / 0.6))" }}
              />

              {/* Numbers */}
              {mode === "hour"
                ? Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                    const angle = (n * 30 - 90) * (Math.PI / 180);
                    const x = center + radius * Math.cos(angle);
                    const y = center + radius * Math.sin(angle);
                    const isActive = n === display12h();
                    return (
                      <text
                        key={n}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="select-none pointer-events-none"
                        fill={isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}
                        fontSize="16"
                        fontWeight={isActive ? "600" : "400"}
                      >
                        {n}
                      </text>
                    );
                  })
                : Array.from({ length: 12 }, (_, i) => i * 5).map((n) => {
                    const angle = (n * 6 - 90) * (Math.PI / 180);
                    const x = center + radius * Math.cos(angle);
                    const y = center + radius * Math.sin(angle);
                    const isActive = n === tempMin;
                    return (
                      <text
                        key={n}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="select-none pointer-events-none"
                        fill={isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}
                        fontSize="14"
                        fontWeight={isActive ? "600" : "400"}
                      >
                        {String(n).padStart(2, "0")}
                      </text>
                    );
                  })}
            </svg>
          </div>
        ) : (
          <div className="px-5 pb-3 flex items-center justify-center gap-2 h-[260px]">
            <Input
              type="number"
              min={1}
              max={12}
              value={display12h()}
              onChange={(e) => {
                const h12 = Math.max(1, Math.min(12, parseInt(e.target.value || "0", 10) || 0));
                let h24 = h12 % 12;
                if (period === "PM") h24 += 12;
                setTempH24(h24);
              }}
              className="w-20 h-16 text-3xl text-center tabular-nums bg-muted"
            />
            <span className="text-3xl text-muted-foreground">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={String(tempMin).padStart(2, "0")}
              onChange={(e) => {
                const m = Math.max(0, Math.min(59, parseInt(e.target.value || "0", 10) || 0));
                setTempMin(m);
              }}
              className="w-20 h-16 text-3xl text-center tabular-nums bg-muted"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setKeyboardMode((k) => !k)}
            className="h-9 w-9 text-muted-foreground hover:text-primary"
            aria-label="Alternar entrada por teclado"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-primary">
              CANCELAR
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleConfirm} className="text-primary font-semibold">
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
