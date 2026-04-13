import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ApplyTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableTitle: string;
  onApplied?: () => void;
}

export function ApplyTableDialog({ open, onOpenChange, tableId, tableTitle, onApplied }: ApplyTableDialogProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
          <div>
            <label className="text-sm font-medium mb-2 block">Mensagem para o Mestre</label>
            <Textarea
              placeholder="Conte sobre sua experiência, o que te atraiu nessa mesa..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/500</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleApply} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Candidatura'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
