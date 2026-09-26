import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlimerAvatar } from "@/components/GlimerAvatar";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
  ScrollText,
  Upload,
  X,
} from "lucide-react";

const BUCKET = "character-sheets";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 4;

type CharacterSheet = {
  id: string;
  table_id: string;
  owner_id: string;
  character_name: string;
  archetype: string | null;
  level: number | null;
  ancestry: string | null;
  attributes: string | null;
  health: string | null;
  defense: string | null;
  notes: string | null;
  external_url: string | null;
  pdf_path: string | null;
  image_paths: string[];
  updated_at: string;
};

type Profile = { id: string; display_name: string | null };
type SheetWithProfile = CharacterSheet & { profile?: Profile };

type FormState = {
  character_name: string;
  archetype: string;
  level: string;
  ancestry: string;
  attributes: string;
  health: string;
  defense: string;
  notes: string;
  external_url: string;
};

const emptyForm: FormState = {
  character_name: "",
  archetype: "",
  level: "",
  ancestry: "",
  attributes: "",
  health: "",
  defense: "",
  notes: "",
  external_url: "",
};

interface CharacterSheetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableTitle: string;
  canEditOwnSheet: boolean;
}

const safeFileName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo";

const getFileError = (file: File, kind: "pdf" | "image") => {
  if (file.size > MAX_FILE_SIZE) return "Cada arquivo pode ter no máximo 10 MB.";
  if (kind === "pdf" && file.type !== "application/pdf") return "Selecione um arquivo PDF válido.";
  if (kind === "image" && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Use imagens JPG, PNG ou WebP.";
  }
  return null;
};

export function CharacterSheetsDialog({
  open,
  onOpenChange,
  tableId,
  tableTitle,
  canEditOwnSheet,
}: CharacterSheetsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const db = supabase as any;
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [removePdf, setRemovePdf] = useState(false);
  const [removedImages, setRemovedImages] = useState<string[]>([]);

  const { data: sheets = [], isLoading, error } = useQuery({
    queryKey: ["character-sheets", tableId],
    enabled: open && !!user,
    queryFn: async () => {
      const { data, error: sheetsError } = await db
        .from("character_sheets")
        .select("*")
        .eq("table_id", tableId)
        .order("updated_at", { ascending: false });
      if (sheetsError) throw sheetsError;
      const rows = (data ?? []) as CharacterSheet[];
      const ownerIds = [...new Set(rows.map((sheet) => sheet.owner_id))];
      if (ownerIds.length === 0) return [] as SheetWithProfile[];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ownerIds);
      if (profileError) throw profileError;
      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return rows.map((sheet) => ({ ...sheet, profile: profilesById.get(sheet.owner_id) }));
    },
  });

  const mySheet = sheets.find((sheet) => sheet.owner_id === user?.id);
  const visibleSheets = useMemo(() => {
    if (!canEditOwnSheet || mySheet) return sheets;
    if (!user) return sheets;
    return [
      {
        id: `draft-${user.id}`,
        table_id: tableId,
        owner_id: user.id,
        character_name: "Minha ficha",
        archetype: null,
        level: null,
        ancestry: null,
        attributes: null,
        health: null,
        defense: null,
        notes: null,
        external_url: null,
        pdf_path: null,
        image_paths: [],
        updated_at: "",
        profile: { id: user.id, display_name: "Você" },
      } satisfies SheetWithProfile,
      ...sheets,
    ];
  }, [canEditOwnSheet, mySheet, sheets, tableId, user]);

  useEffect(() => {
    if (!open) return;
    const preferred = selectedOwnerId && visibleSheets.some((sheet) => sheet.owner_id === selectedOwnerId)
      ? selectedOwnerId
      : mySheet?.owner_id ?? visibleSheets[0]?.owner_id ?? (canEditOwnSheet ? user?.id ?? null : null);
    setSelectedOwnerId(preferred);
  }, [open, visibleSheets, mySheet, canEditOwnSheet, user, selectedOwnerId]);

  const selectedSheet = visibleSheets.find((sheet) => sheet.owner_id === selectedOwnerId);
  const isOwnSheet = !!user && selectedOwnerId === user.id;
  const canEdit = canEditOwnSheet && isOwnSheet;

  useEffect(() => {
    const source = selectedSheet && !selectedSheet.id.startsWith("draft-") ? selectedSheet : undefined;
    setForm(source ? {
      character_name: source.character_name,
      archetype: source.archetype ?? "",
      level: source.level?.toString() ?? "",
      ancestry: source.ancestry ?? "",
      attributes: source.attributes ?? "",
      health: source.health ?? "",
      defense: source.defense ?? "",
      notes: source.notes ?? "",
      external_url: source.external_url ?? "",
    } : emptyForm);
    setEditing(!source && canEditOwnSheet && selectedOwnerId === user?.id);
    setPdfFile(null);
    setImageFiles([]);
    setRemovePdf(false);
    setRemovedImages([]);
  }, [selectedSheet?.id, selectedOwnerId, canEditOwnSheet, user?.id]);

  const { data: signedFiles } = useQuery({
    queryKey: ["character-sheet-files", selectedSheet?.id, selectedSheet?.pdf_path, selectedSheet?.image_paths],
    enabled: open && !!selectedSheet && !selectedSheet.id.startsWith("draft-"),
    queryFn: async () => {
      const paths = [selectedSheet?.pdf_path, ...(selectedSheet?.image_paths ?? [])].filter(Boolean) as string[];
      if (paths.length === 0) return { pdf: null, images: [] as { path: string; url: string }[] };
      const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
      if (signError) throw signError;
      const byPath = new Map((data ?? []).map((item) => [item.path, item.signedUrl]));
      return {
        pdf: selectedSheet?.pdf_path ? byPath.get(selectedSheet.pdf_path) ?? null : null,
        images: (selectedSheet?.image_paths ?? []).map((path) => ({ path, url: byPath.get(path) ?? "" })).filter((item) => item.url),
      };
    },
  });

  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const choosePdf = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const message = getFileError(file, "pdf");
    if (message) return toast({ title: "PDF não aceito", description: message, variant: "destructive" });
    setPdfFile(file);
    setRemovePdf(false);
  };

  const chooseImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const currentCount = (selectedSheet?.image_paths.length ?? 0) - removedImages.length + imageFiles.length;
    if (currentCount + files.length > MAX_IMAGES) {
      return toast({ title: "Limite de imagens", description: "A ficha aceita até quatro imagens.", variant: "destructive" });
    }
    const invalid = files.find((file) => getFileError(file, "image"));
    if (invalid) {
      return toast({ title: "Imagem não aceita", description: getFileError(invalid, "image") ?? undefined, variant: "destructive" });
    }
    setImageFiles((current) => [...current, ...files]);
  };

  const uploadFile = async (file: File, folder: "pdf" | "images") => {
    if (!user) throw new Error("Sessão expirada");
    const path = `${tableId}/${user.id}/${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    return path;
  };

  const saveSheet = async () => {
    if (!user || !canEdit) return;
    if (!form.character_name.trim()) {
      toast({ title: "Informe o nome do personagem", variant: "destructive" });
      return;
    }
    if (form.external_url.trim()) {
      try {
        const url = new URL(form.external_url.trim());
        if (!url.protocol.startsWith("http")) throw new Error();
      } catch {
        toast({ title: "Link externo inválido", description: "Use um endereço começando com http:// ou https://.", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    const newlyUploaded: string[] = [];
    try {
      let pdfPath = removePdf ? null : selectedSheet?.pdf_path ?? null;
      if (pdfFile) {
        pdfPath = await uploadFile(pdfFile, "pdf");
        newlyUploaded.push(pdfPath);
      }
      const uploadedImages: string[] = [];
      for (const file of imageFiles) {
        const path = await uploadFile(file, "images");
        uploadedImages.push(path);
        newlyUploaded.push(path);
      }
      const retainedImages = (selectedSheet?.image_paths ?? []).filter((path) => !removedImages.includes(path));
      const imagePaths = [...retainedImages, ...uploadedImages];
      const payload = {
        table_id: tableId,
        owner_id: user.id,
        character_name: form.character_name.trim(),
        archetype: form.archetype.trim() || null,
        level: form.level ? Number(form.level) : null,
        ancestry: form.ancestry.trim() || null,
        attributes: form.attributes.trim() || null,
        health: form.health.trim() || null,
        defense: form.defense.trim() || null,
        notes: form.notes.trim() || null,
        external_url: form.external_url.trim() || null,
        pdf_path: pdfPath,
        image_paths: imagePaths,
      };
      const { error: saveError } = await db.from("character_sheets").upsert(payload, { onConflict: "table_id,owner_id" });
      if (saveError) throw saveError;

      const replacedPdf = pdfFile && selectedSheet?.pdf_path ? [selectedSheet.pdf_path] : [];
      const filesToDelete = [...removedImages, ...(removePdf ? [selectedSheet?.pdf_path].filter(Boolean) : []), ...replacedPdf] as string[];
      if (filesToDelete.length > 0) await supabase.storage.from(BUCKET).remove(filesToDelete);
      await queryClient.invalidateQueries({ queryKey: ["character-sheets", tableId] });
      setEditing(false);
      toast({ title: "Ficha salva", description: "Os participantes autorizados já podem consultá-la." });
    } catch (caught) {
      if (newlyUploaded.length > 0) await supabase.storage.from(BUCKET).remove(newlyUploaded);
      toast({
        title: "Não foi possível salvar a ficha",
        description: caught instanceof Error ? caught.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSelected = (ownerId: string) => {
    setSelectedOwnerId(ownerId);
    setEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92dvh] max-h-[92dvh] w-[calc(100vw-1rem)] max-w-6xl overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <ScrollText className="h-5 w-5 text-primary" /> Fichas da mesa
          </DialogTitle>
          <DialogDescription>{tableTitle} · acesso restrito aos participantes aceitos</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="m-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Não foi possível carregar as fichas. A atualização segura do banco ainda pode estar pendente.
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[260px_1fr] md:grid-rows-1">
            <div className="border-b border-border bg-muted/20 p-3 md:border-b-0 md:border-r">
              <p className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">Personagens</p>
              <div className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible">
                {visibleSheets.map((sheet) => (
                  <Button
                    key={sheet.owner_id}
                    type="button"
                    variant={selectedOwnerId === sheet.owner_id ? "secondary" : "ghost"}
                    className="h-auto min-w-[190px] justify-start gap-2 px-2 py-2 text-left md:w-full md:min-w-0"
                    onClick={() => updateSelected(sheet.owner_id)}
                  >
                    <GlimerAvatar
                      userId={sheet.owner_id}
                      fallbackText={sheet.profile?.display_name ?? sheet.character_name}
                      label={sheet.profile?.display_name ?? "Jogador"}
                      className="h-9 w-9 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{sheet.character_name}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {sheet.profile?.display_name ?? "Jogador"}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
              {visibleSheets.length === 0 && (
                <p className="px-2 py-5 text-sm text-muted-foreground">Nenhuma ficha enviada ainda.</p>
              )}
            </div>

            <ScrollArea className="min-h-0 h-full">
              {!selectedSheet ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
                  <ScrollText className="h-12 w-12 text-muted-foreground/50" />
                  <p className="font-medium">As fichas aparecerão aqui</p>
                  <p className="max-w-sm text-sm text-muted-foreground">Jogadores aceitos podem criar a própria ficha nesta mesa.</p>
                </div>
              ) : editing && canEdit ? (
                <div className="space-y-6 p-4 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 sm:col-span-2"><Label>Nome do personagem *</Label><Input value={form.character_name} onChange={(e) => setField("character_name", e.target.value)} maxLength={80} /></div>
                    <div className="space-y-2"><Label>Classe / arquétipo</Label><Input value={form.archetype} onChange={(e) => setField("archetype", e.target.value)} maxLength={80} /></div>
                    <div className="space-y-2"><Label>Nível</Label><Input type="number" min={0} max={999} value={form.level} onChange={(e) => setField("level", e.target.value)} /></div>
                    <div className="space-y-2 sm:col-span-2"><Label>Espécie / raça / origem</Label><Input value={form.ancestry} onChange={(e) => setField("ancestry", e.target.value)} maxLength={100} /></div>
                    <div className="space-y-2"><Label>Pontos de vida</Label><Input value={form.health} onChange={(e) => setField("health", e.target.value)} maxLength={40} /></div>
                    <div className="space-y-2"><Label>Defesa</Label><Input value={form.defense} onChange={(e) => setField("defense", e.target.value)} maxLength={40} /></div>
                  </div>
                  <div className="space-y-2"><Label>Atributos principais</Label><Textarea value={form.attributes} onChange={(e) => setField("attributes", e.target.value)} placeholder="FOR 16 · DES 14 · CON 15..." maxLength={1000} /></div>
                  <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="min-h-28" maxLength={3000} /></div>
                  <div className="space-y-2"><Label>Link externo</Label><Input type="url" inputMode="url" value={form.external_url} onChange={(e) => setField("external_url", e.target.value)} placeholder="https://drive.google.com/..." /></div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3 rounded-md border border-border p-4">
                      <div><p className="font-medium">PDF da ficha</p><p className="text-xs text-muted-foreground">Um arquivo, até 10 MB.</p></div>
                      {selectedSheet.pdf_path && !removePdf && !pdfFile && (
                        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2 text-sm"><span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">PDF atual</span></span><Button type="button" size="icon" variant="ghost" onClick={() => setRemovePdf(true)} aria-label="Remover PDF"><X className="h-4 w-4" /></Button></div>
                      )}
                      {pdfFile && <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2 text-sm"><span className="truncate">{pdfFile.name}</span><Button type="button" size="icon" variant="ghost" onClick={() => setPdfFile(null)} aria-label="Remover novo PDF"><X className="h-4 w-4" /></Button></div>}
                      <Label className="inline-flex cursor-pointer"><Input type="file" accept="application/pdf" className="sr-only" onChange={choosePdf} /><span className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"><Upload className="h-4 w-4" /> {selectedSheet.pdf_path ? "Substituir PDF" : "Adicionar PDF"}</span></Label>
                    </div>
                    <div className="space-y-3 rounded-md border border-border p-4">
                      <div><p className="font-medium">Imagens</p><p className="text-xs text-muted-foreground">Até quatro JPG, PNG ou WebP; 10 MB cada.</p></div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSheet.image_paths.filter((path) => !removedImages.includes(path)).map((path, index) => <Badge key={path} variant="secondary" className="gap-1">Imagem {index + 1}<button type="button" onClick={() => setRemovedImages((current) => [...current, path])} aria-label={`Remover imagem ${index + 1}`}><X className="h-3 w-3" /></button></Badge>)}
                        {imageFiles.map((file, index) => <Badge key={`${file.name}-${index}`} variant="outline" className="gap-1 max-w-full"><span className="max-w-36 truncate">{file.name}</span><button type="button" onClick={() => setImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${file.name}`}><X className="h-3 w-3" /></button></Badge>)}
                      </div>
                      <Label className="inline-flex cursor-pointer"><Input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={chooseImages} /><span className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"><ImageIcon className="h-4 w-4" /> Adicionar imagens</span></Label>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    {mySheet && <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>}
                    <Button type="button" onClick={saveSheet} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar ficha"}</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                      <GlimerAvatar userId={selectedSheet.owner_id} fallbackText={selectedSheet.profile?.display_name ?? selectedSheet.character_name} label={selectedSheet.profile?.display_name ?? "Jogador"} className="h-14 w-14 shrink-0" />
                      <div><h3 className="font-heading text-2xl font-bold">{selectedSheet.character_name}</h3><p className="text-sm text-muted-foreground">{selectedSheet.profile?.display_name ?? "Jogador"}</p></div>
                    </div>
                    {canEdit && <Button type="button" variant="outline" onClick={() => setEditing(true)}>Editar minha ficha</Button>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[['Classe / arquétipo', selectedSheet.archetype], ['Nível', selectedSheet.level?.toString()], ['Espécie / origem', selectedSheet.ancestry], ['Pontos de vida', selectedSheet.health], ['Defesa', selectedSheet.defense]].filter((item) => item[1]).map(([label, value]) => <div key={label} className="rounded-md border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>)}
                  </div>
                  {selectedSheet.attributes && <section><h4 className="mb-2 font-semibold">Atributos principais</h4><p className="whitespace-pre-wrap rounded-md border border-border p-4 text-sm">{selectedSheet.attributes}</p></section>}
                  {selectedSheet.notes && <section><h4 className="mb-2 font-semibold">Observações</h4><p className="whitespace-pre-wrap rounded-md border border-border p-4 text-sm text-muted-foreground">{selectedSheet.notes}</p></section>}
                  {selectedSheet.external_url && <Button asChild variant="outline" className="gap-2"><a href={selectedSheet.external_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Abrir ficha externa</a></Button>}
                  {signedFiles?.pdf && <section className="space-y-2"><div className="flex items-center justify-between"><h4 className="font-semibold">PDF</h4><Button asChild size="sm" variant="outline"><a href={signedFiles.pdf} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Abrir</a></Button></div><iframe title={`PDF de ${selectedSheet.character_name}`} src={signedFiles.pdf} className="h-[520px] w-full rounded-md border border-border bg-muted" /></section>}
                  {!!signedFiles?.images.length && <section className="space-y-2"><h4 className="font-semibold">Imagens</h4><div className="grid gap-3 sm:grid-cols-2">{signedFiles.images.map((item, index) => <a key={item.path} href={item.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-md border border-border"><img src={item.url} alt={`Ficha de ${selectedSheet.character_name}, imagem ${index + 1}`} className="aspect-[4/3] h-full w-full object-contain bg-muted/20" /></a>)}</div></section>}
                  {!selectedSheet.attributes && !selectedSheet.notes && !selectedSheet.external_url && !selectedSheet.pdf_path && selectedSheet.image_paths.length === 0 && <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Esta ficha ainda não possui detalhes ou anexos.</p>}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}