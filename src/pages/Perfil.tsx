import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Dice1 } from "lucide-react";

const Perfil = () => {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0];
  const userType = user?.user_metadata?.user_type;
  const initials = displayName?.substring(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold">Perfil</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações pessoais
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1 bg-gradient-to-br from-card to-card/50 border-primary/50">
            <CardHeader>
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-bold">{displayName}</h3>
                  <Badge variant={userType === 'master' ? 'default' : 'secondary'} className="mt-2">
                    {userType === 'master' ? 'Mestre' : 'Jogador'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm">Avaliação: 4.8/5</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">Membro desde 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Dice1 className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {userType === 'master' ? '0 mesas criadas' : '0 aventuras jogadas'}
                </span>
              </div>
              <Button className="w-full mt-4">Editar Perfil</Button>
            </CardContent>
          </Card>

          {/* Details */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sobre</CardTitle>
                <CardDescription>Informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Usuário</label>
                  <p className="text-muted-foreground capitalize">{userType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Bio</label>
                  <p className="text-muted-foreground">
                    {userType === 'master' 
                      ? 'Mestre apaixonado por criar aventuras épicas!' 
                      : 'Jogador em busca de grandes aventuras!'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {userType === 'master' ? 'Sistemas e Temas' : 'Preferências'}
                </CardTitle>
                <CardDescription>
                  {userType === 'master' 
                    ? 'Seus sistemas e temas favoritos' 
                    : 'Sistemas e temas de interesse'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge>D&D 5e</Badge>
                  <Badge>Fantasia Medieval</Badge>
                  <Badge>Cyberpunk</Badge>
                </div>
              </CardContent>
            </Card>

            {userType === 'master' && (
              <Card>
                <CardHeader>
                  <CardTitle>Avaliações</CardTitle>
                  <CardDescription>O que os jogadores dizem sobre você</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Nenhuma avaliação ainda. Crie suas primeiras mesas para receber feedback!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Perfil;
