import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";
import { resolveCosmeticImage } from "@/lib/glimers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface OwnedGlimer {
  item_id: string;
  cosmetic_items: {
    id: string;
    slug: string;
    name: string;
    kind: string;
    rarity: string;
    image_url: string | null;
  };
}

export function GlimerPicker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: equipped } = useEquippedCosmetics(user?.id);

  const { data: owned = [], isLoading } = useQuery({
    queryKey: ["owned-glimers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_cosmetics")
        .select("item_id, cosmetic_items!inner(id, slug, name, kind, rarity, image_url)")
        .eq("cosmetic_items.kind", "glimer");
      if (error) throw error;
      return (data ?? []) as unknown as OwnedGlimer[];
    },
  });

  const equip = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc("equip_cosmetic", { _item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Glimer equipado!");
      queryClient.invalidateQueries({ queryKey: ["equipped-cosmetics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao equipar"),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando seus Glimers...</p>;
  }

  if (owned.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
        <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Você ainda não desbloqueou nenhum Glimer.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/dashboard/loja">Ir para a Loja Glimer</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {owned.map((row) => {
        const item = row.cosmetic_items;
        const src = resolveCosmeticImage(item.slug, item.image_url);
        const isEquipped = equipped?.glimer_slug === item.slug;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => !isEquipped && equip.mutate(item.id)}
            disabled={isEquipped || equip.isPending}
            className={cn(
              "group relative rounded-lg border-2 overflow-hidden transition-all aspect-square",
              isEquipped
                ? "border-primary shadow-[0_0_12px_hsl(var(--cavern-gold)/0.5)]"
                : "border-border hover:border-primary/60"
            )}
            title={item.name}
          >
            {src ? (
              <img src={src} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-muted flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            {isEquipped && (
              <div className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground p-1">
                <Check className="h-3 w-3" />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-1 text-[10px] font-medium truncate text-center">
              {item.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}