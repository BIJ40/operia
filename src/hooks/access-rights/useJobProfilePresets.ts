import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JobProfilePreset {
  role_agence: string;
  label: string;
  default_modules: string[];
  sort_order: number;
}

export function useJobProfilePresets() {
  const queryClient = useQueryClient();

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['job_profile_presets'],
    queryFn: async (): Promise<JobProfilePreset[]> => {
      const { data, error } = await supabase
        .from('job_profile_presets')
        .select('role_agence,label,default_modules,sort_order')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['job_profile_presets'] });

  const updatePreset = useMutation({
    mutationFn: async ({
      role_agence,
      default_modules,
    }: {
      role_agence: string;
      default_modules: string[];
    }) => {
      const { error } = await supabase
        .from('job_profile_presets')
        .update({ default_modules })
        .eq('role_agence', role_agence);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateLabel = useMutation({
    mutationFn: async ({
      role_agence,
      label,
    }: {
      role_agence: string;
      label: string;
    }) => {
      const { error } = await supabase
        .from('job_profile_presets')
        .update({ label })
        .eq('role_agence', role_agence);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { presets, isLoading, updatePreset, updateLabel };
}
