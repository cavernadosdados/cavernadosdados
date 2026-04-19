import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, X, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TableApplicationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableTitle: string;
}

export function TableApplicationsDialog({ open, onOpenChange, tableId, tableTitle }: TableApplicationsDialogProps) {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['table-applications', tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_applications')
        .select('*, profiles(display_name, avatar_url)')
        .eq('table_id', tableId)
        // Priority first, then by priority_at desc, then by created_at asc (older first within same priority)
        .order('is_priority', { ascending: false })
        .order('priority_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Candidaturas</DialogTitle>
          <DialogDescription>{tableTitle}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : applications && applications.length > 0 ? (
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
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={app.profiles?.avatar_url} />
                      <AvatarFallback>{app.profiles?.display_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
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
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma candidatura ainda.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
