import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Star, Flame } from "lucide-react";

export const FeaturedTables = () => {
  const tables = [
    {
      id: 1,
      title: "Sombras de Arkham",
      system: "Call of Cthulhu 7E",
      master: "Marcus Voidwalker",
      rating: 4.9,
      players: "3/4",
      duration: "4 sessões",
      price: "R$ 150",
      theme: "Terror Cósmico",
      isBoosted: true,
      tags: ["Investigação", "Horror", "Roleplay Pesado"],
    },
    {
      id: 2,
      title: "Crônicas do Reino Perdido",
      system: "D&D 5e",
      master: "Luna Silvermoon",
      rating: 4.8,
      players: "5/6",
      duration: "12 sessões",
      price: "R$ 480",
      theme: "High Fantasy",
      isBoosted: false,
      tags: ["Combate", "Exploração", "Política"],
    },
    {
      id: 3,
      title: "Operação Tempestade",
      system: "Cyberpunk Red",
      master: "Razor Edge",
      rating: 5.0,
      players: "4/5",
      duration: "One-shot",
      price: "Gratuita",
      theme: "Sci-Fi Noir",
      isBoosted: true,
      tags: ["Ação", "Hacking", "Cyberpunk"],
    },
  ];

  return (
    <section id="mesas" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background to-card/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/30">
            <Flame className="w-4 h-4 text-primary animate-glow-pulse" />
            <span className="text-sm font-medium">Mesas em Destaque</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">Aventuras Aguardam</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore mesas criadas por mestres experientes. De one-shots gratuitas a campanhas épicas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {tables.map((table, index) => (
            <Card 
              key={table.id} 
              className="group relative bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-mystical overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Boosted badge */}
              {table.isBoosted && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-gradient-to-r from-primary to-secondary border-0 shadow-[0_4px_20px_hsl(var(--torch-glow)/0.4)]">
                    <Flame className="w-3 h-3 mr-1 animate-glow-pulse" />
                    Boost
                  </Badge>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-mystical" />

              <div className="relative p-6 space-y-4">
                {/* Header */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold group-hover:text-primary transition-mystical">
                    {table.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-primary/30">
                      {table.system}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-secondary/30">
                      {table.theme}
                    </Badge>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {table.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="text-xs px-2 py-1 rounded-full bg-muted/10 text-muted-foreground border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Master info */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold">
                      {table.master.charAt(0)}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{table.master}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        {table.rating}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {table.players}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {table.duration}
                  </div>
                  <div className="text-xs font-bold text-primary text-right">
                    {table.price}
                  </div>
                </div>

                {/* CTA */}
                <Button 
                  variant={table.price === "Gratuita" ? "hero" : "mystical"} 
                  className="w-full"
                  size="sm"
                >
                  Ver Detalhes
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Ver Todas as Mesas
          </Button>
        </div>
      </div>
    </section>
  );
};
