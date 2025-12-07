/**
 * Hook pour la gestion des widgets StatIA
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WidgetConfig {
  icon?: string;
  color?: string;
  bgColor?: string;
  format?: 'currency' | 'percent' | 'number' | 'days';
  decimals?: number;
  showTrend?: boolean;
  chartType?: 'line' | 'bar' | 'pie' | 'donut';
}

export interface StatiaWidget {
  id: string;
  metric_id: string;
  title: string;
  description: string | null;
  widget_type: 'kpi' | 'chart' | 'gauge' | 'table';
  config: WidgetConfig;
  is_published: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export function useStatiaWidgets() {
  return useQuery({
    queryKey: ['statia-widgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statia_widgets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as StatiaWidget[];
    },
  });
}

export function usePublishedWidgets() {
  return useQuery({
    queryKey: ['statia-widgets-published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statia_widgets')
        .select('*')
        .eq('is_published', true)
        .order('title');
      
      if (error) throw error;
      return (data || []) as StatiaWidget[];
    },
  });
}

export function useCreateWidget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (widget: {
      metric_id: string;
      title: string;
      description?: string | null;
      widget_type: string;
      config: WidgetConfig;
      is_published?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('statia_widgets')
        .insert({
          metric_id: widget.metric_id,
          title: widget.title,
          description: widget.description,
          widget_type: widget.widget_type,
          config: widget.config as any,
          is_published: widget.is_published ?? false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as StatiaWidget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statia-widgets'] });
      toast.success('Widget créé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création: ' + error.message);
    },
  });
}

export function usePublishWidget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase
        .from('statia_widgets')
        .update({ is_published: publish })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { publish }) => {
      queryClient.invalidateQueries({ queryKey: ['statia-widgets'] });
      toast.success(publish ? 'Widget publié' : 'Widget dépublié');
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    },
  });
}

export function useDeleteWidget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('statia_widgets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statia-widgets'] });
      toast.success('Widget supprimé');
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    },
  });
}
