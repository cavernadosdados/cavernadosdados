import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gem, Zap, Crown, TrendingUp } from "lucide-react";

const Tokens = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold">Loja de Tokens</h1>
          <p className="text-muted-foreground mt-2">
            Impulsione suas mesas e destaque-se na plataforma
          </p>
        </div>

        {/* Token Packages */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-card to-card/50 border-primary/50 hover:border-primary transition-mystical">
            <CardHeader>
              <Gem className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Pacote Básico</CardTitle>
              <CardDescription>10 Tokens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-primary">R$ 19,90</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 1 boost de 24h</li>
                <li>• Destaque em busca</li>
                <li>• Selo de qualidade</li>
              </ul>
              <Button className="w-full">Comprar</Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-card border-primary hover:shadow-gold transition-mystical scale-105">
            <CardHeader>
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Pacote Popular</CardTitle>
              <CardDescription>30 Tokens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-primary">
                R$ 49,90
                <span className="text-sm text-muted-foreground ml-2">Economize 15%</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 3 boosts de 24h</li>
                <li>• Destaque premium</li>
                <li>• Análise de estatísticas</li>
                <li>• Selo PRO temporário</li>
              </ul>
              <Button className="w-full">Comprar</Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-secondary/50 hover:border-secondary transition-mystical">
            <CardHeader>
              <Crown className="h-8 w-8 text-secondary mb-2" />
              <CardTitle>Pacote Master</CardTitle>
              <CardDescription>100 Tokens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-primary">
                R$ 149,90
                <span className="text-sm text-muted-foreground ml-2">Economize 25%</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 12 boosts de 24h</li>
                <li>• Destaque VIP</li>
                <li>• Estatísticas avançadas</li>
                <li>• Selo PRO por 1 mês</li>
                <li>• Suporte prioritário</li>
              </ul>
              <Button className="w-full">Comprar</Button>
            </CardContent>
          </Card>
        </div>

        {/* Boost Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Como Funcionam os Boosts?
            </CardTitle>
            <CardDescription>
              Maximize a visibilidade das suas mesas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Destaque em Busca</h4>
                <p className="text-sm text-muted-foreground">
                  Sua mesa aparece nos primeiros resultados quando jogadores procuram por aventuras
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Selo de Qualidade</h4>
                <p className="text-sm text-muted-foreground">
                  Ganhe credibilidade com um selo especial que destaca sua mesa
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Estatísticas</h4>
                <p className="text-sm text-muted-foreground">
                  Acompanhe visualizações, cliques e conversões em tempo real
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Visibilidade Premium</h4>
                <p className="text-sm text-muted-foreground">
                  Apareça na seção de destaques da página inicial por 24 horas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Balance */}
        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle>Seu Saldo</CardTitle>
            <CardDescription>Tokens disponíveis para uso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-primary">0</div>
                <p className="text-sm text-muted-foreground mt-1">Tokens disponíveis</p>
              </div>
              <Gem className="h-12 w-12 text-primary/30" />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Tokens;
