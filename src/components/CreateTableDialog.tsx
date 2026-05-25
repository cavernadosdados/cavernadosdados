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
import { Sparkles } from 'lucide-react';
import { CoverGalleryPicker } from '@/components/CoverGalleryPicker';
import type { ModerationStatus } from '@/components/CoverImageInput';
import { Switch } from '@/components/ui/switch';

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
  price_brl: z.coerce
    .number({ invalid_type_error: 'Informe um valor válido' })
    .min(0, 'O preço não pode ser negativo')
    .max(9999, 'Valor muito alto'),
  is_adult_only: z.boolean().default(false),
  cover_url: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^https?:\/\//.test(v) || v.startsWith('/'),
      'URL inválida'
    )
    .optional(),
});

type TableFormData = z.infer<typeof tableSchema>;

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTableDialog({ open, onOpenChange, onCreated }: CreateTableDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [moderation, setModeration] = useState<ModerationStatus>('idle');

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
      price_brl: 0,
      is_adult_only: false,
      cover_url: '',
    },
  });

  const onSubmit = async (data: TableFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error: insertError } = await supabase
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
          price_cents: Math.round((data.price_brl || 0) * 100),
          is_adult_only: data.is_adult_only,
          cover_url: data.cover_url?.trim() || null,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Mesa criada!',
        description: 'Sua mesa está no ar. Use tokens para destacá-la e atrair jogadores.',
      });
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
            Criar mesa é <strong>grátis</strong>. Use tokens depois para destacá-la no topo da listagem.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> sua primeira mesa ganha
            destaque grátis por 24h automaticamente!
          </span>
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

            <FormField control={form.control} name="cover_url" render={({ field }) => (
              <FormItem>
                <FormLabel>Capa da Mesa</FormLabel>
                <FormControl>
                  <CoverGalleryPicker
                    value={field.value || ''}
                    onChange={field.onChange}
                    onModerationChange={setModeration}
                  />
                </FormControl>
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

            <FormField control={form.control} name="price_brl" render={({ field }) => (
              <FormItem>
                <FormLabel>Preço sugerido por jogador (R$)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      R$
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0,00"
                      className="pl-9"
                      {...field}
                    />
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Deixe <strong>0</strong> para mesa gratuita. O checkout ainda não está
                  ativo — esse valor fica registrado como sua intenção de cobrança.
                </p>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="is_adult_only" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
                <div className="space-y-0.5 pr-3">
                  <FormLabel className="text-sm">Conteúdo adulto (18+)</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Marque se sua mesa é restrita a maiores de 18 anos (temas explícitos, violência intensa etc.).
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={loading || moderation === 'checking' || moderation === 'blocked'}
              >
                {loading
                  ? 'Criando...'
                  : moderation === 'checking'
                  ? 'Validando imagem...'
                  : 'Criar Mesa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
