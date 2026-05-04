import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useSlotBoosts } from '@/hooks/useSlotBoosts';
import { useTokens } from '@/hooks/useTokens';
import { usePriorityApplication } from '@/hooks/useTableBoosts';
import { useNavigate } from 'react-router-dom';
import { Zap, Star, Gem } from 'lucide-react';

interface ApplyTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableTitle: string;
  onApplied?: () => void;
}

export function ApplyTableDialog({ open, onOpenChange, tableId, tableTitle, onApplied }: ApplyTableDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { totalSlots, pendingCount, remainingSlots } = useSlotBoosts();
  const { balance } = useTokens();
  const priorityMutation = usePriorityApplication();
  const [message, setMessage] = useState('');
  const [makePriority, setMakePriority] = useState(false);
  const [loading, setLoading] = useState(false);
  const noSlots = remainingSlots <= 0;
  const canPriority = balance >= 1;

  const handleApply = async () => {
    if (!user) return;
    if (!message.trim()) {
      toast({ title: 'Escreva uma mensagem', description: 'Diga ao mestre por que você quer participar.', variant: 'destructive' });
      return;
    }
    if (makePriority && !canPriority) {
      toast({
        title: 'Sem tokens',
        description: 'Você precisa de 1 token para tornar prioritária.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const { data: inserted, error } = await supabase
        .from('table_applications')
        .insert({
          table_id: tableId,
          player_id: user.id,
          message: message.trim(),
        })
        .select('id')
        .single();
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Já se candidatou', description: 'Você já enviou uma candidatura para esta mesa.', variant: 'destructive' });
        } else if (error.message.includes('pending_limit_reached')) {
          toast({
            title: 'Limite de candidaturas atingido',
            description: `Você já tem ${pendingCount} candidaturas pendentes (limite ${totalSlots}). Compre um boost para aumentar.`,
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      // Optionally apply priority
      if (makePriority && inserted) {
        try {
          await priorityMutation.mutateAsync(inserted.id);
        } catch {
          // toast already shown by mutation onError
        }
      } else {
        toast({ title: 'Candidatura enviada!', description: 'O mestre irá avaliar sua solicitação.' });
      }

      setMessage('');
      setMakePriority(false);
      onOpenChange(false);
      onApplied?.();
    } catch (err: any) {
      toast({ title: 'Erro ao se candidatar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Candidatar-se à mesa</DialogTitle>
          <DialogDescription>{tableTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
              noSlots ? 'border-destructive/50 bg-destructive/10' : 'border-border bg-muted/30'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${noSlots ? 'text-destructive' : 'text-primary'}`} />
              Slots: <strong className="tabular-nums">{pendingCount}/{totalSlots}</strong>
            </span>
            {noSlots && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/dashboard/tokens');
                }}
              >
                Comprar boost
              </Button>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Mensagem para o Mestre</label>
            <Textarea
              placeholder="Conte sobre sua experiência, o que te atraiu nessa mesa..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              disabled={noSlots}
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/500</p>
          </div>

          {/* Priority application opt-in */}
          <button
            type="button"
            onClick={() => canPriority && setMakePriority((v) => !v)}
            disabled={!canPriority || noSlots}
            className={`w-full text-left rounded-md border px-3 py-2.5 transition-all ${
              makePriority
                ? 'border-primary bg-primary/10 shadow-[0_0_12px_-6px_hsl(var(--primary))]'
                : 'border-border bg-muted/20 hover:border-primary/40'
            } ${(!canPriority || noSlots) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  makePriority ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                }`}
              >
                {makePriority && <Star className="h-3 w-3 text-primary-foreground fill-current" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">⭐ Candidatura Prioritária</span>
                  <span className="text-xs flex items-center gap-1 text-primary">
                    <Gem className="h-3 w-3" /> 1 token
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aparece no topo da lista do mestre com um badge dourado.
                </p>
                {!canPriority && (
                  <p className="text-xs text-destructive mt-1">
                    Saldo insuficiente (você tem {balance}).
                  </p>
                )}
              </div>
            </div>
          </button>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleApply} disabled={loading || noSlots}>
              {loading
                ? 'Enviando...'
                : noSlots
                  ? 'Sem slots'
                  : makePriority
                    ? 'Enviar Prioritária (-1 token)'
                    : 'Enviar Candidatura'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
