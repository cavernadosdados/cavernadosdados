import { useEffect, useState } from "react";
import { PDFDocument, PDFCheckBox, PDFTextField, PDFDropdown, PDFRadioGroup } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, X, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type FieldInfo =
  | { name: string; kind: "text"; value: string; multiline: boolean }
  | { name: string; kind: "check"; value: boolean }
  | { name: string; kind: "choice"; value: string; options: string[] };

interface Props {
  url: string;
  onCancel: () => void;
  onSave: (bytes: Uint8Array) => Promise<void>;
}

export function PdfFormEditor({ url, onCancel, onSave }: Props) {
  const [fields, setFields] = useState<FieldInfo[] | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const list: FieldInfo[] = [];
        for (const f of doc.getForm().getFields()) {
          const name = f.getName();
          if (f instanceof PDFTextField) list.push({ name, kind: "text", value: f.getText() ?? "", multiline: f.isMultiline() });
          else if (f instanceof PDFCheckBox) list.push({ name, kind: "check", value: f.isChecked() });
          else if (f instanceof PDFDropdown) list.push({ name, kind: "choice", value: f.getSelected()[0] ?? "", options: f.getOptions() });
          else if (f instanceof PDFRadioGroup) list.push({ name, kind: "choice", value: f.getSelected() ?? "", options: f.getOptions() });
        }
        if (!cancelled) { setBytes(buf); setFields(list); }
      } catch {
        if (!cancelled) setError("Não foi possível ler este PDF.");
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  const update = (name: string, value: string | boolean) =>
    setFields((cur) => cur?.map((f) => (f.name === name ? ({ ...f, value } as FieldInfo) : f)) ?? null);

  const save = async () => {
    if (!bytes || !fields) return;
    setSaving(true);
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = doc.getForm();
      for (const f of fields) {
        const field = form.getField(f.name);
        if (field instanceof PDFTextField && f.kind === "text") field.setText(f.value);
        else if (field instanceof PDFCheckBox && f.kind === "check") (f.value ? field.check() : field.uncheck());
        else if (field instanceof PDFDropdown && f.kind === "choice" && f.value) field.select(f.value);
        else if (field instanceof PDFRadioGroup && f.kind === "choice" && f.value) field.select(f.value);
      }
      await onSave(await doc.save());
    } catch (e) {
      toast({ title: "Erro ao salvar PDF", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!fields) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Lendo campos do PDF…</div>;

  if (fields.length === 0)
    return (
      <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
        <p className="flex items-start gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Este PDF é apenas para leitura e não possui campos interativos. Use a ficha resumida ou envie uma versão preenchível oficial (D&D, Tormenta20, Ordem Paranormal etc.).</p>
        <Button variant="outline" size="sm" onClick={onCancel}>Fechar</Button>
      </div>
    );

  const visible = fields.filter((f) => f.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{fields.length} campos editáveis</p>
        <Input placeholder="Buscar campo…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
      </div>
      <div className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {visible.map((f) => (
          <div key={f.name} className="space-y-1">
            <Label className="text-xs text-muted-foreground break-all">{f.name}</Label>
            {f.kind === "text" && (f.multiline
              ? <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={f.value} onChange={(e) => update(f.name, e.target.value)} />
              : <Input value={f.value} onChange={(e) => update(f.name, e.target.value)} />)}
            {f.kind === "check" && <div><Checkbox checked={f.value} onCheckedChange={(v) => update(f.name, v === true)} /></div>}
            {f.kind === "choice" && (
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.value} onChange={(e) => update(f.name, e.target.value)}>
                <option value="">—</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}><X className="mr-2 h-4 w-4" /> Cancelar</Button>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar alterações</Button>
      </div>
    </div>
  );
}
