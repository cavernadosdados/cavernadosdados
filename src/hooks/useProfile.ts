import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  experience_years: number | null;
  master_systems: string[] | null;
  preferred_themes: string[] | null;
  plays_in_person: boolean | null;
  apps_used: string[] | null;
  discord_link: string | null;
  active_tables_count: number | null;
  user_type?: string;
  availability_days: string[] | null;
  availability_periods: string[] | null;
}

export interface UpdateProfileData {
  display_name?: string;
  bio?: string;
  experience_years?: number;
  master_systems?: string[];
  preferred_themes?: string[];
  plays_in_person?: boolean;
  apps_used?: string[];
  discord_link?: string;
  availability_days?: string[];
  availability_periods?: string[];
}

export const useProfile = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // Avoid selecting sensitive columns (tokens_balance, xp, onboarding_completed,
      // signup_bonus_claimed) — those are owner-only via dedicated RPCs.
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, display_name, avatar_url, bio, experience_years, master_systems, preferred_themes, plays_in_person, apps_used, discord_link, active_tables_count, user_type, availability_days, availability_periods, created_at, updated_at'
        )
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updateData: UpdateProfileData) => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
};
