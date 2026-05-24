import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Upload, Loader2, Trash2, Eye, EyeOff, ImageIcon, Pencil, User, Square, Image, LayoutGrid } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { RARITY_STYLES } from "@/lib/glimers";
import { cn } from "@/lib/utils";

type Kind = "glimer" | "frame" | "cover";
type Rarity = "common" | "rare" | "epic" | "legendary";
type UnlockType = "free" | "purchase" | "xp" | "achievement";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function AdminCosmeticos() {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [kind, setKind] = useState<Kind>("frame");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState<Rarity>("common");
  const [unlockType, setUnlockType] = useState<UnlockType>("purchase");
  const [priceTokens, setPriceTokens] = useState<string>("10");
  const [xpRequired, setXpRequired] = useState<string>("100");
  const [achievementCode, setAchievementCode] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("100");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<any | null>(null);
  const [catalogKind, setCatalogKind] = useState<"all" | Kind>("all");

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["admin-cosmetics-all"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cosmetic_items")
        .select("id, slug, kind, name, description, rarity, price_tokens, unlock_rule, image_url, is_active, sort_order, created_at")
        .in("kind", ["glimer", "frame", "cover"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("cosmetic_items")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Atualizado" });
      qc.invalidateQueries({ queryKey: ["admin-cosmetics-all"] });
      qc.invalidateQueries({ queryKey: ["cosmetic-items"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cosmetic_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Item excluído" });
      qc.invalidateQueries({ queryKey: ["admin-cosmetics-all"] });
      qc.invalidateQueries({ queryKey: ["cosmetic-items"] });
    },
    onError: (e: any) =>
      toast({
        title: "Erro ao excluir",
        description: "Itens já adquiridos por usuários não podem ser removidos. Desative em vez disso.",
        variant: "destructive",
      }),
  });

  const resetForm = () => {
    setName(""); setSlug(""); setDescription("");
    setRarity("common"); setUnlockType("purchase");
    setPriceTokens("10"); setXpRequired("100"); setAchievementCode("");
    setSortOrder("100"); setFile(null); setPreviewUrl("");
  };

  const handleFile = (f: File | null) => {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : "");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "Imagem obrigatória", variant: "destructive" }); return;
    }
    const finalSlug = slug.trim().toLowerCase();
    if (!SLUG_RE.test(finalSlug)) {
      toast({ title: "Slug inválido", description: "Use apenas letras minúsculas, números e hífens (ex: meu-frame-2026)", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" }); return;
    }

    let unlock_rule: any;
    let price: number | null = null;
    if (unlockType === "free") unlock_rule = { type: "free" };
    else if (unlockType === "purchase") {
      const p = parseInt(priceTokens, 10);
      if (!p || p <= 0) { toast({ title: "Preço inválido", variant: "destructive" }); return; }
      unlock_rule = { type: "purchase" }; price = p;
    } else if (unlockType === "xp") {
      const v = parseInt(xpRequired, 10);
      if (!v || v <= 0) { toast({ title: "XP inválido", variant: "destructive" }); return; }
      unlock_rule = { type: "xp", value: v };
    } else {
      if (!achievementCode.trim()) { toast({ title: "Código de conquista obrigatório", variant: "destructive" }); return; }
      unlock_rule = { type: "achievement", value: achievementCode.trim() };
    }

    setSubmitting(true);
    try {
      const ext = (file.name.split(".").pop() || (kind === "cover" ? "jpg" : "png")).toLowerCase();
      const path = `${kind}s/${finalSlug}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cosmetics").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("cosmetics").getPublicUrl(path);
      const image_url = pub.publicUrl;

      const { error: insErr } = await supabase.from("cosmetic_items").insert({
        slug: finalSlug,
        kind,
        name: name.trim(),
        description: description.trim(),
        rarity,
        price_tokens: price,
        unlock_rule,
        image_url,
        sort_order: parseInt(sortOrder, 10) || 100,
        is_active: true,
      });
      if (insErr) {
        // Tenta limpar imagem órfã
        await supabase.storage.from("cosmetics").remove([path]);
        throw insErr;
      }

      toast({ title: "Cosmético publicado!", description: `${name} já está disponível na loja.` });
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin-cosmetics-all"] });
      qc.invalidateQueries({ queryKey: ["cosmetic-items"] });
    } catch (err: any) {
      const msg = err?.message?.includes("duplicate") ? "Slug já existe — escolha outro." : (err?.message ?? "Falha ao publicar");
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || roleLoading) {
    return <DashboardLayout><div className="p-6"><Skeleton className="h-32" /></div></DashboardLayout>;
  }
  if (!user || !isAdmin) return <Navigate to="/dashboard" replace />;

  const customItems = (items ?? []).filter((i: any) => i.image_url && i.image_url.includes("/storage/"));
  const bundledItems = (items ?? []).filter((i: any) => !customItems.includes(i));

  return (
    <DashboardLayout>
      <div className="container max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cosméticos personalizados</h1>
            <p className="text-sm text-muted-foreground">Publique Glimers, molduras e capas exclusivas direto na loja.</p>
          </div>
        </div>

        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new"><Upload className="h-3.5 w-3.5 mr-1" /> Novo</TabsTrigger>
            <TabsTrigger value="manage"><ImageIcon className="h-3.5 w-3.5 mr-1" /> Catálogo</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Publicar novo cosmético</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="glimer">Glimer (avatar PNG transparente)</SelectItem>
                        <SelectItem value="frame">Moldura (PNG transparente)</SelectItem>
                        <SelectItem value="cover">Capa (16:9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Raridade</Label>
                    <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Comum</SelectItem>
                        <SelectItem value="rare">Raro</SelectItem>
                        <SelectItem value="epic">Épico</SelectItem>
                        <SelectItem value="legendary">Lendário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Moldura Aurora" maxLength={80} required />
                  </div>

                  <div className="space-y-2">
                    <Label>Slug (identificador único)</Label>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      placeholder="ex: moldura-aurora"
                      maxLength={60}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Descrição</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label>Regra de desbloqueio</Label>
                    <Select value={unlockType} onValueChange={(v) => setUnlockType(v as UnlockType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Compra com tokens</SelectItem>
                        <SelectItem value="xp">Requer XP</SelectItem>
                        <SelectItem value="achievement">Requer conquista</SelectItem>
                        <SelectItem value="free">Grátis (manualmente concedido)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    {unlockType === "purchase" && (
                      <>
                        <Label>Preço (tokens)</Label>
                        <Input type="number" min={1} value={priceTokens} onChange={(e) => setPriceTokens(e.target.value)} />
                      </>
                    )}
                    {unlockType === "xp" && (
                      <>
                        <Label>XP necessário</Label>
                        <Input type="number" min={1} value={xpRequired} onChange={(e) => setXpRequired(e.target.value)} />
                      </>
                    )}
                    {unlockType === "achievement" && (
                      <>
                        <Label>Código da conquista</Label>
                        <Input value={achievementCode} onChange={(e) => setAchievementCode(e.target.value)} placeholder="ex: master_5_tables" />
                      </>
                    )}
                    {unlockType === "free" && (
                      <>
                        <Label>Concessão</Label>
                        <p className="text-xs text-muted-foreground pt-2">Item criado como grátis. Use o painel de banco de dados para conceder a usuários existentes.</p>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Ordem no catálogo</Label>
                    <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Menor = aparece primeiro.</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Arquivo de imagem</Label>
                    <Input
                      type="file"
                      accept={kind === "cover" ? "image/jpeg,image/png,image/webp" : "image/png"}
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {kind === "cover"
                        ? "JPG/PNG/WebP em 16:9 (recomendado: 1280×720, máx ~500KB)."
                        : "PNG quadrado com fundo transparente (recomendado: 512×512)."}
                    </p>
                    {previewUrl && (
                      <div className={cn(
                        "mt-2 border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center",
                        kind === "cover" ? "aspect-video" : "aspect-square max-w-xs",
                      )}>
                        <img src={previewUrl} alt="preview" className={kind === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain p-4"} />
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 flex gap-2 justify-end pt-2">
                    <Button type="button" variant="ghost" onClick={resetForm} disabled={submitting}>Limpar</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Publicar na loja
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="mt-4 space-y-4">
            {loadingItems ? (
              <Skeleton className="h-40" />
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Personalizados ({customItems.length})</CardTitle></CardHeader>
                  <CardContent>
                    {customItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum cosmético personalizado ainda.</p>
                    ) : (
                      <CatalogGrid items={customItems} onToggle={toggleActive.mutate} onDelete={deleteItem.mutate} onEdit={setEditing} />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base text-muted-foreground">Catálogo padrão ({bundledItems.length})</CardTitle></CardHeader>
                  <CardContent>
                    <CatalogGrid items={bundledItems} onToggle={toggleActive.mutate} onEdit={setEditing} readOnly />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        <EditCosmeticDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-cosmetics-all"] });
            qc.invalidateQueries({ queryKey: ["cosmetic-items"] });
          }}
        />
      </div>
    </DashboardLayout>
  );
}

function CatalogGrid({
  items, onToggle, onDelete, onEdit, readOnly,
}: {
  items: any[];
  onToggle: (v: { id: string; active: boolean }) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: any) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((it) => {
        const r = RARITY_STYLES[it.rarity as keyof typeof RARITY_STYLES];
        return (
          <div key={it.id} className={cn("rounded-lg border overflow-hidden bg-card", !it.is_active && "opacity-50")}>
            <div className={cn("relative bg-muted/30", it.kind === "cover" ? "aspect-video" : "aspect-square")}>
              {it.image_url ? (
                <img
                  src={it.image_url}
                  alt={it.name}
                  className={it.kind === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain p-3"}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <Badge className={cn("absolute top-1 right-1 text-[10px]", r?.badge)}>{r?.label}</Badge>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-medium truncate">{it.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{it.kind}</span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{it.slug}</p>
              <div className="flex gap-1 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-1 text-xs"
                  onClick={() => onToggle({ id: it.id, active: !it.is_active })}
                >
                  {it.is_active ? <><EyeOff className="h-3 w-3 mr-1" /> Ocultar</> : <><Eye className="h-3 w-3 mr-1" /> Mostrar</>}
                </Button>
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => onEdit(it)}
                    title="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {!readOnly && onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive"
                    onClick={() => { if (confirm(`Excluir "${it.name}" permanentemente?`)) onDelete(it.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditCosmeticDialog({
  item, onClose, onSaved,
}: {
  item: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState<Rarity>("common");
  const [unlockType, setUnlockType] = useState<UnlockType>("free");
  const [priceTokens, setPriceTokens] = useState("10");
  const [xpRequired, setXpRequired] = useState("100");
  const [achievementCode, setAchievementCode] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState("");
  const [saving, setSaving] = useState(false);

  const isCustom = !!item?.image_url && String(item.image_url).includes("/storage/");

  useEffect(() => {
    if (!item) return;
    setName(item.name ?? "");
    setDescription(item.description ?? "");
    setRarity((item.rarity ?? "common") as Rarity);
    const rule = item.unlock_rule ?? { type: "free" };
    setUnlockType((rule.type ?? "free") as UnlockType);
    setPriceTokens(String(item.price_tokens ?? 10));
    setXpRequired(String(rule.type === "xp" ? rule.value ?? 100 : 100));
    setAchievementCode(rule.type === "achievement" ? String(rule.value ?? "") : "");
    setSortOrder(String(item.sort_order ?? 100));
    setIsActive(!!item.is_active);
    setNewFile(null);
    setNewPreview("");
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (newPreview) URL.revokeObjectURL(newPreview);
    setName(""); setDescription(""); setRarity("common");
    setUnlockType("free"); setPriceTokens("10"); setXpRequired("100");
    setAchievementCode(""); setSortOrder("100"); setIsActive(true);
    setNewFile(null); setNewPreview("");
    onClose();
  };

  const handleFile = (f: File | null) => {
    setNewFile(f);
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewPreview(f ? URL.createObjectURL(f) : "");
  };

  const onSave = async () => {
    if (!item) return;
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" }); return;
    }

    let unlock_rule: any;
    let price: number | null = null;
    if (unlockType === "free") unlock_rule = { type: "free" };
    else if (unlockType === "purchase") {
      const p = parseInt(priceTokens, 10);
      if (!p || p <= 0) { toast({ title: "Preço inválido", variant: "destructive" }); return; }
      unlock_rule = { type: "purchase" }; price = p;
    } else if (unlockType === "xp") {
      const v = parseInt(xpRequired, 10);
      if (!v || v <= 0) { toast({ title: "XP inválido", variant: "destructive" }); return; }
      unlock_rule = { type: "xp", value: v };
    } else {
      if (!achievementCode.trim()) { toast({ title: "Código de conquista obrigatório", variant: "destructive" }); return; }
      unlock_rule = { type: "achievement", value: achievementCode.trim() };
    }

    setSaving(true);
    try {
      let image_url: string | undefined;
      if (newFile && isCustom) {
        const ext = (newFile.name.split(".").pop() || (item.kind === "cover" ? "jpg" : "png")).toLowerCase();
        const path = `${item.kind}s/${item.slug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("cosmetics").upload(path, newFile, {
          contentType: newFile.type || undefined, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("cosmetics").getPublicUrl(path);
        image_url = pub.publicUrl;
      }

      const patch: any = {
        name: name.trim(),
        description: description.trim(),
        rarity,
        price_tokens: price,
        unlock_rule,
        sort_order: parseInt(sortOrder, 10) || 100,
        is_active: isActive,
      };
      if (image_url) patch.image_url = image_url;

      const { error } = await supabase.from("cosmetic_items").update(patch).eq("id", item.id);
      if (error) throw error;

      toast({ title: "Atualizado", description: `${name} foi salvo.` });
      handleClose();
      onSaved();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message ?? "Falha", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cosmético</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 text-xs text-muted-foreground">
              <strong>{item.kind}</strong> · slug <code>{item.slug}</code>
              {!isCustom && <span className="ml-2 text-amber-600">(catálogo padrão — imagem não pode ser substituída)</span>}
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label>Raridade</Label>
              <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Comum</SelectItem>
                  <SelectItem value="rare">Raro</SelectItem>
                  <SelectItem value="epic">Épico</SelectItem>
                  <SelectItem value="legendary">Lendário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Regra de desbloqueio</Label>
              <Select value={unlockType} onValueChange={(v) => setUnlockType(v as UnlockType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Compra com tokens</SelectItem>
                  <SelectItem value="xp">Requer XP</SelectItem>
                  <SelectItem value="achievement">Requer conquista</SelectItem>
                  <SelectItem value="free">Grátis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {unlockType === "purchase" && (<><Label>Preço (tokens)</Label><Input type="number" min={1} value={priceTokens} onChange={(e) => setPriceTokens(e.target.value)} /></>)}
              {unlockType === "xp" && (<><Label>XP necessário</Label><Input type="number" min={1} value={xpRequired} onChange={(e) => setXpRequired(e.target.value)} /></>)}
              {unlockType === "achievement" && (<><Label>Código da conquista</Label><Input value={achievementCode} onChange={(e) => setAchievementCode(e.target.value)} /></>)}
              {unlockType === "free" && <p className="text-xs text-muted-foreground pt-6">Item gratuito.</p>}
            </div>

            <div className="space-y-2">
              <Label>Ordem no catálogo</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Visibilidade</Label>
              <Select value={isActive ? "1" : "0"} onValueChange={(v) => setIsActive(v === "1")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ativo (visível na loja)</SelectItem>
                  <SelectItem value="0">Oculto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isCustom && (
              <div className="space-y-2 md:col-span-2">
                <Label>Substituir imagem (opcional)</Label>
                <Input
                  type="file"
                  accept={item.kind === "cover" ? "image/jpeg,image/png,image/webp" : "image/png"}
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                <div className={cn(
                  "mt-2 border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center",
                  item.kind === "cover" ? "aspect-video" : "aspect-square max-w-xs",
                )}>
                  <img
                    src={newPreview || item.image_url}
                    alt="preview"
                    className={item.kind === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain p-4"}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}