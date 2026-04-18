import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useTokens } from '@/hooks/useTokens';
import { useNavigate } from 'react-router-dom';
import { Gem } from 'lucide-react';

const RPG_SYSTEMS = [
  'D&D 5e', 'D&D 3.5', 'Pathfinder 1e', 'Pathfinder 2e', 'Tormenta20',
  'Call of Cthulhu', 'Vampiro: A Máscara', 'GURPS', 'Savage Worlds',
  'Fate', 'Blades in the Dark', 'Mork Borg', 'Old Dragon', 'Ordem Paranormal',
  'Outro',
];

const THEMES = [
  'Fantasia Medieval', 'Terror/Horror', 'Ficção Científica', 'Cyberpunk',
  'Steampunk', 'Pós-Apocalíptico', 'Investigação', 'Comédia',
  'Dark Fantasy', 'Aventura', 'Drama', 'Outro',
];

const PLATFORMS = [
  'Discord', 'Roll20', 'Foundry VTT', 'Fantasy Grounds',
  'Presencial', 'Google Meet', 'Zoom', 'Outro',
];

const DURATIONS = [
  '1-2 horas', '2-3 horas', '3-4 horas', '4-5 horas', '5+ horas',
];

const tableSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().min(10, 'Descreva melhor sua mesa (mín. 10 caracteres)'),
  system: z.string().min(1, 'Selecione um sistema'),
  theme: z.string().min(1, 'Selecione um tema'),
  duration: z.string().min(1, 'Selecione a duração'),
  max_players: z.coerce.number().min(1).max(20),
  platform: z.string().min(1, 'Selecione a plataforma'),
});

type TableFormData = z.infer<typeof tableSchema>;

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTableDialog({ open, onOpenChange, onCreated }: CreateTableDialogProps) {
  const { user } = useAuth();
  const { balance } = useTokens();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const hasTokens = balance > 0;

  const form = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      title: '',
      description: '',
      system: '',
      theme: '',
      duration: '',
      max_players: 4,
      platform: '',
    },
  });

  const onSubmit = async (data: TableFormData) => {
    if (!user) return;
    if (!hasTokens) {
      toast({
        title: 'Sem tokens',
        description: 'Você precisa de pelo menos 1 token para criar uma mesa.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      // 1. Cria a mesa
      const { data: created, error: insertError } = await supabase
        .from('tables')
        .insert({
          master_id: user.id,
          title: data.title,
          description: data.description,
          system: data.system,
          theme: data.theme,
          duration: data.duration,
          max_players: data.max_players,
          platform: data.platform,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 2. Cobra 1 token (atômico). Se falhar, desfaz a mesa.
      const { error: spendError } = await supabase.rpc('spend_tokens', {
        _amount: 1,
        _reason: 'create_table',
        _related_table_id: created.id,
      });

      if (spendError) {
        await supabase.from('tables').delete().eq('id', created.id);
        if (spendError.message.includes('insufficient_tokens')) {
          toast({
            title: 'Sem tokens',
            description: 'Saldo insuficiente para criar a mesa.',
            variant: 'destructive',
          });
        } else {
          throw spendError;
        }
        return;
      }

      toast({ title: 'Mesa criada!', description: 'Sua mesa foi criada com sucesso. (-1 token)' });
      form.reset();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({ title: 'Erro ao criar mesa', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Mesa</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da sua mesa de RPG. Custa <strong>1 token</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${hasTokens ? 'border-border bg-muted/30' : 'border-destructive/50 bg-destructive/10'}`}>
          <span className="flex items-center gap-2">
            <Gem className={`h-4 w-4 ${hasTokens ? 'text-primary' : 'text-destructive'}`} />
            Saldo atual: <strong className="tabular-nums">{balance}</strong> {balance === 1 ? 'token' : 'tokens'}
          </span>
          {!hasTokens && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                navigate('/dashboard/tokens');
              }}
            >
              Comprar tokens
            </Button>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Mesa</FormLabel>
                <FormControl><Input placeholder="Ex: A Maldição de Strahd" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea placeholder="Descreva sua aventura..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="system" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sistema</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RPG_SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="theme" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tema</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração da Sessão</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="max_players" render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx. Jogadores</FormLabel>
                  <FormControl><Input type="number" min={1} max={20} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="platform" render={({ field }) => (
              <FormItem>
                <FormLabel>Plataforma</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Onde será jogado?" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading || !hasTokens}>
                {loading ? 'Criando...' : hasTokens ? 'Criar Mesa (-1 token)' : 'Sem tokens'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
