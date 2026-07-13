import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ApplyTableDialog } from "@/components/ApplyTableDialog";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlimerAvatar } from "@/components/GlimerAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Clock, Dice1, MapPin, Gamepad2, Users, Monitor, Send, ScrollText } from "lucide-react";
import { ReportTableButton } from "@/components/ReportTableButton";
import { Skeleton } from "@/components/ui/skeleton";
import { ReliabilityBadge } from "@/components/ReliabilityBadge";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";
import { resolveCosmeticImage } from "@/lib/glimers";

type ReceivedFeedback = {
  id: string;
  reviewer_role: string;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  compliments: string[] | null;
  comment: string | null;
  created_at: string;
  session_number: number;
};

const Perfil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const viewedUserId = routeUserId || user?.id;
  const isOwnProfile = !routeUserId || routeUserId === user?.id;

  const { profile, isLoading } = useProfile(viewedUserId);
  const { data: equippedCosmetics } = useEquippedCosmetics(viewedUserId);
  const coverSrc =
    resolveCosmeticImage(equippedCosmetics?.cover_slug) ??
    equippedCosmetics?.cover_image_url ??
    null;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const [viewedEmail, setViewedEmail] = useState<string | null>(null);
  const [viewedCreatedAt, setViewedCreatedAt] = useState<string | null>(null);
  const [applyTable, setApplyTable] = useState<{ id: string; title: string } | null>(null);

  // Always fetch tables this user mastered — capability is derived from data,
  // not from a global role flag.
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
    enabled: !!viewedUserId,
  });

  // Count campaigns this user participated in as accepted player.
  const { data: playerCampaignsCount } = useQuery({
    queryKey: ['player-campaigns-count', viewedUserId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('table_applications')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', viewedUserId!)
        .eq('status', 'accepted');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!viewedUserId,
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
    enabled: !!user && !isOwnProfile && (masterTables?.length ?? 0) > 0,
  });

  const getAppStatus = (tableId: string) =>
    myApplications?.find((a) => a.table_id === tableId);

  const { data: receivedFeedback = [] } = useQuery({
    queryKey: ['profile-feedback', viewedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_feedback')
        .select('id, reviewer_role, rating_1, rating_2, rating_3, compliments, comment, created_at, session_number')
        .eq('reviewed_id', viewedUserId!)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      return data as ReceivedFeedback[];
    },
    enabled: !!viewedUserId,
  });

  const feedbackCount = receivedFeedback.length;
  const ratingAverage = feedbackCount
    ? receivedFeedback.reduce((sum, feedback) => {
        return sum + (feedback.rating_1 + feedback.rating_2 + feedback.rating_3) / 3;
      }, 0) / feedbackCount
    : null;

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

  // Derived capabilities — anyone can be both a master and a player.
  const masterTablesCount = masterTables?.length ?? 0;
  const hasMasterContent =
    masterTablesCount > 0 ||
    (profile?.master_systems?.length ?? 0) > 0 ||
    (profile?.apps_used?.length ?? 0) > 0 ||
    (profile?.experience_years ?? 0) > 0 ||
    !!profile?.discord_link;
  const playerCount = playerCampaignsCount ?? 0;
  const hasPlayerContent = playerCount > 0;

  const masterFeedback = receivedFeedback.filter((f) => f.reviewer_role === 'player');
  const playerFeedback = receivedFeedback.filter((f) => f.reviewer_role === 'master');

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
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-mystical">
          <div className="relative h-40 sm:h-56 w-full bg-gradient-to-br from-muted via-card to-muted">
            {coverSrc && (
              <img
                src={coverSrc}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          </div>
          <div className="relative px-6 pb-5 pt-3">
            <h1 className="text-3xl font-bold glow-gold">
              {isOwnProfile ? 'Perfil' : `Perfil de ${displayName}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isOwnProfile
                ? 'Gerencie suas informações pessoais e personalize sua aparência na Loja Glimer.'
                : 'Visualizando perfil público'}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1 bg-gradient-to-br from-card to-card/50 border-primary/50">
            <CardHeader>
              <div className="flex flex-col items-center space-y-4">
                <GlimerAvatar
                  userId={viewedUserId}
                  fallbackText={initials}
                  className="h-24 w-24"
                  onClick={() => setAvatarZoomOpen(true)}
                />
                <div className="text-center">
                  <h3 className="text-xl font-bold">{displayName}</h3>
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {hasMasterContent && (
                      <Badge variant="default">
                        {masterTablesCount > 0
                          ? `Mestre de ${masterTablesCount} ${masterTablesCount === 1 ? 'mesa' : 'mesas'}`
                          : 'Mestre'}
                      </Badge>
                    )}
                    {hasPlayerContent && (
                      <Badge variant="secondary">
                        Jogador em {playerCount} {playerCount === 1 ? 'campanha' : 'campanhas'}
                      </Badge>
                    )}
                    {!hasMasterContent && !hasPlayerContent && (
                      <Badge variant="outline">Aventureiro</Badge>
                    )}
                  </div>
                  {viewedUserId && (
                    <div className="mt-3 flex justify-center">
                      <ReliabilityBadge playerId={viewedUserId} />
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {ratingAverage ? `Avaliação: ${ratingAverage.toFixed(1)}/5 (${feedbackCount})` : 'Sem avaliações ainda'}
                </span>
              </div>
              {viewedCreatedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">Membro desde {new Date(viewedCreatedAt).getFullYear()}</span>
                </div>
              )}
              {hasMasterContent && profile?.experience_years !== null && profile?.experience_years !== undefined && profile.experience_years > 0 && (
                <div className="flex items-center gap-2">
                  <Dice1 className="h-4 w-4 text-primary" />
                  <span className="text-sm">{profile.experience_years} anos mestrando</span>
                </div>
              )}
              {(hasMasterContent || hasPlayerContent) && (
                <div className="flex items-center gap-2">
                  <Dice1 className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {hasMasterContent && `${profile?.active_tables_count || masterTablesCount} mesas ativas`}
                    {hasMasterContent && hasPlayerContent && ' • '}
                    {hasPlayerContent && `${playerCount} ${playerCount === 1 ? 'aventura' : 'aventuras'} jogadas`}
                  </span>
                </div>
              )}
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
                  <label className="text-sm font-medium">Bio</label>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {profile?.bio || (
                      <span className="italic text-muted-foreground/60">
                        {isOwnProfile
                          ? 'Adicione uma bio para contar sobre você, sua experiência como mestre ou como jogador...'
                          : 'Sem bio cadastrada.'}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Disponibilidade
                  </label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Dias</p>
                      <div className="flex flex-wrap gap-2">
                        {profile?.availability_days && profile.availability_days.length > 0 ? (
                          profile.availability_days.map((d, idx) => (
                            <Badge key={idx} variant="secondary">{d}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Não informado
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Períodos</p>
                      <div className="flex flex-wrap gap-2">
                        {profile?.availability_periods && profile.availability_periods.length > 0 ? (
                          profile.availability_periods.map((p, idx) => (
                            <Badge key={idx} variant="outline" className="capitalize">{p}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Não informado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sistemas e Temas</CardTitle>
                <CardDescription>Sistemas e temas que joga ou mestra</CardDescription>
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

            {hasMasterContent && (
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
                                onClick={() => navigate(`/dashboard/mesa/${t.id}/detalhes`)}
                              >
                                <ScrollText className="h-3 w-3" /> Ver Detalhes
                              </Button>
                              {!isOwnProfile && (
                                <ReportTableButton
                                  tableId={t.id}
                                  tableTitle={t.title}
                                  variant="menu-item"
                                  className="h-8 text-muted-foreground hover:text-destructive"
                                />
                              )}
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
              </>
            )}

            <Card>
                  <CardHeader>
                    <CardTitle>Avaliações</CardTitle>
                    <CardDescription>
                      Feedbacks reais recebidos após sessões — separados por papel
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ratingAverage && (
                      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                        <div className="flex items-center gap-1 text-primary">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= Math.round(ratingAverage) ? 'fill-current' : 'text-muted-foreground/30'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{ratingAverage.toFixed(1)} de 5</span>
                        <span className="text-sm text-muted-foreground">
                          {feedbackCount} {feedbackCount === 1 ? 'avaliação recebida' : 'avaliações recebidas'}
                        </span>
                      </div>
                    )}

                    {receivedFeedback.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Nenhuma avaliação disponível para você visualizar ainda.
                      </p>
                    ) : (
                      <Tabs defaultValue={masterFeedback.length >= playerFeedback.length ? 'master' : 'player'}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="master">
                            Como Mestre ({masterFeedback.length})
                          </TabsTrigger>
                          <TabsTrigger value="player">
                            Como Jogador ({playerFeedback.length})
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="master" className="space-y-3 mt-4">
                          {masterFeedback.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                              Nenhuma avaliação como mestre ainda.
                            </p>
                          ) : (
                            masterFeedback.map((feedback) => (
                              <FeedbackItem key={feedback.id} feedback={feedback} />
                            ))
                          )}
                        </TabsContent>
                        <TabsContent value="player" className="space-y-3 mt-4">
                          {playerFeedback.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                              Nenhuma avaliação como jogador ainda.
                            </p>
                          ) : (
                            playerFeedback.map((feedback) => (
                              <FeedbackItem key={feedback.id} feedback={feedback} />
                            ))
                          )}
                        </TabsContent>
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
          </div>
        </div>

        <Dialog open={avatarZoomOpen} onOpenChange={setAvatarZoomOpen}>
          <DialogContent className="flex flex-col items-center justify-center border-border bg-card/95 backdrop-blur-sm sm:max-w-sm">
            <DialogTitle className="sr-only">Imagem de perfil ampliada</DialogTitle>
            <GlimerAvatar
              userId={viewedUserId}
              fallbackText={initials}
              className="h-64 w-64"
            />
          </DialogContent>
        </Dialog>

        {isOwnProfile && user?.id && (
          <EditProfileDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            profile={profile}
            userId={user.id}
            isMaster={hasMasterContent}
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

const FeedbackItem = ({ feedback }: { feedback: ReceivedFeedback }) => {
  const score = (feedback.rating_1 + feedback.rating_2 + feedback.rating_3) / 3;
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-current text-primary" />
          <span className="text-sm font-semibold">{score.toFixed(1)}/5</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Sessão #{feedback.session_number} • {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
        </span>
      </div>
      {feedback.compliments && feedback.compliments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {feedback.compliments.map((compliment) => (
            <Badge key={compliment} variant="outline" className="text-xs">
              {compliment}
            </Badge>
          ))}
        </div>
      )}
      {feedback.comment && (
        <p className="mt-3 text-sm text-muted-foreground">“{feedback.comment}”</p>
      )}
    </div>
  );
};

export default Perfil;
