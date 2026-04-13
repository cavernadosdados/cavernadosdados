import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Clock, Monitor, Gamepad2 } from "lucide-react";
import { CreateTableDialog } from "@/components/CreateTableDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const Mesas = () => {
  const { user } = useAuth();
  const userType = user?.user_metadata?.user_type;
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tables, isLoading, refetch } = useQuery({
    queryKey: ['tables', userType === 'master' ? user?.id : 'all'],
    queryFn: async () => {
      let query = supabase.from('tables').select('*, profiles(display_name, avatar_url)');
      if (userType === 'master') {
        query = query.eq('master_id', user!.id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Criar Nova Mesa
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : tables && tables.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tables.map((table: any) => (
              <Card key={table.id} className="bg-card border-border hover:border-primary transition-all">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{table.title}</CardTitle>
                    <Badge variant={table.status === 'open' ? 'default' : 'secondary'}>
                      {table.status === 'open' ? 'Aberta' : 'Fechada'}
                    </Badge>
                  </div>
                  {userType !== 'master' && table.profiles && (
                    <p className="text-xs text-muted-foreground">
                      Mestre: {table.profiles.display_name}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {table.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{table.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Gamepad2 className="h-3 w-3" /> {table.system}
                    </Badge>
                    <Badge variant="outline">{table.theme}</Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" /> {table.duration}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" /> {table.max_players} jogadores
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Monitor className="h-3 w-3" /> {table.platform}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
              {userType === 'master' && (
                <Button onClick={() => setCreateOpen(true)}>Criar Primeira Mesa</Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateTableDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refetch} />
    </DashboardLayout>
  );
};

export default Mesas;
