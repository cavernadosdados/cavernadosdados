import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Users, Clock, Monitor, Gamepad2, Coins, Compass } from "lucide-react";
import { CoverImage } from "@/components/CoverImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useFavoriteTables } from "@/hooks/useFavorites";
import { formatPriceBRL, isFreeTable } from "@/lib/price";

const Favoritos = () => {
  const navigate = useNavigate();
  const { data: favorites, isLoading } = useFavoriteTables();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold glow-gold flex items-center gap-2">
              <Heart className="h-7 w-7 text-primary fill-primary/40" />
              Mesas Favoritas
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Mesas que você quer acompanhar de perto.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/explorar")} className="gap-2">
            <Compass className="h-4 w-4" />
            Explorar mesas
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : !favorites || favorites.length === 0 ? (
          <Card className="bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-10 text-center space-y-3">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <h3 className="text-xl font-bold">Nenhuma mesa favoritada ainda</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Use o ícone de coração nos cards de Explorar para guardar mesas que você quer acompanhar.
              </p>
              <Button onClick={() => navigate("/dashboard/explorar")} className="gap-2 mt-2">
                <Compass className="h-4 w-4" /> Ir para Explorar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {favorites.map((table: any) => (
              <Card
                key={table.id}
                className="group relative rounded-2xl border-border overflow-hidden transition-all duration-300 hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 min-h-[280px] flex"
              >
                <CoverImage
                  src={table.cover_url}
                  alt={`Capa de ${table.title}`}
                  className="absolute inset-0 h-full w-full brightness-[0.45] transition-all duration-500 group-hover:brightness-[0.6] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20" />

                <div className="absolute top-3 right-3 z-20">
                  <FavoriteButton tableId={table.id} />
                </div>

                <div className="relative z-10 flex flex-col justify-end w-full p-4 sm:p-6 gap-3 text-white">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2">
                      {table.title}
                    </h3>
                    {table.profiles && (
                      <p className="text-sm text-white/80 mt-1">
                        Mestre: <span className="font-medium">{table.profiles.display_name}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1 text-xs h-6 px-2 bg-black/40 border-white/20 text-white backdrop-blur-sm font-normal">
                      <Gamepad2 className="h-3 w-3" /> {table.system}
                    </Badge>
                    <Badge variant="outline" className="text-xs h-6 px-2 bg-black/40 border-white/20 text-white backdrop-blur-sm font-normal">
                      {table.theme}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-xs h-6 px-2 bg-black/40 border-white/20 text-white backdrop-blur-sm font-normal">
                      <Clock className="h-3 w-3" /> {table.duration}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-xs h-6 px-2 bg-black/40 border-white/20 text-white backdrop-blur-sm font-normal">
                      <Monitor className="h-3 w-3" /> {table.platform}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`gap-1 text-xs h-6 px-2 backdrop-blur-sm font-semibold ${
                        isFreeTable(table.price_cents)
                          ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-100"
                          : "bg-primary/25 border-primary/50 text-white"
                      }`}
                    >
                      <Coins className="h-3 w-3" />
                      {formatPriceBRL(table.price_cents)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/20 text-white border border-primary/40 backdrop-blur-sm">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">até {table.max_players}</span>
                      <span className="text-xs opacity-80">vagas</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      size="default"
                      className="gap-2 w-full sm:flex-1 h-10 font-semibold"
                      onClick={() => navigate(`/dashboard/mesa/${table.id}/detalhes`)}
                    >
                      Abrir mesa
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Favoritos;