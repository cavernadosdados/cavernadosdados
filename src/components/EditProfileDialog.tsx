import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useProfile, Profile } from '@/hooks/useProfile';
import { SearchableMultiAdd } from '@/components/SearchableMultiAdd';
import { WeekdaySelector } from '@/components/WeekdaySelector';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const RPG_SYSTEMS = [
  'D&D 5e',
  'Pathfinder',
  'Tormenta20',
  'Call of Cthulhu',
  'Vampiro: A Máscara',
  'Fate',
  'Savage Worlds',
  '3D&T',
  'Old Dragon',
];

const THEMES = [
  'Fantasia Medieval',
  'Cyberpunk',
  'Horror',
  'Sci-Fi',
  'Steampunk',
  'Pós-Apocalíptico',
  'Histórico',
  'Super-Heróis',
  'Mistério',
  'Aventura',
];

const APPS = [
  'Discord',
  'Roll20',
  'Foundry VTT',
  'Alchemy RPG',
  'Owlbear Rodeo',
  'D&D Beyond',
  'Tabletop Simulator',
  'Fantasy Grounds',
];

const PERIODS: { key: string; label: string; hint: string }[] = [
  { key: 'manha', label: 'Manhã', hint: '06h–12h' },
  { key: 'tarde', label: 'Tarde', hint: '12h–18h' },
  { key: 'noite', label: 'Noite', hint: '18h–00h' },
  { key: 'madrugada', label: 'Madrugada', hint: '00h–06h' },
];

const profileSchema = z.object({
  display_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50),
  bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional(),
  experience_years: z.number().min(0).max(100).optional(),
  master_systems: z.array(z.string()).optional(),
  preferred_themes: z.array(z.string()).optional(),
  plays_in_person: z.boolean().optional(),
  apps_used: z.array(z.string()).optional(),
  discord_link: z.string().url('Link inválido').or(z.literal('')).optional(),
  availability_days: z.array(z.string()).optional(),
  availability_periods: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  userId: string;
  isMaster: boolean;
}

export const EditProfileDialog = ({
  open,
  onOpenChange,
  profile,
  userId,
  isMaster,
}: EditProfileDialogProps) => {
  const { updateProfile, isUpdating } = useProfile(userId);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      experience_years: profile?.experience_years || 0,
      master_systems: profile?.master_systems || [],
      preferred_themes: profile?.preferred_themes || [],
      plays_in_person: profile?.plays_in_person || false,
      apps_used: profile?.apps_used || [],
      discord_link: profile?.discord_link || '',
      availability_days: profile?.availability_days || [],
      availability_periods: profile?.availability_periods || [],
    },
  });

  useEffect(() => {
    if (open && profile) {
      form.reset({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        experience_years: profile.experience_years || 0,
        master_systems: profile.master_systems || [],
        preferred_themes: profile.preferred_themes || [],
        plays_in_person: profile.plays_in_person || false,
        apps_used: profile.apps_used || [],
        discord_link: profile.discord_link || '',
        availability_days: profile.availability_days || [],
        availability_periods: profile.availability_periods || [],
      });
    }
  }, [open, profile]);

  const onSubmit = (values: ProfileFormValues) => {
    const updateData: any = {
      display_name: values.display_name,
      bio: values.bio || null,
      master_systems: values.master_systems || [],
      preferred_themes: values.preferred_themes || [],
      availability_days: values.availability_days || [],
      availability_periods: values.availability_periods || [],
    };

    // Unified profile: any user can fill master-oriented fields
    updateData.experience_years = values.experience_years || 0;
    updateData.plays_in_person = values.plays_in_person || false;
    updateData.apps_used = values.apps_used || [];
    updateData.discord_link = values.discord_link || null;

    updateProfile(updateData, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>Atualize suas informações pessoais</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de Exibição</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Seu nome" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={
                        isMaster
                          ? 'Conte sobre sua experiência como mestre...'
                          : 'Conte sobre você e suas preferências de jogo...'
                      }
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>Máximo 500 caracteres</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isMaster && (
              <FormField
                control={form.control}
                name="experience_years"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anos de Experiência</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="master_systems"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isMaster ? 'Sistemas que Domina' : 'Sistemas de Interesse'}
                  </FormLabel>
                  <SearchableMultiAdd
                    options={RPG_SYSTEMS}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Selecione um sistema"
                    searchPlaceholder="Procurar ou adicionar outro..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_themes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temas Preferidos</FormLabel>
                  <SearchableMultiAdd
                    options={THEMES}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Selecione um tema"
                    searchPlaceholder="Procurar ou adicionar outro..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability_days"
              render={({ field }) => (
                <FormItem>
                  <WeekdaySelector
                    value={field.value || []}
                    onChange={field.onChange}
                    label="Melhores dias para jogar"
                  />
                  <FormDescription>
                    Selecione um ou mais dias em que você costuma estar disponível.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability_periods"
              render={({ field }) => {
                const selected = field.value || [];
                const toggle = (key: string) => {
                  if (selected.includes(key)) {
                    field.onChange(selected.filter((p) => p !== key));
                  } else {
                    field.onChange([...selected, key]);
                  }
                };
                const allSelected = selected.length === PERIODS.length;
                return (
                  <FormItem>
                    <Label className="text-sm font-medium">Melhores períodos</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {PERIODS.map((p) => {
                        const active = selected.includes(p.key);
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => toggle(p.key)}
                            title={p.hint}
                            className={cn(
                              'h-10 px-3 rounded-md text-xs font-semibold border transition-all',
                              active
                                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_12px_hsl(var(--cavern-gold)/0.4)]'
                                : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
                            )}
                          >
                            {p.label}
                            <span className="ml-1 opacity-60 font-normal">{p.hint}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          field.onChange(allSelected ? [] : PERIODS.map((p) => p.key))
                        }
                        className={cn(
                          'h-10 px-3 rounded-md text-xs font-semibold border transition-all',
                          allSelected
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
                        )}
                      >
                        Todos
                      </button>
                    </div>
                    <FormDescription>
                      Em quais turnos você prefere jogar?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {isMaster && (
              <FormField
                control={form.control}
                name="apps_used"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aplicativos Utilizados</FormLabel>
                    <SearchableMultiAdd
                      options={APPS}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="Selecione um aplicativo"
                      searchPlaceholder="Procurar ou adicionar outro..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isMaster && (
              <>
                <FormField
                  control={form.control}
                  name="plays_in_person"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Joga Presencial</FormLabel>
                        <FormDescription>
                          Você mestra sessões presenciais?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discord_link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link do Discord</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://discord.gg/seu-servidor" />
                      </FormControl>
                      <FormDescription>
                        Link do seu servidor ou perfil do Discord
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
