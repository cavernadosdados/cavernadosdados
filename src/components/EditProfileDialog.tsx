import { useState } from 'react';
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

const profileSchema = z.object({
  display_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50),
  bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional(),
  experience_years: z.number().min(0).max(100).optional(),
  master_systems: z.string().optional(),
  preferred_themes: z.string().optional(),
  plays_in_person: z.boolean().optional(),
  apps_used: z.string().optional(),
  discord_link: z.string().url('Link inválido').or(z.literal('')).optional(),
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
      master_systems: profile?.master_systems?.join(', ') || '',
      preferred_themes: profile?.preferred_themes?.join(', ') || '',
      plays_in_person: profile?.plays_in_person || false,
      apps_used: profile?.apps_used?.join(', ') || '',
      discord_link: profile?.discord_link || '',
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    const updateData: any = {
      display_name: values.display_name,
      bio: values.bio || null,
    };

    if (isMaster) {
      updateData.experience_years = values.experience_years || 0;
      updateData.master_systems = values.master_systems
        ? values.master_systems.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      updateData.preferred_themes = values.preferred_themes
        ? values.preferred_themes.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      updateData.plays_in_person = values.plays_in_person || false;
      updateData.apps_used = values.apps_used
        ? values.apps_used.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      updateData.discord_link = values.discord_link || null;
    }

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
          <DialogDescription>
            Atualize suas informações pessoais
          </DialogDescription>
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
              <>
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
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="master_systems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sistemas que Domina</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="D&D 5e, Pathfinder, Tormenta"
                        />
                      </FormControl>
                      <FormDescription>
                        Separe múltiplos sistemas por vírgula
                      </FormDescription>
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
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Fantasia Medieval, Cyberpunk, Horror"
                        />
                      </FormControl>
                      <FormDescription>
                        Separe múltiplos temas por vírgula
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apps_used"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aplicativos Utilizados</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Discord, Roll20, Foundry VTT"
                        />
                      </FormControl>
                      <FormDescription>
                        Separe múltiplos apps por vírgula
                      </FormDescription>
                      <FormMessage />
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
                        <Input
                          {...field}
                          placeholder="https://discord.gg/seu-servidor"
                        />
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
