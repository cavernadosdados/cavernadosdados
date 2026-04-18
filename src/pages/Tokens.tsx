import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gem, Zap, Crown, TrendingUp, Clock } from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import { useSlotBoosts } from "@/hooks/useSlotBoosts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const Tokens = () => {
  const { balance } = useTokens();
  const {
    boosts,
    totalSlots,
    pendingCount,
    remainingSlots,
    buyBoost,
    isBuying,
  } = useSlotBoosts();

  const canBuyBoost = balance >= 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold">Loja de Tokens</h1>
          <p className="text-muted-foreground mt-2">
            Use tokens para criar mesas e aumentar seus slots de candidatura.
          </p>
        </div>

        {/* Current Balance */}
        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle>Seu Saldo</CardTitle>
            <CardDescription>Tokens disponíveis para uso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-primary tabular-nums">{balance}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {balance === 1 ? "Token disponível" : "Tokens disponíveis"}
                </p>
              </div>
              <Gem className="h-12 w-12 text-primary/30" />
            </div>
          </CardContent>
        </Card>

        {/* Slot Boost — uso prático imediato */}
        <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/40">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Boost de Slots de Candidatura
                </CardTitle>
                <CardDescription className="mt-1">
                  Cada jogador pode ter até 3 candidaturas pendentes. Compre slots extras.
                </CardDescription>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-primary tabular-nums">
                  {pendingCount}/{totalSlots}
                </div>
                <p className="text-xs text-muted-foreground">
                  {remainingSlots > 0 ? `${remainingSlots} disponíveis` : "Sem slots livres"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-card/50 p-4">
              <div className="min-w-0">
                <p className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  +3 slots por 7 dias
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Permite até 3 candidaturas pendentes a mais durante uma semana. Acumulável.
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end font-bold text-primary">
                  <Gem className="h-4 w-4" />1 token
                </div>
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={!canBuyBoost || isBuying}
                  onClick={() => buyBoost()}
                >
                  {isBuying ? "Ativando..." : canBuyBoost ? "Comprar boost" : "Sem tokens"}
                </Button>
              </div>
            </div>

            {boosts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Seus boosts ativos
                </p>
                <ul className="space-y-1">
                  {boosts.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between text-sm rounded-md bg-muted/30 px-3 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        +{b.slots_added} slots
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock className="h-3 w-3" />
                        expira{" "}
                        {formatDistanceToNow(new Date(b.expires_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Token Packages — placeholder até pagamentos reais */}
        <div>
          <h2 className="text-xl font-bold mb-3">Comprar tokens</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Pagamentos reais em breve. Por enquanto, todos ganham 3 tokens de boas-vindas.
          </p>
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
                  <li>• Cria 10 mesas</li>
                  <li>• Ou 10 boosts de slots</li>
                  <li>• Sem expiração</li>
                </ul>
                <Button className="w-full" disabled>
                  Em breve
                </Button>
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
                  <li>• Cria 30 mesas</li>
                  <li>• Ou 30 boosts de slots</li>
                  <li>• Sem expiração</li>
                </ul>
                <Button className="w-full" disabled>
                  Em breve
                </Button>
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
                  <li>• Cria 100 mesas</li>
                  <li>• Ou 100 boosts de slots</li>
                  <li>• Suporte prioritário</li>
                </ul>
                <Button className="w-full" disabled>
                  Em breve
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How tokens work */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Como funcionam os tokens?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Para Mestres</h4>
                <p className="text-sm text-muted-foreground">
                  Criar uma mesa custa <strong>1 token</strong>. Isso evita mesas-fantasma e mantém o feed
                  limpo. Você ganhou 3 tokens de boas-vindas para começar.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Para Jogadores</h4>
                <p className="text-sm text-muted-foreground">
                  Candidatar-se é grátis, mas você só pode ter <strong>3 candidaturas pendentes</strong> ao
                  mesmo tempo. Compre boosts (+3 slots por 7 dias) para se candidatar a mais mesas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Tokens;
