import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ApplyTableDialog } from "@/components/ApplyTableDialog";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { Star, Clock, Dice1, MapPin, Gamepad2, Users, Monitor, Send, ScrollText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Perfil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const viewedUserId = routeUserId || user?.id;
  const isOwnProfile = !routeUserId || routeUserId === user?.id;

  const { profile, isLoading } = useProfile(viewedUserId);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewedEmail, setViewedEmail] = useState<string | null>(null);
  const [viewedCreatedAt, setViewedCreatedAt] = useState<string | null>(null);
  const [applyTable, setApplyTable] = useState<{ id: string; title: string } | null>(null);

  const isMasterProfile = (profile?.user_type ?? user?.user_metadata?.user_type) === 'master';

  // Fetch master's tables (only when viewing a master's profile)
  const { data: masterTables } = useQuery({
    queryKey: ['master-tables', viewedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tables')
        .select('id, title, description, system, theme, duration, max_players, platform, status')
        .eq('master_id', viewedUserId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!viewedUserId && isMasterProfile,
  });

  // For visiting players: which tables have they already applied to?
  const { data: myApplications } = useQuery({
    queryKey: ['my-applications-on-master', user?.id, viewedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_applications')
        .select('table_id, status')
        .eq('player_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !isOwnProfile && isMasterProfile,
  });

  const getAppStatus = (tableId: string) =>
    myApplications?.find((a) => a.table_id === tableId);

  const appStatusLabel: Record<string, string> = {
    pending: 'Candidatura Enviada',
    accepted: 'Aceito',
    rejected: 'Recusado',
  };

  // For other users, we don't have email from auth — just rely on profile data
  useEffect(() => {
    if (isOwnProfile) {
      setViewedEmail(user?.email ?? null);
      setViewedCreatedAt(user?.created_at ?? null);
    } else {
      setViewedEmail(null);
      setViewedCreatedAt(null);
    }
  }, [isOwnProfile, user]);

  const userType = profile?.user_type ?? user?.user_metadata?.user_type;
  const isMaster = userType === 'master';
  const displayName = profile?.display_name || (isOwnProfile ? user?.email?.split('@')[0] : 'Usuário') || 'Usuário';
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
          <h1 className="text-3xl font-bold glow-gold">
            {isOwnProfile ? 'Perfil' : `Perfil de ${displayName}`}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isOwnProfile ? 'Gerencie suas informações pessoais' : 'Visualizando perfil público'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1 bg-gradient-to-br from-card to-card/50 border-primary/50">
            <CardHeader>
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-bold">{displayName}</h3>
                  <Badge variant={isMaster ? 'default' : 'secondary'} className="mt-2">
                    {isMaster ? 'Mestre' : 'Jogador'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm">Avaliação: 4.8/5</span>
              </div>
              {viewedCreatedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">Membro desde {new Date(viewedCreatedAt).getFullYear()}</span>
                </div>
              )}
              {isMaster && profile?.experience_years !== null && profile?.experience_years !== undefined && (
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
              {isOwnProfile && (
                <Button className="w-full mt-4" onClick={() => setEditDialogOpen(true)}>
                  Editar Perfil
                </Button>
              )}
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
                {viewedEmail && (
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-muted-foreground">{viewedEmail}</p>
                  </div>
                )}
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
                        {isOwnProfile
                          ? (isMaster
                            ? 'Adicione uma bio para contar sobre sua experiência como mestre...'
                            : 'Adicione uma bio para contar sobre você...')
                          : 'Sem bio cadastrada.'}
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
                    <CardDescription>Como mestra suas sessões</CardDescription>
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
                    <CardTitle>Mesas Ativas</CardTitle>
                    <CardDescription>
                      {isOwnProfile
                        ? 'Suas mesas em andamento'
                        : `Mesas conduzidas por ${displayName}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!masterTables || masterTables.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhuma mesa ativa no momento.
                      </p>
                    ) : (
                      masterTables.map((t) => {
                        const status = !isOwnProfile ? getAppStatus(t.id) : null;
                        return (
                          <div
                            key={t.id}
                            className="rounded-lg border border-border bg-background/40 p-3 hover:border-primary/50 transition-mystical"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-semibold text-sm">{t.title}</h4>
                              <Badge variant={t.status === 'open' ? 'default' : 'secondary'} className="shrink-0">
                                {t.status === 'open' ? 'Aberta' : 'Fechada'}
                              </Badge>
                            </div>
                            {t.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {t.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Gamepad2 className="h-3 w-3" /> {t.system}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">{t.theme}</Badge>
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Users className="h-3 w-3" /> {t.max_players}
                              </Badge>
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Monitor className="h-3 w-3" /> {t.platform}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-8"
                                onClick={() => navigate(`/dashboard/mesa/${t.id}`)}
                              >
                                <ScrollText className="h-3 w-3" /> Ver Detalhes
                              </Button>
                              {!isOwnProfile && t.status === 'open' && (
                                status ? (
                                  <Badge
                                    variant={status.status === 'accepted' ? 'default' : status.status === 'rejected' ? 'destructive' : 'secondary'}
                                    className="self-center"
                                  >
                                    {appStatusLabel[status.status] || status.status}
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="gap-1 h-8"
                                    onClick={() => setApplyTable({ id: t.id, title: t.title })}
                                  >
                                    <Send className="h-3 w-3" /> Candidatar-se
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Avaliações</CardTitle>
                    <CardDescription>O que os jogadores dizem</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Nenhuma avaliação ainda.
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {isOwnProfile && (
          <EditProfileDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            profile={profile}
            userId={user?.id || ''}
            isMaster={isMaster}
          />
        )}

        {applyTable && (
          <ApplyTableDialog
            open={!!applyTable}
            onOpenChange={(o) => !o && setApplyTable(null)}
            tableId={applyTable.id}
            tableTitle={applyTable.title}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Perfil;
