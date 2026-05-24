import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  MapPin,
  Flag,
  Gem,
  Clock3,
  BookMarked,
  Sparkles,
  Skull,
  HeartPulse,
  HelpCircle,
} from "lucide-react";

export type LoreKind =
  | "npc"
  | "location"
  | "faction"
  | "deity"
  | "item"
  | "timeline"
  | "codex";

type AnyRow = Record<string, any>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: LoreKind;
  item: AnyRow | null;
}

const NPC_STATUS_MAP: Record<string, { label: string; icon: any; className: string }> = {
  alive: { label: "Vivo", icon: HeartPulse, className: "text-emerald-500" },
  dead: { label: "Morto", icon: Skull, className: "text-destructive" },
  missing: { label: "Desaparecido", icon: HelpCircle, className: "text-amber-500" },
};

const LOCATION_KIND_MAP: Record<string, string> = {
  city: "Cidade",
  dungeon: "Masmorra",
  region: "Região",
  landmark: "Marco",
  other: "Outro",
};

const ITEM_STATUS_MAP: Record<string, string> = {
  unknown: "Desconhecido",
  found: "Encontrado",
  lost: "Perdido",
  destroyed: "Destruído",
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  const hasValue =
    value !== null && value !== undefined && !(typeof value === "string" && !value.trim());
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {hasValue ? value : <span className="italic text-muted-foreground">Não informado.</span>}
      </div>
    </div>
  );
}

export function LoreDetailDialog({ open, onOpenChange, kind, item }: Props) {
  if (!item) return null;

  const titleIcon =
    kind === "npc" ? <Users className="h-5 w-5 text-primary" />
    : kind === "location" ? <MapPin className="h-5 w-5 text-primary" />
    : kind === "faction" ? <Flag className="h-5 w-5 text-primary" />
    : kind === "deity" ? <Sparkles className="h-5 w-5 text-primary" />
    : kind === "item" ? <Gem className="h-5 w-5 text-primary" />
    : kind === "timeline" ? <Clock3 className="h-5 w-5 text-primary" />
    : <BookMarked className="h-5 w-5 text-primary" />;

  const title =
    kind === "codex" ? item.term :
    kind === "timeline" ? item.title :
    item.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl flex items-center gap-2">
            {titleIcon}
            <span className="truncate">{title || "Detalhes"}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Detalhes completos</DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {kind === "npc" && <NpcBody item={item} />}
          {kind === "location" && <LocationBody item={item} />}
          {kind === "faction" && <FactionBody item={item} />}
          {kind === "deity" && <DeityBody item={item} />}
          {kind === "item" && <ItemBody item={item} />}
          {kind === "timeline" && <TimelineBody item={item} />}
          {kind === "codex" && <CodexBody item={item} />}
        </div>

        <DialogFooter className="p-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NpcBody({ item }: { item: AnyRow }) {
  const status = NPC_STATUS_MAP[item.status] ?? NPC_STATUS_MAP.alive;
  const StatusIcon = status.icon;
  return (
    <>
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20 border border-primary/30">
          <AvatarImage src={item.portrait_url || undefined} alt={item.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
            {item.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${status.className}`} />
            <span className={`text-sm font-medium ${status.className}`}>{status.label}</span>
          </div>
          {item.faction && <Badge variant="outline">{item.faction}</Badge>}
        </div>
      </div>
      <Separator />
      <Field label="Relação com o grupo" value={item.relationship} />
      <Field label="Descrição" value={item.description} />
    </>
  );
}

function LocationBody({ item }: { item: AnyRow }) {
  return (
    <>
      {item.map_url && (
        <img
          src={item.map_url}
          alt={item.name}
          className="rounded-md w-full max-h-80 object-cover border border-border"
        />
      )}
      <Badge variant="outline">{LOCATION_KIND_MAP[item.kind] ?? "Outro"}</Badge>
      <Field label="Descrição" value={item.description} />
    </>
  );
}

function FactionBody({ item }: { item: AnyRow }) {
  const rep = item.reputation ?? 0;
  const pct = ((rep + 100) / 200) * 100;
  return (
    <>
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 border border-primary/30">
          <AvatarImage src={item.symbol_url || undefined} alt={item.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            <Flag className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reputação</span>
            <span className="font-mono font-semibold">{rep > 0 ? `+${rep}` : rep}</span>
          </div>
          <div className="h-2 rounded-full bg-background/60 border border-border overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border z-10" aria-hidden />
            <div
              className={`h-full transition-all ${rep >= 0 ? "bg-emerald-500/70" : "bg-destructive/70"}`}
              style={{
                marginLeft: rep >= 0 ? "50%" : `${pct}%`,
                width: `${Math.abs(rep) / 2}%`,
              }}
            />
          </div>
        </div>
      </div>
      <Separator />
      <Field label="Descrição" value={item.description} />
    </>
  );
}

function DeityBody({ item }: { item: AnyRow }) {
  return (
    <>
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20 border border-primary/30">
          <AvatarImage src={item.symbol_url || undefined} alt={item.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          {item.alignment && (
            <div className="text-sm text-muted-foreground">{item.alignment}</div>
          )}
          {item.domain && <Badge variant="outline">{item.domain}</Badge>}
        </div>
      </div>
      <Separator />
      <Field label="Descrição" value={item.description} />
    </>
  );
}

function ItemBody({ item }: { item: AnyRow }) {
  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline">{ITEM_STATUS_MAP[item.status] ?? "Desconhecido"}</Badge>
        {item.holder && (
          <span className="text-sm text-muted-foreground">
            Em poder de <strong className="text-foreground">{item.holder}</strong>
          </span>
        )}
      </div>
      <Field label="Descrição" value={item.description} />
    </>
  );
}

function TimelineBody({ item }: { item: AnyRow }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {item.event_date && (
          <Badge variant="outline" className="font-mono">{item.event_date}</Badge>
        )}
        {typeof item.event_order === "number" && (
          <span className="text-xs text-muted-foreground">Ordem: {item.event_order}</span>
        )}
      </div>
      <Field label="Descrição" value={item.description} />
    </>
  );
}

function CodexBody({ item }: { item: AnyRow }) {
  return <Field label="Definição" value={item.definition} />;
}

export default LoreDetailDialog;