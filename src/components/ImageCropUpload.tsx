import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Cropper from "react-easy-crop";
import { Crop, ImageOff, Image as ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCropUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: number;
  className?: string;
}

type Point = { x: number; y: number };
type Area = { x: number; y: number; width: number; height: number };

function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

async function getCanvasSafeObjectUrl(imageSrc: string) {
  try {
    const res = await fetch(imageSrc, { mode: "cors", credentials: "omit" });
    if (res.ok) return URL.createObjectURL(await res.blob());
  } catch {
    // Many image hosts allow <img> preview but block browser fetch/canvas via CORS.
  }

  const { data, error } = await supabase.functions.invoke("fetch-image-proxy", {
    body: { url: imageSrc },
  });

  if (error) throw new Error(error.message || "Não foi possível carregar a imagem");
  if (!data?.base64 || !data?.mimeType) throw new Error("Resposta inválida ao carregar a imagem");

  return URL.createObjectURL(base64ToBlob(data.base64, data.mimeType));
}

async function createCroppedImage(imageSrc: string, croppedAreaPixels: Area): Promise<Blob | null> {
  let objectUrl: string | null = null;
  try {
    objectUrl = await getCanvasSafeObjectUrl(imageSrc);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível carregar a imagem (CORS ou URL inválida)"));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(croppedAreaPixels.width));
    canvas.height = Math.max(1, Math.round(croppedAreaPixels.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return await new Promise<Blob | null>((resolve, reject) => {
      try {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      } catch (e) {
        reject(new Error("Canvas bloqueado por CORS. Tente outra URL de imagem."));
      }
    });
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function isValidUrl(str: string) {
  if (!str) return false;
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function ImageCropUpload({
  value,
  onChange,
  label = "URL da imagem",
  placeholder = "https://...",
  aspectRatio = 1,
  className,
}: ImageCropUploadProps) {
  const [urlInput, setUrlInput] = useState(value || "");
  const [previewError, setPreviewError] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [debouncedUrl, setDebouncedUrl] = useState(value || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    onChange(val);
    setPreviewError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedUrl(val.trim());
    }, 400);
  };

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUploadCropped = async () => {
    if (!croppedAreaPixels || !debouncedUrl) return;
    setUploading(true);
    try {
      const blob = await createCroppedImage(debouncedUrl, croppedAreaPixels);
      if (!blob) throw new Error("Não foi possível processar a imagem");

      const fileName = `cropped-${Date.now()}.jpg`;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Você precisa estar autenticado");
      const filePath = `${userData.user.id}/${fileName}`;
      const { data, error } = await supabase.storage
        .from("lore-images")
        .upload(filePath, blob, { contentType: "image/jpeg" });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("lore-images").getPublicUrl(data.path);
      const publicUrl = publicUrlData.publicUrl;

      onChange(publicUrl);
      setUrlInput(publicUrl);
      setDebouncedUrl(publicUrl);
      setCropOpen(false);
      toast({ title: "Imagem cortada e salva!" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar a imagem";
      toast({ title: "Erro ao salvar imagem", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const showPreview = isValidUrl(debouncedUrl) && !previewError;
  const hasImage = !!value;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
      </div>
      <Input
        type="url"
        inputMode="url"
        placeholder={placeholder}
        value={urlInput}
        onChange={(e) => handleUrlChange(e.target.value)}
      />

      {/* Preview area */}
      <div className="relative w-full overflow-hidden rounded-md border border-border bg-muted/30" style={{ aspectRatio }}>
        {showPreview ? (
          <img
            src={debouncedUrl}
            alt="Preview"
            className="h-full w-full object-cover"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            {previewError ? (
              <>
                <ImageOff className="h-7 w-7 text-destructive/70" />
                <span className="text-xs">Não foi possível carregar a imagem</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-7 w-7 opacity-60" />
                <span className="text-xs">Cole um link para ver o preview</span>
              </>
            )}
          </div>
        )}

        {/* Overlay actions */}
        {showPreview && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={() => {
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setCropOpen(true);
              }}
            >
              <Crop className="h-4 w-4" /> Cortar / Editar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0"
              onClick={() => handleUrlChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Quick clear when no preview but has value */}
      {hasImage && !showPreview && (
        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleUrlChange("")}>
          <X className="h-3 w-3 mr-1" /> Limpar imagem
        </Button>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Editar imagem</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="relative w-full h-64 sm:h-80 bg-muted rounded-md overflow-hidden">
              {debouncedUrl && (
                <Cropper
                  image={debouncedUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                  showGrid={true}
                />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(v) => setZoom(v[0])}
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => setCropOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUploadCropped} disabled={uploading} className="gap-1">
              <Upload className="h-4 w-4" />
              {uploading ? "Salvando..." : "Salvar imagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
