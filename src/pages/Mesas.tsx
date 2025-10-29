import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Play } from "lucide-react";

const Mesas = () => {
  const { user } = useAuth();
  const userType = user?.user_metadata?.user_type;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold glow-gold">
              {userType === 'master' ? 'Minhas Mesas' : 'Mesas Disponíveis'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {userType === 'master' 
                ? 'Gerencie suas campanhas e sessões' 
                : 'Encontre e participe de aventuras'}
            </p>
          </div>
          {userType === 'master' && (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Nova Mesa
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userType === 'master' ? 'Total de Mesas' : 'Participando'}
              </CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">0</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userType === 'master' ? 'Jogadores' : 'Próxima Sessão'}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {userType === 'master' ? '0' : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">--</div>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle>
              {userType === 'master' ? 'Nenhuma mesa criada ainda' : 'Nenhuma mesa encontrada'}
            </CardTitle>
            <CardDescription>
              {userType === 'master' 
                ? 'Comece criando sua primeira mesa épica!' 
                : 'Explore o catálogo e encontre sua aventura perfeita'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              {userType === 'master' ? 'Criar Primeira Mesa' : 'Explorar Catálogo'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Mesas;
