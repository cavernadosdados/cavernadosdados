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
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

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
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const noSlots = remainingSlots <= 0;

  const handleApply = async () => {
    if (!user) return;
    if (!message.trim()) {
      toast({ title: 'Escreva uma mensagem', description: 'Diga ao mestre por que você quer participar.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('table_applications').insert({
        table_id: tableId,
        player_id: user.id,
        message: message.trim(),
      });
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
      } else {
        toast({ title: 'Candidatura enviada!', description: 'O mestre irá avaliar sua solicitação.' });
        setMessage('');
        onOpenChange(false);
        onApplied?.();
      }
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleApply} disabled={loading || noSlots}>
              {loading ? 'Enviando...' : noSlots ? 'Sem slots' : 'Enviar Candidatura'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
