import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlimerAvatar } from '@/components/GlimerAvatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, X, Star, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TableApplicationsListProps {
  tableId: string;
}

export function TableApplicationsList({ tableId }: TableApplicationsListProps) {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['table-applications', tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_applications')
        .select('*, profiles(id, display_name)')
        .eq('table_id', tableId)
        .order('is_priority', { ascending: false })
        .order('priority_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tableId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('table_applications')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['table-applications', tableId] });
      queryClient.invalidateQueries({ queryKey: ['accepted_players', tableId] });
      queryClient.invalidateQueries({ queryKey: ['accepted-counts'] });
      toast({
        title: status === 'accepted' ? 'Jogador aceito!' : 'Candidatura recusada',
      });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    accepted: 'Aceito',
    rejected: 'Recusado',
  };

  const statusVariant = (s: string) => {
    if (s === 'accepted') return 'default' as const;
    if (s === 'rejected') return 'destructive' as const;
    return 'secondary' as const;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Nenhuma candidatura ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app: any) => (
        <div
          key={app.id}
          className={`border rounded-lg p-4 space-y-2 ${
            app.is_priority
              ? 'border-primary/60 bg-primary/5 shadow-[0_0_12px_-6px_hsl(var(--primary))]'
              : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <GlimerAvatar
                userId={app.profiles?.id ?? app.player_id}
                fallbackText={app.profiles?.display_name ?? "?"}
                label={app.profiles?.display_name ?? "Jogador"}
                className="h-8 w-8"
              />
              <span className="font-medium text-sm truncate">{app.profiles?.display_name || 'Jogador'}</span>
              {app.is_priority && (
                <Badge className="gap-1 bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 shrink-0">
                  <Star className="h-3 w-3 fill-current" /> Prioritário
                </Badge>
              )}
            </div>
            <Badge variant={statusVariant(app.status)}>
              {statusLabel[app.status] || app.status}
            </Badge>
          </div>
          {app.message && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{app.message}</p>
          )}
          {app.status === 'pending' && (
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => updateStatus.mutate({ id: app.id, status: 'rejected' })}
                disabled={updateStatus.isPending}
              >
                <X className="h-3 w-3" /> Recusar
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => updateStatus.mutate({ id: app.id, status: 'accepted' })}
                disabled={updateStatus.isPending}
              >
                <Check className="h-3 w-3" /> Aceitar
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}