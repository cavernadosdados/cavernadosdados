import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ImageCropUpload } from "@/components/ImageCropUpload";
import { MasterPrepSection } from "@/components/worldbuilding/MasterPrepSection";
import { LoreDetailsDialog } from "@/components/worldbuilding/LoreDetailsDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  MapPin,
  Flag,
  Gem,
  Clock3,
  BookMarked,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUp,
  ArrowDown,
  Skull,
  HeartPulse,
  HelpCircle,
  GripVertical,
  X,
  ClipboardList,
  Loader2,
  Wand2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type AnyRow = Record<string, any>;

/* ===========================================================
 * AI Generator (shared)
 * =========================================================== */

type LoreAiType = "npc" | "location" | "faction" | "deity" | "item";

async function fetchTableContext(tableId: string) {
  const { data } = await supabase
    .from("tables")
    .select("title,description,system,theme")
    .eq("id", tableId)
    .maybeSingle();
  return data || {};
}

function AiGenerateBar({
  type,
  tableId,
  onApply,
}: {
  type: LoreAiType;
  tableId: string;
  onApply: (result: Record<string, any>) => void;
}) {
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const ctx = await fetchTableContext(tableId);
      const res = await supabase.functions.invoke("generate-lore-suggestion", {
        body: {
          type,
          table_title: (ctx as any).title,
          table_description: (ctx as any).description,
          system: (ctx as any).system,
          theme: (ctx as any).theme,
          hint: hint.trim() || undefined,
        },
      });
      if (res.error) throw res.error;
      if ((res.data as any)?.error) throw new Error((res.data as any).error);
      const result = (res.data as any)?.result;
      if (!result || typeof result !== "object") throw new Error("Resposta inválida da IA");
      onApply(result);
      toast({ title: "✨ Sugestão gerada!", description: "Revise antes de salvar." });
    } catch (err: any) {
      toast({ title: "Erro na IA", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-[hsl(var(--cavern-gold))]/30 bg-[hsl(var(--cavern-gold))]/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--cavern-gold))]">
        <Wand2 className="h-3.5 w-3.5" /> Gerar com IA (opcional)
      </div>
      <div className="flex gap-2">
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Tema/dica curta (opcional)"
          className="h-9 bg-background/60 text-xs"
        />
        <Button
          type="button"
          size="sm"
          onClick={generate}
          disabled={loading}
          className="gap-1 bg-gradient-to-r from-[hsl(var(--cavern-gold))] to-[hsl(var(--cavern-copper))] text-background hover:opacity-90 border-0 shrink-0"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Gerar
        </Button>
      </div>
    </div>
  );
}

interface Props {
  tableId: string;
  isMaster: boolean;
}

const NPC_STATUSES = [
  { value: "alive", label: "Vivo", icon: HeartPulse, className: "text-emerald-500" },
  { value: "dead", label: "Morto", icon: Skull, className: "text-destructive" },
  { value: "missing", label: "Desaparecido", icon: HelpCircle, className: "text-amber-500" },
];

const LOCATION_KINDS = [
  { value: "city", label: "Cidade" },
  { value: "dungeon", label: "Masmorra" },
  { value: "region", label: "Região" },
  { value: "landmark", label: "Marco" },
  { value: "other", label: "Outro" },
];

const ITEM_STATUSES = [
  { value: "unknown", label: "Desconhecido" },
  { value: "found", label: "Encontrado" },
  { value: "lost", label: "Perdido" },
  { value: "destroyed", label: "Destruído" },
];

function useLore<T = AnyRow>(table: string, tableId: string, orderBy = "created_at", asc = false) {
  return useQuery({
    queryKey: [table, tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("table_id", tableId)
        .order(orderBy, { ascending: asc });
      if (error) throw error;
      return (data ?? []) as T[];
    },
    enabled: !!tableId,
  });
}

export function WorldbuildingTab({ tableId, isMaster }: Props) {
  return (
    <div className="space-y-4">
      <Accordion
        type="multiple"
        defaultValue={["npcs"]}
        className="w-full space-y-2"
      >
        <LoreAccordionItem value="npcs" icon={<Users className="h-4 w-4" />} label="NPCs">
          <NpcsSection tableId={tableId} isMaster={isMaster} />
        </LoreAccordionItem>
        <LoreAccordionItem value="locations" icon={<MapPin className="h-4 w-4" />} label="Locais">
          <LocationsSection tableId={tableId} isMaster={isMaster} />
        </LoreAccordionItem>
        <LoreAccordionItem value="factions" icon={<Flag className="h-4 w-4" />} label="Facções">
          <FactionsSection tableId={tableId} isMaster={isMaster} />
        </LoreAccordionItem>
        <LoreAccordionItem value="deities" icon={<Sparkles className="h-4 w-4" />} label="Panteão">
          <DeitiesSection tableId={tableId} isMaster={isMaster} />
        </LoreAccordionItem>
        <LoreAccordionItem value="items" icon={<Gem className="h-4 w-4" />} label="Itens lendários">
          <ItemsSection tableId={tableId} isMaster={isMaster} />
        </LoreAccordionItem>
        <LoreAccordionItem value="timeline" icon={<Clock3 className="h-4 w-4" />} label="Linha do Tempo">
          <TimelineSection tableId={tableId} isMaster={isMaster} />
        </LoreAccordionItem>
        <LoreAccordionItem value="codex" icon={<BookMarked className="h-4 w-4" />} label="Códex">
          <CodexSection tableId={tableId} isMaster={isMaster} />
        </LoreAccordionItem>
        {isMaster && (
          <LoreAccordionItem value="prep" icon={<ClipboardList className="h-4 w-4" />} label="Prep do Mestre">
            <MasterPrepSection tableId={tableId} />
          </LoreAccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function LoreAccordionItem({
  value,
  icon,
  label,
  children,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="border border-border rounded-lg bg-card/40 overflow-hidden"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/60 [&[data-state=open]]:bg-card/60">
        <span className="flex items-center gap-2 text-base font-semibold text-[hsl(var(--cavern-gold))]">
          {icon}
          {label}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-2">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

/* ===========================================================
 * Shared helpers
 * =========================================================== */

function SectionHeader({
  title,
  description,
  count,
  onAdd,
  isMaster,
  search,
  setSearch,
}: {
  title: string;
  description: string;
  count: number;
  onAdd?: () => void;
  isMaster: boolean;
  search: string;
  setSearch: (s: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
      <div>
        <h3 className="text-lg font-bold glow-gold">
          {title} <span className="text-muted-foreground font-normal text-sm">({count})</span>
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-9 w-44 sm:w-56 bg-background/50"
          />
        </div>
        {isMaster && onAdd && (
          <Button size="sm" onClick={onAdd} className="gap-1">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed border-border bg-card/40">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

/* ===========================================================
 * NPCs
 * =========================================================== */

function NpcsSection({ tableId, isMaster }: Props) {
  const qc = useQueryClient();
  const { data = [] } = useLore("lore_npcs", tableId);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AnyRow | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(
      (n: AnyRow) =>
        !s ||
        n.name?.toLowerCase().includes(s) ||
        n.faction?.toLowerCase().includes(s) ||
        n.description?.toLowerCase().includes(s),
    );
  }, [data, search]);

  const remove = async (id: string) => {
    if (!confirm("Remover este NPC?")) return;
    const { error } = await supabase.from("lore_npcs").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["lore_npcs", tableId] });
  };

  return (
    <div>
      <SectionHeader
        title="NPCs"
        description="Personagens importantes do mundo, suas facções e relações."
        count={data.length}
        isMaster={isMaster}
        search={search}
        setSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />

      {filtered.length === 0 ? (
        <EmptyState>
          Nenhum NPC ainda. {isMaster && "Adicione o primeiro com o botão acima."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n: AnyRow) => {
            const status = NPC_STATUSES.find((s) => s.value === n.status) ?? NPC_STATUSES[0];
            const StatusIcon = status.icon;
            return (
              <Card
                key={n.id}
                onClick={() => setViewing(n)}
                className="border-border bg-card/60 group cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border border-primary/30">
                      <AvatarImage src={n.portrait_url || undefined} alt={n.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {n.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{n.name}</div>
                      <div className="flex items-center gap-1 text-xs">
                        <StatusIcon className={`h-3 w-3 ${status.className}`} />
                        <span className={status.className}>{status.label}</span>
                      </div>
                      {n.faction && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {n.faction}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {n.relationship && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Relação: </span>
                      <span className="text-foreground">{n.relationship}</span>
                    </div>
                  )}
                  {n.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {n.description}
                    </p>
                  )}
                  {isMaster && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(n);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Remover
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NpcDialog
        open={open}
        onOpenChange={setOpen}
        tableId={tableId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lore_npcs", tableId] })}
      />
      {viewing && (
        <LoreDetailsDialog
          open={!!viewing}
          onOpenChange={(v) => !v && setViewing(null)}
          title={viewing.name}
          subtitle="NPC"
          imageUrl={viewing.portrait_url}
          badges={[
            ...(viewing.faction ? [{ label: viewing.faction }] : []),
            (() => {
              const s = NPC_STATUSES.find((x) => x.value === viewing.status) ?? NPC_STATUSES[0];
              return { label: s.label, className: s.className };
            })(),
          ]}
          fields={[
            { label: "Facção", value: viewing.faction },
            { label: "Relação com o grupo", value: viewing.relationship },
          ]}
          description={viewing.description}
          isMaster={isMaster}
          onEdit={() => {
            setEditing(viewing);
            setOpen(true);
          }}
          onDelete={() => remove(viewing.id)}
        />
      )}
    </div>
  );
}

function NpcDialog({
  open,
  onOpenChange,
  tableId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableId: string;
  editing: AnyRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnyRow>({
    name: "",
    faction: "",
    status: "alive",
    relationship: "",
    description: "",
    portrait_url: "",
  });
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setForm(
      editing ?? {
        name: "",
        faction: "",
        status: "alive",
        relationship: "",
        description: "",
        portrait_url: "",
      },
    );
  }, [editing, open]);

  const save = async () => {
    if (!form.name?.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    setSaving(true);
    const payload = { ...form, table_id: tableId };
    const { error } = editing
      ? await supabase.from("lore_npcs").update(payload as any).eq("id", editing.id)
      : await supabase.from("lore_npcs").insert([payload as any]);
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo!" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar NPC" : "Novo NPC"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!editing && (
            <AiGenerateBar
              type="npc"
              tableId={tableId}
              onApply={(r) =>
                setForm((f) => ({
                  ...f,
                  name: r.name ?? f.name,
                  faction: r.faction ?? f.faction,
                  status: ["alive", "dead", "missing"].includes(r.status) ? r.status : f.status,
                  relationship: r.relationship ?? f.relationship,
                  description: r.description ?? f.description,
                }))
              }
            />
          )}
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Facção</Label>
              <Input
                value={form.faction}
                onChange={(e) => setForm({ ...form, faction: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NPC_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Relação com o grupo</Label>
            <Input
              value={form.relationship}
              placeholder="Ex: Aliado, Rival, Mentor..."
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
            />
          </div>
          <ImageCropUpload
            value={form.portrait_url || ""}
            onChange={(v) => setForm({ ...form, portrait_url: v })}
            label="Retrato do NPC"
            placeholder="https://..."
            aspectRatio={1}
          />
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
 * Deities (Panteão)
 * =========================================================== */

const ALIGNMENTS = [
  "Leal e Bom", "Neutro e Bom", "Caótico e Bom",
  "Leal e Neutro", "Neutro", "Caótico e Neutro",
  "Leal e Mau", "Neutro e Mau", "Caótico e Mau",
];

function DeitiesSection({ tableId, isMaster }: Props) {
  const qc = useQueryClient();
  const { data = [] } = useLore("lore_deities", tableId, "name", true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AnyRow | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(
      (d: AnyRow) =>
        !s ||
        d.name?.toLowerCase().includes(s) ||
        d.domain?.toLowerCase().includes(s) ||
        d.alignment?.toLowerCase().includes(s),
    );
  }, [data, search]);

  const remove = async (id: string) => {
    if (!confirm("Remover este deus?")) return;
    const { error } = await supabase.from("lore_deities" as any).delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["lore_deities", tableId] });
  };

  return (
    <div>
      <SectionHeader
        title="Panteão"
        description="Deuses, divindades e entidades veneradas no mundo."
        count={data.length}
        isMaster={isMaster}
        search={search}
        setSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState>Nenhum deus no panteão ainda.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d: AnyRow) => (
            <Card
              key={d.id}
              onClick={() => setViewing(d)}
              className="border-border bg-card/60 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 border border-primary/30">
                    <AvatarImage src={d.symbol_url || undefined} alt={d.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Sparkles className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{d.name}</div>
                    {d.alignment && (
                      <div className="text-xs text-muted-foreground">{d.alignment}</div>
                    )}
                    {d.domain && (
                      <Badge variant="outline" className="mt-1 text-xs">{d.domain}</Badge>
                    )}
                  </div>
                </div>
                {d.description && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                    {d.description}
                  </p>
                )}
                {isMaster && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm" variant="ghost" className="h-7 px-2 text-xs"
                      onClick={(e) => { e.stopPropagation(); setEditing(d); setOpen(true); }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); remove(d.id); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remover
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <DeityDialog
        open={open}
        onOpenChange={setOpen}
        tableId={tableId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lore_deities", tableId] })}
      />
      {viewing && (
        <LoreDetailsDialog
          open={!!viewing}
          onOpenChange={(v) => !v && setViewing(null)}
          title={viewing.name}
          subtitle="Divindade"
          imageUrl={viewing.symbol_url}
          imageFallback={<Sparkles className="h-6 w-6" />}
          badges={[
            ...(viewing.domain ? [{ label: viewing.domain }] : []),
            ...(viewing.alignment ? [{ label: viewing.alignment }] : []),
          ]}
          fields={[
            { label: "Domínio", value: viewing.domain },
            { label: "Alinhamento", value: viewing.alignment },
          ]}
          description={viewing.description}
          isMaster={isMaster}
          onEdit={() => { setEditing(viewing); setOpen(true); }}
          onDelete={() => remove(viewing.id)}
        />
      )}
    </div>
  );
}

function DeityDialog({
  open, onOpenChange, tableId, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableId: string;
  editing: AnyRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnyRow>({
    name: "", alignment: "", domain: "", symbol_url: "", description: "",
  });
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setForm(editing ?? { name: "", alignment: "", domain: "", symbol_url: "", description: "" });
  }, [editing, open]);

  const save = async () => {
    if (!form.name?.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    setSaving(true);
    const payload = { ...form, table_id: tableId };
    const { error } = editing
      ? await supabase.from("lore_deities" as any).update(payload as any).eq("id", editing.id)
      : await supabase.from("lore_deities" as any).insert([payload as any]);
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo!" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Deus" : "Novo Deus"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!editing && (
            <AiGenerateBar
              type="deity"
              tableId={tableId}
              onApply={(r) =>
                setForm((f) => ({
                  ...f,
                  name: r.name ?? f.name,
                  alignment: ALIGNMENTS.includes(r.alignment) ? r.alignment : f.alignment,
                  domain: r.domain ?? f.domain,
                  description: r.description ?? f.description,
                }))
              }
            />
          )}
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tendência</Label>
              <Select
                value={form.alignment || undefined}
                onValueChange={(v) => setForm({ ...form, alignment: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ALIGNMENTS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Domínio</Label>
              <Input
                value={form.domain}
                placeholder="Ex: Guerra, Conhecimento..."
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
              />
            </div>
          </div>
          <ImageCropUpload
            value={form.symbol_url || ""}
            onChange={(v) => setForm({ ...form, symbol_url: v })}
            label="Símbolo do deus"
            placeholder="https://..."
            aspectRatio={1}
          />
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
 * Locations
 * =========================================================== */

function LocationsSection({ tableId, isMaster }: Props) {
  const qc = useQueryClient();
  const { data = [] } = useLore("lore_locations", tableId);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AnyRow | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(
      (l: AnyRow) =>
        !s || l.name?.toLowerCase().includes(s) || l.description?.toLowerCase().includes(s),
    );
  }, [data, search]);

  const remove = async (id: string) => {
    if (!confirm("Remover este local?")) return;
    const { error } = await supabase.from("lore_locations").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["lore_locations", tableId] });
  };

  return (
    <div>
      <SectionHeader
        title="Locais"
        description="Cidades, masmorras, regiões e marcos do mundo."
        count={data.length}
        isMaster={isMaster}
        search={search}
        setSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState>Nenhum local cadastrado.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((l: AnyRow) => {
            const kind = LOCATION_KINDS.find((k) => k.value === l.kind) ?? LOCATION_KINDS[0];
            return (
              <Card
                key={l.id}
                onClick={() => setViewing(l)}
                className="border-border bg-card/60 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <CardContent className="p-4 space-y-3">
                  {l.map_url && (
                    <img
                      src={l.map_url}
                      alt={l.name}
                      className="rounded-md w-full max-h-48 object-cover border border-border"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" /> {l.name}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {kind.label}
                      </Badge>
                    </div>
                  </div>
                  {l.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {l.description}
                    </p>
                  )}
                  {isMaster && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(l);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(l.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Remover
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <LocationDialog
        open={open}
        onOpenChange={setOpen}
        tableId={tableId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lore_locations", tableId] })}
      />
      {viewing && (
        <LoreDetailsDialog
          open={!!viewing}
          onOpenChange={(v) => !v && setViewing(null)}
          title={viewing.name}
          subtitle="Local"
          icon={<MapPin className="h-5 w-5 text-primary" />}
          imageUrl={viewing.map_url}
          imageMode="wide"
          badges={[
            (() => {
              const k = LOCATION_KINDS.find((x) => x.value === viewing.kind) ?? LOCATION_KINDS[0];
              return { label: k.label };
            })(),
          ]}
          fields={[{ label: "Tipo", value: (LOCATION_KINDS.find((x) => x.value === viewing.kind) ?? LOCATION_KINDS[0]).label }]}
          description={viewing.description}
          isMaster={isMaster}
          onEdit={() => { setEditing(viewing); setOpen(true); }}
          onDelete={() => remove(viewing.id)}
        />
      )}
    </div>
  );
}

function LocationDialog({
  open,
  onOpenChange,
  tableId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableId: string;
  editing: AnyRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnyRow>({
    name: "",
    kind: "city",
    description: "",
    map_url: "",
  });
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setForm(editing ?? { name: "", kind: "city", description: "", map_url: "" });
  }, [editing, open]);

  const save = async () => {
    if (!form.name?.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    setSaving(true);
    const payload = { ...form, table_id: tableId };
    const { error } = editing
      ? await supabase.from("lore_locations").update(payload as any).eq("id", editing.id)
      : await supabase.from("lore_locations").insert([payload as any]);
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Local" : "Novo Local"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!editing && (
            <AiGenerateBar
              type="location"
              tableId={tableId}
              onApply={(r) =>
                setForm((f) => ({
                  ...f,
                  name: r.name ?? f.name,
                  kind: ["city", "dungeon", "region", "landmark", "other"].includes(r.kind)
                    ? r.kind
                    : f.kind,
                  description: r.description ?? f.description,
                }))
              }
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ImageCropUpload
            value={form.map_url || ""}
            onChange={(v) => setForm({ ...form, map_url: v })}
            label="Mapa / Imagem do local"
            placeholder="https://..."
            aspectRatio={16 / 9}
          />
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
 * Factions (with reputation meter)
 * =========================================================== */

function reputationLabel(rep: number) {
  if (rep >= 75) return { label: "Aliado leal", className: "text-emerald-500" };
  if (rep >= 25) return { label: "Amistoso", className: "text-emerald-400" };
  if (rep >= -24) return { label: "Neutro", className: "text-muted-foreground" };
  if (rep >= -74) return { label: "Hostil", className: "text-amber-500" };
  return { label: "Inimigo jurado", className: "text-destructive" };
}

function FactionsSection({ tableId, isMaster }: Props) {
  const qc = useQueryClient();
  const { data = [] } = useLore("lore_factions", tableId);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AnyRow | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter((f: AnyRow) => !s || f.name?.toLowerCase().includes(s));
  }, [data, search]);

  const updateRep = async (id: string, delta: number, current: number) => {
    const next = Math.max(-100, Math.min(100, current + delta));
    const { error } = await supabase.from("lore_factions").update({ reputation: next }).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["lore_factions", tableId] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta facção?")) return;
    const { error } = await supabase.from("lore_factions").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["lore_factions", tableId] });
  };

  return (
    <div>
      <SectionHeader
        title="Facções"
        description="Grupos do mundo e o nível de reputação do grupo com cada um."
        count={data.length}
        isMaster={isMaster}
        search={search}
        setSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState>Nenhuma facção cadastrada.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((f: AnyRow) => {
            const rep = f.reputation ?? 0;
            const tier = reputationLabel(rep);
            const pct = ((rep + 100) / 200) * 100;
            return (
              <Card
                key={f.id}
                onClick={() => setViewing(f)}
                className="border-border bg-card/60 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border border-primary/30">
                      <AvatarImage src={f.symbol_url || undefined} alt={f.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Flag className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{f.name}</div>
                      <div className={`text-xs font-medium ${tier.className}`}>{tier.label}</div>
                    </div>
                  </div>
                  {f.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {f.description}
                    </p>
                  )}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Reputação</span>
                      <span className="font-mono font-semibold">{rep > 0 ? `+${rep}` : rep}</span>
                    </div>
                    <div className="h-2 rounded-full bg-background/60 border border-border overflow-hidden relative">
                      <div
                        className="absolute top-0 bottom-0 left-1/2 w-px bg-border z-10"
                        aria-hidden
                      />
                      <div
                        className={`h-full transition-all ${
                          rep >= 0 ? "bg-emerald-500/70" : "bg-destructive/70"
                        }`}
                        style={{
                          marginLeft: rep >= 0 ? "50%" : `${pct}%`,
                          width: `${Math.abs(rep) / 2}%`,
                        }}
                      />
                    </div>
                  </div>
                  {isMaster && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => { e.stopPropagation(); updateRep(f.id, -10, rep); }}
                      >
                        <ArrowDown className="h-3 w-3 mr-1" /> -10
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => { e.stopPropagation(); updateRep(f.id, 10, rep); }}
                      >
                        <ArrowUp className="h-3 w-3 mr-1" /> +10
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(f);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); remove(f.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <FactionDialog
        open={open}
        onOpenChange={setOpen}
        tableId={tableId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lore_factions", tableId] })}
      />
      {viewing && (() => {
        const rep = viewing.reputation ?? 0;
        const tier = reputationLabel(rep);
        return (
          <LoreDetailsDialog
            open={!!viewing}
            onOpenChange={(v) => !v && setViewing(null)}
            title={viewing.name}
            subtitle="Facção"
            icon={<Flag className="h-5 w-5 text-primary" />}
            imageUrl={viewing.symbol_url}
            imageFallback={<Flag className="h-6 w-6" />}
            badges={[{ label: tier.label, className: tier.className }]}
            fields={[
              { label: "Reputação", value: rep > 0 ? `+${rep}` : rep, mono: true },
              { label: "Status", value: tier.label },
            ]}
            description={viewing.description}
            isMaster={isMaster}
            onEdit={() => { setEditing(viewing); setOpen(true); }}
            onDelete={() => remove(viewing.id)}
          />
        );
      })()}
    </div>
  );
}

function FactionDialog({
  open,
  onOpenChange,
  tableId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableId: string;
  editing: AnyRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnyRow>({
    name: "",
    description: "",
    symbol_url: "",
    reputation: 0,
  });
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setForm(editing ?? { name: "", description: "", symbol_url: "", reputation: 0 });
  }, [editing, open]);

  const save = async () => {
    if (!form.name?.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    setSaving(true);
    const payload = {
      ...form,
      reputation: Number(form.reputation) || 0,
      table_id: tableId,
    };
    const { error } = editing
      ? await supabase.from("lore_factions").update(payload as any).eq("id", editing.id)
      : await supabase.from("lore_factions").insert([payload as any]);
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Facção" : "Nova Facção"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!editing && (
            <AiGenerateBar
              type="faction"
              tableId={tableId}
              onApply={(r) =>
                setForm((f) => ({
                  ...f,
                  name: r.name ?? f.name,
                  description: r.description ?? f.description,
                  reputation:
                    typeof r.reputation === "number"
                      ? Math.max(-100, Math.min(100, r.reputation))
                      : f.reputation,
                }))
              }
            />
          )}
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>URL do símbolo</Label>
            <Input
              value={form.symbol_url}
              placeholder="https://..."
              onChange={(e) => setForm({ ...form, symbol_url: e.target.value })}
            />
          </div>
          <div>
            <Label>Reputação inicial (-100 a 100)</Label>
            <Input
              type="number"
              min={-100}
              max={100}
              value={form.reputation}
              onChange={(e) => setForm({ ...form, reputation: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
 * Items
 * =========================================================== */

function ItemsSection({ tableId, isMaster }: Props) {
  const qc = useQueryClient();
  const { data = [] } = useLore("lore_items", tableId);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AnyRow | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(
      (i: AnyRow) =>
        !s || i.name?.toLowerCase().includes(s) || i.holder?.toLowerCase().includes(s),
    );
  }, [data, search]);

  const remove = async (id: string) => {
    if (!confirm("Remover este item?")) return;
    const { error } = await supabase.from("lore_items").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["lore_items", tableId] });
  };

  return (
    <div>
      <SectionHeader
        title="Itens lendários"
        description="Artefatos e objetos importantes rastreados pela campanha."
        count={data.length}
        isMaster={isMaster}
        search={search}
        setSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState>Nenhum item cadastrado.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {filtered.map((i: AnyRow) => {
            const status = ITEM_STATUSES.find((s) => s.value === i.status) ?? ITEM_STATUSES[0];
            return (
              <Card
                key={i.id}
                onClick={() => setViewing(i)}
                className="border-border bg-card/60 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Gem className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{i.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {status.label}
                        </Badge>
                        {i.holder && (
                          <span className="text-xs text-muted-foreground">
                            • Em poder de <strong>{i.holder}</strong>
                          </span>
                        )}
                      </div>
                      {i.description && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                          {i.description}
                        </p>
                      )}
                    </div>
                    {isMaster && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(i);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); remove(i.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ItemDialog
        open={open}
        onOpenChange={setOpen}
        tableId={tableId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lore_items", tableId] })}
      />
      {viewing && (() => {
        const status = ITEM_STATUSES.find((s) => s.value === viewing.status) ?? ITEM_STATUSES[0];
        return (
          <LoreDetailsDialog
            open={!!viewing}
            onOpenChange={(v) => !v && setViewing(null)}
            title={viewing.name}
            subtitle="Item lendário"
            icon={<Gem className="h-5 w-5 text-primary" />}
            badges={[{ label: status.label }]}
            fields={[
              { label: "Status", value: status.label },
              { label: "Em poder de", value: viewing.holder },
            ]}
            description={viewing.description}
            isMaster={isMaster}
            onEdit={() => { setEditing(viewing); setOpen(true); }}
            onDelete={() => remove(viewing.id)}
          />
        );
      })()}
    </div>
  );
}

function ItemDialog({
  open,
  onOpenChange,
  tableId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableId: string;
  editing: AnyRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnyRow>({
    name: "",
    description: "",
    status: "unknown",
    holder: "",
  });
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setForm(editing ?? { name: "", description: "", status: "unknown", holder: "" });
  }, [editing, open]);

  const save = async () => {
    if (!form.name?.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    setSaving(true);
    const payload = { ...form, table_id: tableId };
    const { error } = editing
      ? await supabase.from("lore_items").update(payload as any).eq("id", editing.id)
      : await supabase.from("lore_items").insert([payload as any]);
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Item" : "Novo Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!editing && (
            <AiGenerateBar
              type="item"
              tableId={tableId}
              onApply={(r) =>
                setForm((f) => ({
                  ...f,
                  name: r.name ?? f.name,
                  status: ["unknown", "found", "lost", "destroyed"].includes(r.status)
                    ? r.status
                    : f.status,
                  holder: r.holder ?? f.holder,
                  description: r.description ?? f.description,
                }))
              }
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Em poder de</Label>
            <Input
              value={form.holder}
              placeholder="Personagem, NPC ou local..."
              onChange={(e) => setForm({ ...form, holder: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
 * Timeline
 * =========================================================== */

function TimelineSection({ tableId, isMaster }: Props) {
  const qc = useQueryClient();
  const { data = [] } = useLore("lore_timeline", tableId, "event_order", true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AnyRow | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [orderMin, setOrderMin] = useState<string>("");
  const [orderMax, setOrderMax] = useState<string>("");
  const [items, setItems] = useState<AnyRow[]>([]);

  // Sync local DnD items with query data
  useEffect(() => {
    setItems(data as AnyRow[]);
  }, [data]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const d = dateFilter.toLowerCase();
    const min = orderMin === "" ? -Infinity : Number(orderMin);
    const max = orderMax === "" ? Infinity : Number(orderMax);
    return items.filter((e: AnyRow) => {
      if (s && !(e.title?.toLowerCase().includes(s) || e.description?.toLowerCase().includes(s)))
        return false;
      if (d && !(e.event_date ?? "").toLowerCase().includes(d)) return false;
      const ord = Number(e.event_order ?? 0);
      if (ord < min || ord > max) return false;
      return true;
    });
  }, [items, search, dateFilter, orderMin, orderMax]);

  const hasFilters =
    !!search || !!dateFilter || orderMin !== "" || orderMax !== "";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered: AnyRow[] = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({
      ...(it as AnyRow),
      event_order: (idx + 1) * 10,
    }));
    setItems(reordered); // optimistic
    const updates = reordered.map((it) =>
      supabase
        .from("lore_timeline")
        .update({ event_order: it.event_order })
        .eq("id", it.id),
    );
    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      toast({ title: "Erro ao reordenar", description: firstError.message, variant: "destructive" });
    }
    qc.invalidateQueries({ queryKey: ["lore_timeline", tableId] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este evento?")) return;
    const { error } = await supabase.from("lore_timeline").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["lore_timeline", tableId] });
  };

  return (
    <div>
      <SectionHeader
        title="Linha do tempo"
        description="Eventos importantes da campanha. Mestre pode arrastar para reordenar."
        count={items.length}
        isMaster={isMaster}
        search={search}
        setSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />

      {/* Filtros */}
      <Card className="border-border bg-card/40 mb-4">
        <CardContent className="p-3 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Filtrar por data (texto)</Label>
            <Input
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Ex: Era 3, ano 412"
              className="h-9 bg-background/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ordem mín</Label>
            <Input
              type="number"
              value={orderMin}
              onChange={(e) => setOrderMin(e.target.value)}
              placeholder="0"
              className="h-9 w-24 bg-background/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ordem máx</Label>
            <Input
              type="number"
              value={orderMax}
              onChange={(e) => setOrderMax(e.target.value)}
              placeholder="∞"
              className="h-9 w-24 bg-background/50"
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1"
              onClick={() => {
                setDateFilter("");
                setOrderMin("");
                setOrderMax("");
              }}
            >
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState>
          {hasFilters ? "Nenhum evento corresponde aos filtros." : "Nenhum evento registrado."}
        </EmptyState>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={filtered.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {filtered.map((e: AnyRow) => (
                <SortableTimelineItem
                  key={e.id}
                  event={e}
                  isMaster={isMaster && !hasFilters}
                  onEdit={() => {
                    setEditing(e);
                    setOpen(true);
                  }}
                  onRemove={() => remove(e.id)}
                  onView={() => setViewing(e)}
                  showEditActions={isMaster}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {isMaster && hasFilters && (
        <p className="text-[11px] text-muted-foreground mt-2 pl-6">
          Limpe os filtros para arrastar e reordenar os eventos.
        </p>
      )}
      <TimelineDialog
        open={open}
        onOpenChange={setOpen}
        tableId={tableId}
        editing={editing}
        nextOrder={(items[items.length - 1]?.event_order ?? 0) + 10}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lore_timeline", tableId] })}
      />
      {viewing && (
        <LoreDetailsDialog
          open={!!viewing}
          onOpenChange={(v) => !v && setViewing(null)}
          title={viewing.title}
          subtitle="Evento da linha do tempo"
          icon={<Clock3 className="h-5 w-5 text-primary" />}
          badges={[
            ...(viewing.event_date ? [{ label: viewing.event_date }] : []),
            { label: `Ordem ${viewing.event_order ?? 0}` },
          ]}
          fields={[
            { label: "Data", value: viewing.event_date },
            { label: "Ordem", value: viewing.event_order, mono: true },
          ]}
          description={viewing.description}
          isMaster={isMaster}
          onEdit={() => { setEditing(viewing); setOpen(true); }}
          onDelete={() => remove(viewing.id)}
        />
      )}
    </div>
  );
}

function SortableTimelineItem({
  event: e,
  isMaster,
  showEditActions,
  onEdit,
  onRemove,
  onView,
}: {
  event: AnyRow;
  isMaster: boolean;
  showEditActions: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onView: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: e.id,
    disabled: !isMaster,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto",
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute -left-[18px] top-2 h-3 w-3 rounded-full bg-primary border-2 border-background shadow-[0_0_8px_hsl(var(--cavern-gold)/0.6)]" />
      <Card
        onClick={onView}
        className={`border-border bg-card/60 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80 ${isDragging ? "ring-2 ring-primary/50" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {isMaster && (
                <button
                  type="button"
                  {...attributes}
                  {...listeners}
                  onClick={(ev) => ev.stopPropagation()}
                  className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary p-1 -ml-1 mt-0.5"
                  aria-label="Arrastar para reordenar"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {e.event_date && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {e.event_date}
                    </Badge>
                  )}
                  <span className="font-semibold">{e.title}</span>
                </div>
                {e.description && (
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                    {e.description}
                  </p>
                )}
              </div>
            </div>
            {showEditActions && (
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(ev) => { ev.stopPropagation(); onEdit(); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={(ev) => { ev.stopPropagation(); onRemove(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineDialog({
  open,
  onOpenChange,
  tableId,
  editing,
  nextOrder,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableId: string;
  editing: AnyRow | null;
  nextOrder: number;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnyRow>({
    title: "",
    description: "",
    event_date: "",
    event_order: nextOrder,
  });
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setForm(
      editing ?? { title: "", description: "", event_date: "", event_order: nextOrder },
    );
  }, [editing, open]);

  const save = async () => {
    if (!form.title?.trim()) return toast({ title: "Título obrigatório", variant: "destructive" });
    setSaving(true);
    const payload = {
      ...form,
      event_order: Number(form.event_order) || 0,
      table_id: tableId,
    };
    const { error } = editing
      ? await supabase.from("lore_timeline").update(payload as any).eq("id", editing.id)
      : await supabase.from("lore_timeline").insert([payload as any]);
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data (livre)</Label>
              <Input
                value={form.event_date}
                placeholder="Ex: Era 3, ano 412"
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.event_order}
                onChange={(e) => setForm({ ...form, event_order: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
 * Codex
 * =========================================================== */

function CodexSection({ tableId, isMaster }: Props) {
  const qc = useQueryClient();
  const { data = [] } = useLore("lore_codex", tableId, "term", true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<AnyRow | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(
      (c: AnyRow) =>
        !s || c.term?.toLowerCase().includes(s) || c.definition?.toLowerCase().includes(s),
    );
  }, [data, search]);

  const remove = async (id: string) => {
    if (!confirm("Remover esta entrada?")) return;
    const { error } = await supabase.from("lore_codex").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["lore_codex", tableId] });
  };

  return (
    <div>
      <SectionHeader
        title="Códex"
        description="Glossário pesquisável de termos, conceitos e nomes próprios do mundo."
        count={data.length}
        isMaster={isMaster}
        search={search}
        setSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState>Códex vazio.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c: AnyRow) => (
            <Card
              key={c.id}
              onClick={() => setViewing(c)}
              className="border-border bg-card/60 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <BookMarked className="h-4 w-4 text-primary" /> {c.term}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {c.definition}
                    </p>
                  </div>
                  {isMaster && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <CodexDialog
        open={open}
        onOpenChange={setOpen}
        tableId={tableId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lore_codex", tableId] })}
      />
      {viewing && (
        <LoreDetailsDialog
          open={!!viewing}
          onOpenChange={(v) => !v && setViewing(null)}
          title={viewing.term}
          subtitle="Verbete do códex"
          icon={<BookMarked className="h-5 w-5 text-primary" />}
          description={viewing.definition}
          isMaster={isMaster}
          onEdit={() => { setEditing(viewing); setOpen(true); }}
          onDelete={() => remove(viewing.id)}
        />
      )}
    </div>
  );
}

function CodexDialog({
  open,
  onOpenChange,
  tableId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableId: string;
  editing: AnyRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnyRow>({ term: "", definition: "" });
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setForm(editing ?? { term: "", definition: "" });
  }, [editing, open]);

  const save = async () => {
    if (!form.term?.trim()) return toast({ title: "Termo obrigatório", variant: "destructive" });
    setSaving(true);
    const payload = { ...form, table_id: tableId };
    const { error } = editing
      ? await supabase.from("lore_codex").update(payload as any).eq("id", editing.id)
      : await supabase.from("lore_codex").insert([payload as any]);
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar entrada" : "Nova entrada"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Termo *</Label>
            <Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
          </div>
          <div>
            <Label>Definição</Label>
            <Textarea
              rows={5}
              value={form.definition}
              onChange={(e) => setForm({ ...form, definition: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}