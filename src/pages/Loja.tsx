import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gem, Sparkles, Check, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTokens } from "@/hooks/useTokens";
import { toast } from "sonner";
import { resolveCosmeticImage, RARITY_STYLES } from "@/lib/glimers";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";
import { cn } from "@/lib/utils";

interface CosmeticItem {
  id: string;
  slug: string;
  kind: "glimer" | "frame" | "cover" | "theme";
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  price_tokens: number | null;
  unlock_rule: { type: string; value?: any };
  linked_theme_slug: string | null;
  sort_order: number;
}

const KIND_LABELS: Record<string, string> = {
  glimer: "Glimers",
  frame: "Molduras",
  cover: "Capas",
  theme: "Temas",
};

const Loja = () => {
  const { user } = useAuth();
  const { balance } = useTokens();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cosmetic-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cosmetic_items")
        .select("id, slug, kind, name, description, rarity, price_tokens, unlock_rule, linked_theme_slug, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as CosmeticItem[];
    },
  });

  const { data: owned = [] } = useQuery({
    queryKey: ["user-cosmetics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_cosmetics")
        .select("item_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.item_id);
    },
  });

  const { data: equipped } = useEquippedCosmetics(user?.id);

  const purchase = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.rpc("purchase_cosmetic", { _item_id: itemId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Item comprado!");
      queryClient.invalidateQueries({ queryKey: ["user-cosmetics"] });
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("insufficient") ? "Tokens insuficientes" : (e?.message ?? "Erro ao comprar");
      toast.error(msg);
    },
  });

  const equip = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc("equip_cosmetic", { _item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipado!");
      queryClient.invalidateQueries({ queryKey: ["equipped-cosmetics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao equipar"),
  });

  const ownedSet = new Set(owned);

  const isEquipped = (item: CosmeticItem) => {
    if (!equipped) return false;
    if (item.kind === "glimer" && equipped.glimer_slug === item.slug) return true;
    if (item.kind === "theme" && equipped.theme_slug === item.slug) return true;
    if (item.kind === "frame" && equipped.frame_slug === item.slug) return true;
    if (item.kind === "cover" && equipped.cover_slug === item.slug) return true;
    return false;
  };

  const renderItem = (item: CosmeticItem) => {
    const ownedItem = ownedSet.has(item.id);
    const rarityStyle = RARITY_STYLES[item.rarity];
    const rule = item.unlock_rule;
    const imageSrc = item.kind === "glimer" ? resolveCosmeticImage(item.slug) : undefined;
    const equippedNow = isEquipped(item);

    return (
      <Card key={item.id} className="overflow-hidden transition-mystical hover:border-primary/50">
        <div className="aspect-square relative bg-muted/30 flex items-center justify-center">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={item.name}
              loading="lazy"
              className={cn("h-full w-full object-cover", !ownedItem && "grayscale opacity-60")}
            />
          ) : item.kind === "theme" ? (
            <ThemePreview slug={item.slug} />
          ) : (
            <Sparkles className="h-12 w-12 text-muted-foreground" />
          )}
          <Badge className={cn("absolute top-2 right-2 text-[10px]", rarityStyle.badge)}>
            {rarityStyle.label}
          </Badge>
          {equippedNow && (
            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
              <Check className="h-3 w-3 mr-1" /> Em uso
            </Badge>
          )}
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{item.name}</CardTitle>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        </CardHeader>
        <CardContent className="pt-0">
          {ownedItem ? (
            <Button
              size="sm"
              className="w-full"
              variant={equippedNow ? "outline" : "default"}
              disabled={equippedNow || equip.isPending}
              onClick={() => equip.mutate(item.id)}
            >
              {equippedNow ? "Em uso" : "Equipar"}
            </Button>
          ) : rule.type === "xp" ? (
            <Button size="sm" variant="outline" className="w-full" disabled>
              <Lock className="h-3 w-3 mr-1" /> {rule.value} XP
            </Button>
          ) : rule.type === "achievement" ? (
            <Button size="sm" variant="outline" className="w-full" disabled>
              <Lock className="h-3 w-3 mr-1" /> Conquista
            </Button>
          ) : item.price_tokens ? (
            <Button
              size="sm"
              className="w-full"
              disabled={balance < item.price_tokens || purchase.isPending}
              onClick={() => purchase.mutate(item.id)}
            >
              <Gem className="h-3 w-3 mr-1" /> {item.price_tokens}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  const byKind = (kind: string) => items.filter((i) => i.kind === kind);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold glow-gold">Loja Glimer</h1>
            <p className="text-muted-foreground mt-1">
              Personalize seu perfil com Glimers, molduras, capas e temas.
            </p>
          </div>
          <Card className="px-4 py-2 flex items-center gap-2">
            <Gem className="h-5 w-5 text-primary" />
            <span className="font-bold tabular-nums text-lg">{balance}</span>
            <span className="text-xs text-muted-foreground">tokens</span>
          </Card>
        </div>

        <Tabs defaultValue="glimer">
          <TabsList>
            {(["glimer", "theme", "frame", "cover"] as const).map((k) => (
              <TabsTrigger key={k} value={k} disabled={k === "frame" || k === "cover"}>
                {KIND_LABELS[k]}
                {(k === "frame" || k === "cover") && (
                  <span className="ml-2 text-[10px] opacity-60">em breve</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {(["glimer", "theme", "frame", "cover"] as const).map((k) => (
            <TabsContent key={k} value={k} className="mt-6">
              {isLoading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : byKind(k).length === 0 ? (
                <p className="text-muted-foreground">Em breve.</p>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {byKind(k).map(renderItem)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

function ThemePreview({ slug }: { slug: string }) {
  // Tiny visual chip preview based on theme registry
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getThemeBySlug } = require("@/lib/themes");
  const theme = getThemeBySlug(slug);
  if (!theme) return <Sparkles className="h-12 w-12 text-muted-foreground" />;
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: theme.preview.background }}
    >
      <div className="flex gap-2">
        <div className="h-8 w-8 rounded-full" style={{ background: theme.preview.primary }} />
        <div className="h-8 w-8 rounded-full" style={{ background: theme.preview.secondary }} />
      </div>
    </div>
  );
}

export default Loja;