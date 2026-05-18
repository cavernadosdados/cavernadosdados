import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  Calendar,
  Lock,
  X,
  Sparkles,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface PrepNote {
  id: string;
  table_id: string;
  master_id: string;
  title: string;
  notes: string;
  checklist: ChecklistItem[];
  template: string;
  session_date: string | null;
  created_at: string;
  updated_at: string;
}

const TEMPLATES: Record<string, { label: string; checklist: string[]; notes: string }> = {
  investigation: {
    label: "Investigação",
    checklist: [
      "Definir mistério central e pistas",
      "Listar NPCs-chave e seus segredos",
      "Preparar locais de investigação",
      "Anotar pistas falsas (red herrings)",
      "Definir consequências do fracasso",
    ],
    notes: "Mistério:\n\nPistas principais:\n1.\n2.\n3.\n\nSuspeitos / NPCs:\n\nReviravolta planejada:",
  },
  combat: {
    label: "Combate",
    checklist: [
      "Estatísticas dos inimigos prontas",
      "Mapa de batalha carregado",
      "Iniciativas / ordem definida",
      "Loot e recompensas decididos",
      "Música de combate selecionada",
    ],
    notes: "Encontro:\n\nInimigos (CR / HP / habilidades):\n\nTerreno e perigos:\n\nObjetivo do combate:\n\nRecompensas:",
  },
  social: {
    label: "Social / RP",
    checklist: [
      "NPCs principais com voz e maneirismos",
      "Motivações de cada NPC anotadas",
      "Possíveis acordos e barganhas",
      "Consequências sociais mapeadas",
      "Handouts ou cartas prontos",
    ],
    notes: "Cena:\n\nNPCs envolvidos:\n\nObjetivos da cena:\n\nInformações que podem vazar:\n\nGanchos para próxima sessão:",
  },
  blank: {
    label: "Em branco",
    checklist: [],
    notes: "",
  },
};

function useMasterPrep(tableId: string) {
  return useQuery({
    queryKey: ["master_prep_notes", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_prep_notes")
        .select("*")
        .eq("table_id", tableId)
        .order("session_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PrepNote[];
    },
    enabled: !!tableId,
  });
}

interface Props {
  tableId: string;
}

export function MasterPrepSection({ tableId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: notes = [], isLoading } = useMasterPrep(tableId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PrepNote | null>(null);
  const [form, setForm] = useState({
    title: "Próxima sessão",
    notes: "",
    template: "blank",
    session_date: "",
    checklist: [] as ChecklistItem[],
  });
  const [newItem, setNewItem] = useState("");

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "Próxima sessão",
      notes: "",
      template: "blank",
      session_date: "",
      checklist: [],
    });
    setOpen(true);
  };

  const openEdit = (n: PrepNote) => {
    setEditing(n);
    setForm({
      title: n.title || "",
      notes: n.notes || "",
      template: n.template || "blank",
      session_date: n.session_date || "",
      checklist: Array.isArray(n.checklist) ? n.checklist : [],
    });
    setOpen(true);
  };

  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      template: key,
      notes: f.notes ? f.notes : tpl.notes,
      checklist:
        f.checklist.length > 0
          ? f.checklist
          : tpl.checklist.map((label, i) => ({
              id: `${Date.now()}-${i}`,
              label,
              done: false,
            })),
    }));
  };

  const addChecklistItem = () => {
    const label = newItem.trim();
    if (!label) return;
    setForm((f) => ({
      ...f,
      checklist: [...f.checklist, { id: `${Date.now()}`, label, done: false }],
    }));
    setNewItem("");
  };

  const save = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      table_id: tableId,
      master_id: user.id,
      title: form.title.trim(),
      notes: form.notes,
      checklist: form.checklist as any,
      template: form.template,
      session_date: form.session_date || null,
    };
    const { error } = editing
      ? await supabase.from("master_prep_notes").update(payload).eq("id", editing.id)
      : await supabase.from("master_prep_notes").insert(payload);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Prep atualizada" : "Prep criada" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["master_prep_notes", tableId] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta prep?")) return;
    const { error } = await supabase.from("master_prep_notes").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["master_prep_notes", tableId] });
  };

  const toggleItem = async (note: PrepNote, itemId: string) => {
    const next = (note.checklist || []).map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it,
    );
    const { error } = await supabase
      .from("master_prep_notes")
      .update({ checklist: next as any })
      .eq("id", note.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["master_prep_notes", tableId] });
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Planejamento de sessão
            </CardTitle>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Privado — somente você (mestre) vê este conteúdo.
            </p>
          </div>
          <Button onClick={openCreate} size="sm" variant="hero">
            <Plus className="h-4 w-4" /> Nova prep
          </Button>
        </CardHeader>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma prep ainda. Use um template para começar rápido.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((note) => {
            const done = (note.checklist || []).filter((i) => i.done).length;
            const total = (note.checklist || []).length;
            return (
              <Card key={note.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-base truncate">{note.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {note.session_date && (
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(note.session_date).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                        {note.template && note.template !== "blank" && TEMPLATES[note.template] && (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            {TEMPLATES[note.template].label}
                          </Badge>
                        )}
                        {total > 0 && (
                          <Badge variant="outline">
                            {done}/{total} feitos
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(note)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(note.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {note.notes && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-6">
                      {note.notes}
                    </p>
                  )}
                  {total > 0 && (
                    <ul className="space-y-1.5">
                      {(note.checklist || []).map((it) => (
                        <li key={it.id} className="flex items-start gap-2 text-sm">
                          <Checkbox
                            checked={it.done}
                            onCheckedChange={() => toggleItem(note, it.id)}
                            className="mt-0.5"
                          />
                          <span className={it.done ? "line-through text-muted-foreground" : ""}>
                            {it.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar prep" : "Nova prep de sessão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Sessão 12 — A torre cinza"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data da sessão</Label>
                <Input
                  type="date"
                  value={form.session_date}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={form.template} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Templates preenchem checklist e notas quando os campos estão vazios.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Notas (ganchos, cenas planejadas, encontros)</Label>
              <Textarea
                rows={8}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Cena de abertura, NPCs, encontros, reviravoltas..."
              />
            </div>

            <div className="space-y-2">
              <Label>Checklist</Label>
              <div className="flex gap-2">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  placeholder="Ex: Preparei o mapa"
                />
                <Button type="button" onClick={addChecklistItem} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.checklist.length > 0 && (
                <ul className="space-y-1.5 rounded-md border border-border p-3">
                  {form.checklist.map((it) => (
                    <li key={it.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={it.done}
                        onCheckedChange={(c) =>
                          setForm((f) => ({
                            ...f,
                            checklist: f.checklist.map((x) =>
                              x.id === it.id ? { ...x, done: !!c } : x,
                            ),
                          }))
                        }
                      />
                      <span className={`flex-1 ${it.done ? "line-through text-muted-foreground" : ""}`}>
                        {it.label}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            checklist: f.checklist.filter((x) => x.id !== it.id),
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>{editing ? "Salvar" : "Criar prep"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
