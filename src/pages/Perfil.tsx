import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { Star, Clock, Dice1, MapPin, Gamepad2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Perfil = () => {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile(user?.id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const userType = user?.user_metadata?.user_type;
  const isMaster = userType === 'master';
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName?.substring(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-96" />
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                <span className="text-sm">Membro desde {new Date(user?.created_at || Date.now()).getFullYear()}</span>
              </div>
              {isMaster && profile?.experience_years !== null && (
                <div className="flex items-center gap-2">
                  <Dice1 className="h-4 w-4 text-primary" />
                  <span className="text-sm">{profile.experience_years} anos mestrando</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Dice1 className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {isMaster ? `${profile?.active_tables_count || 0} mesas ativas` : '0 aventuras jogadas'}
                </span>
              </div>
              <Button className="w-full mt-4" onClick={() => setEditDialogOpen(true)}>
                Editar Perfil
              </Button>
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
                  <p className="text-muted-foreground capitalize">
                    {isMaster ? 'Mestre' : 'Jogador'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Bio</label>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {profile?.bio || (
                      <span className="italic text-muted-foreground/60">
                        {isMaster 
                          ? 'Adicione uma bio para contar sobre sua experiência como mestre...' 
                          : 'Adicione uma bio para contar sobre você...'}
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {isMaster ? 'Sistemas e Temas' : 'Preferências'}
                </CardTitle>
                <CardDescription>
                  {isMaster 
                    ? 'Sistemas que domina e temas preferidos' 
                    : 'Sistemas e temas de interesse'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Sistemas</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile?.master_systems && profile.master_systems.length > 0 ? (
                      profile.master_systems.map((system, idx) => (
                        <Badge key={idx} variant="secondary">{system}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Nenhum sistema cadastrado
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Temas</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile?.preferred_themes && profile.preferred_themes.length > 0 ? (
                      profile.preferred_themes.map((theme, idx) => (
                        <Badge key={idx} variant="outline">{theme}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Nenhum tema cadastrado
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isMaster && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Plataformas e Configurações</CardTitle>
                    <CardDescription>Como você mestra suas sessões</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Presencial:</span>
                      <span className="text-sm text-muted-foreground">
                        {profile?.plays_in_person ? 'Sim' : 'Apenas online'}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4 text-primary" />
                        Aplicativos Utilizados
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile?.apps_used && profile.apps_used.length > 0 ? (
                          profile.apps_used.map((app, idx) => (
                            <Badge key={idx}>{app}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Nenhum app cadastrado
                          </span>
                        )}
                      </div>
                    </div>
                    {profile?.discord_link && (
                      <div>
                        <label className="text-sm font-medium">Discord</label>
                        <a 
                          href={profile.discord_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline block mt-1"
                        >
                          {profile.discord_link}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

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
              </>
            )}
          </div>
        </div>

        <EditProfileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          userId={user?.id || ''}
          isMaster={isMaster}
        />
      </div>
    </DashboardLayout>
  );
};

export default Perfil;
