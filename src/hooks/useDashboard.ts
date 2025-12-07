/**
 * Hooks pour le Dashboard personnalisable
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WidgetTemplate, UserWidget, UserDashboardSettings } from '@/types/dashboard';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// Fetch all available widget templates
export function useWidgetTemplates() {
  const { user, globalRole } = useAuth();
  const roleLevel = globalRole ? getRoleLevel(globalRole) : 0;

  return useQuery({
    queryKey: ['widget-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_templates')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Filter by role level
      return (data as WidgetTemplate[]).filter(t => t.min_global_role <= roleLevel);
    },
    enabled: !!user,
  });
}

// Fetch user's widgets with templates
export function useUserWidgets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-widgets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_widgets')
        .select(`
          *,
          template:widget_templates(*)
        `)
        .eq('user_id', user!.id)
        .eq('is_visible', true)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true });

      if (error) throw error;
      return data as (UserWidget & { template: WidgetTemplate })[];
    },
    enabled: !!user,
  });
}

// Fetch user's dashboard settings
export function useUserDashboardSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-dashboard-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_dashboard_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserDashboardSettings | null;
    },
    enabled: !!user,
  });
}

// Add widget to dashboard
export function useAddWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, position }: { templateId: string; position?: { x: number; y: number } }) => {
      // Get template for default size
      const { data: template } = await supabase
        .from('widget_templates')
        .select('default_width, default_height')
        .eq('id', templateId)
        .single();

      const { data, error } = await supabase
        .from('user_widgets')
        .upsert({
          template_id: templateId,
          user_id: user!.id,
          position_x: position?.x ?? 0,
          position_y: position?.y ?? 0,
          width: template?.default_width ?? 4,
          height: template?.default_height ?? 4,
          state: 'normal',
          is_visible: true,
        }, {
          onConflict: 'template_id,user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
      toast.success('Widget ajouté au dashboard');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout du widget');
    },
  });
}

// Update widget position/size
export function useUpdateWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<UserWidget, 'state' | 'position_x' | 'position_y' | 'width' | 'height' | 'is_visible'>> }) => {
      const { data, error } = await supabase
        .from('user_widgets')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
    },
  });
}

// Remove widget from dashboard
export function useRemoveWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (widgetId: string) => {
      const { error } = await supabase
        .from('user_widgets')
        .update({ is_visible: false })
        .eq('id', widgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
      toast.success('Widget retiré du dashboard');
    },
  });
}

// Batch update widget positions
export function useBatchUpdateWidgets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; position_x: number; position_y: number; width: number; height: number }[]) => {
      const promises = updates.map(u => 
        supabase
          .from('user_widgets')
          .update({ 
            position_x: u.position_x, 
            position_y: u.position_y,
            width: u.width,
            height: u.height,
          })
          .eq('id', u.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
    },
  });
}

// Helper
function getRoleLevel(role: string): number {
  const levels: Record<string, number> = {
    base_user: 0,
    franchisee_user: 1,
    franchisee_admin: 2,
    franchisor_user: 3,
    franchisor_admin: 4,
    platform_admin: 5,
    superadmin: 6,
  };
  return levels[role] ?? 0;
}
