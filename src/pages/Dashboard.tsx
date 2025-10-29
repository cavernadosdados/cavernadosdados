import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dice1, Plus, Star, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userType = user?.user_metadata?.user_type;
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold">Bem-vindo, {displayName}!</h1>
          <p className="text-muted-foreground mt-2">
            {userType === 'master' 
              ? 'Gerencie suas mesas e aventuras épicas' 
              : 'Encontre sua próxima aventura na Caverna'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border hover:border-primary transition-mystical">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mesas Ativas</CardTitle>
              <Dice1 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">3</div>
              <p className="text-xs text-muted-foreground">+1 desde o último mês</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary transition-mystical">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userType === 'master' ? 'Jogadores' : 'Sessões'}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">12</div>
              <p className="text-xs text-muted-foreground">Ativos este mês</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary transition-mystical">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">4.8</div>
              <p className="text-xs text-muted-foreground">De 24 avaliações</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content based on user type */}
        {userType === 'master' ? (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-gradient-to-br from-card to-card/50 border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Criar Nova Mesa
                  </CardTitle>
                  <CardDescription>
                    Comece uma nova aventura épica
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => navigate('/dashboard/mesas')}>
                    Criar Mesa
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-card/50 border-secondary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Estatísticas
                  </CardTitle>
                  <CardDescription>
                    Visualizações e engajamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Visualizações</span>
                    <span className="font-bold">247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Taxa de conversão</span>
                    <span className="font-bold">12%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Suas Mesas</CardTitle>
                <CardDescription>Gerencie suas campanhas ativas</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Suas mesas aparecerão aqui. Crie sua primeira mesa para começar!
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Mesas Recomendadas</CardTitle>
                <CardDescription>Baseado nas suas preferências</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Explore mesas incríveis criadas por mestres experientes
                </p>
                <Button className="mt-4" onClick={() => navigate('/dashboard/mesas')}>
                  Explorar Mesas
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Minhas Aventuras</CardTitle>
                <CardDescription>Mesas que você está participando</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Você ainda não participa de nenhuma mesa. Encontre sua primeira aventura!
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
