import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CoverGalleryPicker } from '@/components/CoverGalleryPicker';

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
  status: z.string(),
  price_brl: z.coerce
    .number({ invalid_type_error: 'Informe um valor válido' })
    .min(0, 'O preço não pode ser negativo')
    .max(9999, 'Valor muito alto'),
  cover_url: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^https?:\/\//.test(v) || v.startsWith('/'),
      'URL inválida'
    )
    .optional(),
});

export type EditTableFormData = z.infer<typeof tableSchema>;

export interface EditTableFormTable {
  id: string;
  title: string;
  description: string | null;
  system: string;
  theme: string;
  duration: string;
  max_players: number;
  platform: string;
  status: string;
  price_cents?: number | null;
  cover_url?: string | null;
}

interface EditTableFormProps {
  table: EditTableFormTable;
  onSaved?: () => void;
}

export function EditTableForm({ table, onSaved }: EditTableFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<EditTableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      title: table.title,
      description: table.description || '',
      system: table.system,
      theme: table.theme,
      duration: table.duration,
      max_players: table.max_players,
      platform: table.platform,
      status: table.status,
      price_brl: (table.price_cents ?? 0) / 100,
      cover_url: table.cover_url || '',
    },
  });

  useEffect(() => {
    form.reset({
      title: table.title,
      description: table.description || '',
      system: table.system,
      theme: table.theme,
      duration: table.duration,
      max_players: table.max_players,
      platform: table.platform,
      status: table.status,
      price_brl: (table.price_cents ?? 0) / 100,
      cover_url: table.cover_url || '',
    });
  }, [table, form]);

  const onSubmit = async (data: EditTableFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('tables').update({
        title: data.title,
        description: data.description,
        system: data.system,
        theme: data.theme,
        duration: data.duration,
        max_players: data.max_players,
        platform: data.platform,
        status: data.status,
        price_cents: Math.round((data.price_brl || 0) * 100),
        cover_url: data.cover_url?.trim() || null,
      }).eq('id', table.id);

      if (error) throw error;

      toast({ title: 'Mesa atualizada!', description: 'As alterações foram salvas.' });
      onSaved?.();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da Mesa</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl><Textarea rows={4} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="cover_url" render={({ field }) => (
          <FormItem>
            <FormLabel>Capa da Mesa</FormLabel>
            <FormControl>
              <CoverGalleryPicker value={field.value || ''} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="system" render={({ field }) => (
            <FormItem>
              <FormLabel>Sistema</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="duration" render={({ field }) => (
            <FormItem>
              <FormLabel>Duração</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="platform" render={({ field }) => (
            <FormItem>
              <FormLabel>Plataforma</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="open">Aberta</SelectItem>
                  <SelectItem value="closed">Fechada</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Form>
  );
}