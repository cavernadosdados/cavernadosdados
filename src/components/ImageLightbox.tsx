import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

/**
 * Global image viewer: any <img> clicked in the app opens enlarged in a modal.
 * Opt out with `data-no-lightbox` on the image or any ancestor.
 * Images inside interactive controls (buttons, labels, internal links) are ignored
 * so pickers and navigation keep working.
 */
const MIN_SIZE = 40;

function shouldOpen(img: HTMLImageElement): boolean {
  if (img.closest("[data-no-lightbox],[data-lightbox-viewer]")) return false;
  if (img.closest("button,label,[role='button'],[role='option'],[role='menuitem'],[role='tab']")) return false;
  const link = img.closest("a");
  if (link && link.getAttribute("target") !== "_blank") return false;
  const rect = img.getBoundingClientRect();
  if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return false;
  return !!(img.currentSrc || img.src);
}

export function ImageLightbox() {
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const target = event.target;
      if (!(target instanceof HTMLImageElement) || !shouldOpen(target)) return;
      event.preventDefault();
      event.stopPropagation();
      setImage({ src: target.currentSrc || target.src, alt: target.alt });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && setImage(null)}>
      <DialogContent data-lightbox-viewer className="max-w-[95vw] w-auto border-border bg-background/95 p-2 sm:max-w-5xl">
        <DialogTitle className="sr-only">{image?.alt || "Imagem ampliada"}</DialogTitle>
        <DialogDescription className="sr-only">Visualização ampliada da imagem</DialogDescription>
        {image && (
          <div className="flex flex-col items-center gap-2">
            <img src={image.src} alt={image.alt} className="max-h-[85vh] max-w-full rounded-md object-contain" />
            <div className="flex w-full items-center justify-between gap-3 px-1 pb-1 text-sm text-muted-foreground">
              <span className="truncate">{image.alt}</span>
              <a href={image.src} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 hover:text-primary">
                <ExternalLink className="h-4 w-4" /> Abrir original
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
