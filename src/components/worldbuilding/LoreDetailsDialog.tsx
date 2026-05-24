import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export type LoreDetailField = {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  highlight?: "destructive" | "primary";
};

export type LoreDetailBadge = {
  label: string;
  className?: string;
  icon?: ReactNode;
};

interface LoreDetailsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle?: string | null;
  icon?: ReactNode;
  imageUrl?: string | null;
  imageMode?: "avatar" | "wide";
  imageFallback?: ReactNode;
  badges?: LoreDetailBadge[];
  fields?: LoreDetailField[];
  description?: string | null;
  isMaster?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Modal genérico para exibir detalhes ricos de um item de Mundo & Lore.
 * Reaproveitado por NPCs, Locais, Facções, Panteão, Itens, Linha do Tempo e Códex.
 */
export function LoreDetailsDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  imageUrl,
  imageMode = "avatar",
  imageFallback,
  badges,
  fields,
  description,
  isMaster,
  onEdit,
  onDelete,
}: LoreDetailsDialogProps) {
  const hasFields = (fields ?? []).some((f) => f.value !== undefined && f.value !== null && String(f.value).trim() !== "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {imageMode === "wide" && imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className="rounded-md w-full max-h-64 object-cover border border-border"
          />
        )}
        <DialogHeader>
          <div className="flex items-start gap-3">
            {imageMode === "avatar" && (imageUrl || imageFallback) && (
              <Avatar className="h-16 w-16 border border-primary/30 shrink-0">
                {imageUrl && <AvatarImage src={imageUrl} alt={title} />}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {imageFallback ?? title.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                {icon}
                <span className="truncate">{title}</span>
              </DialogTitle>
              {subtitle && (
                <DialogDescription className="text-xs mt-1">{subtitle}</DialogDescription>
              )}
              {badges && badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {badges.map((b, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={`text-xs gap-1 ${b.className ?? ""}`}
                    >
                      {b.icon}
                      {b.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {(hasFields || description) && <Separator />}

        {hasFields && (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields!
              .filter((f) => f.value !== undefined && f.value !== null && String(f.value).trim() !== "")
              .map((f, i) => (
                <div
                  key={i}
                  className={`rounded-md border px-3 py-2 ${
                    f.highlight === "destructive"
                      ? "border-destructive/40 bg-destructive/5"
                      : f.highlight === "primary"
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-background/40"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </div>
                  <div className={`text-sm mt-0.5 ${f.mono ? "font-mono" : ""}`}>
                    {String(f.value)}
                  </div>
                </div>
              ))}
          </div>
        )}

        {description && (
          <div className="rounded-md border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Descrição
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
              {description}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {isMaster && onDelete && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remover
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {isMaster && onEdit && (
            <Button
              onClick={() => {
                onEdit();
                onOpenChange(false);
              }}
            >
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LoreDetailsDialog;