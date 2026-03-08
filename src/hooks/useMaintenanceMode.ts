import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';

export interface MaintenanceSettings {
  id: string;
  is_enabled: boolean;
  message: string;
  whitelisted_user_ids: string[];
  enabled_at: string | null;
  enabled_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useMaintenanceMode() {
  const { user } = useAuthCore();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['maintenance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_settings')
        .select('*')
        .eq('id', 'default')
        .single();
      
      if (error) throw error;
      return data as MaintenanceSettings;
    },
    staleTime: 30000, // 30 seconds
  });

  const isBlocked = settings?.is_enabled && 
    user?.id && 
    !settings.whitelisted_user_ids.includes(user.id);

  const isWhitelisted = user?.id && settings?.whitelisted_user_ids.includes(user.id);

  return {
    settings,
    isLoading,
    isMaintenanceActive: settings?.is_enabled ?? false,
    isBlocked,
    isWhitelisted,
    message: settings?.message ?? '',
  };
}

export function useMaintenanceAdmin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['maintenance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_settings')
        .select('*')
        .eq('id', 'default')
        .single();
      
      if (error) throw error;
      return data as MaintenanceSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<MaintenanceSettings, 'is_enabled' | 'message' | 'whitelisted_user_ids'>>) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Si on active le mode maintenance, enregistrer qui et quand
      if (updates.is_enabled === true) {
        updateData.enabled_at = new Date().toISOString();
        updateData.enabled_by = user?.id;
      } else if (updates.is_enabled === false) {
        updateData.enabled_at = null;
        updateData.enabled_by = null;
      }

      const { data, error } = await supabase
        .from('maintenance_settings')
        .update(updateData)
        .eq('id', 'default')
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
