import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  tableId: string;
  className?: string;
  variant?: "icon" | "pill";
}

export function FavoriteButton({ tableId, className, variant = "icon" }: FavoriteButtonProps) {
  const { favoriteIds } = useFavorites();
  const toggle = useToggleFavorite();
  const isFavorite = favoriteIds.has(tableId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggle.mutate({ tableId, isFavorite });
  };

  if (variant === "pill") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={toggle.isPending}
        className={cn(
          "gap-2 bg-black/40 border-white/30 text-white hover:bg-black/60 hover:text-white backdrop-blur-sm",
          isFavorite && "border-primary/60 text-primary",
          className,
        )}
      >
        <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        {isFavorite ? "Favoritada" : "Favoritar"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggle.isPending}
      aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white border border-white/20 transition-all hover:bg-black/70 hover:scale-105 disabled:opacity-50",
        isFavorite && "text-primary border-primary/60",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
    </button>
  );
}