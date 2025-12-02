import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnimatorVisit {
  id: string;
  animator_id: string;
  agency_id: string;
  visit_date: string;
  visit_type: 'visite_terrain' | 'audit' | 'accompagnement' | 'formation';
  status: 'planifie' | 'effectue' | 'annule';
  notes: string | null;
  report_content: string | null;
  report_file_path: string | null;
  created_at: string;
  updated_at: string;
  agency?: {
    id: string;
    label: string;
    slug: string;
  };
}

export const VISIT_TYPE_LABELS: Record<string, string> = {
  visite_terrain: 'Visite terrain',
  audit: 'Audit',
  accompagnement: 'Accompagnement',
  formation: 'Formation',
};

export const VISIT_TYPE_ICONS: Record<string, string> = {
  visite_terrain: 'MapPin',
  audit: 'ClipboardCheck',
  accompagnement: 'Users',
  formation: 'GraduationCap',
};

export const VISIT_STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifiée',
  effectue: 'Effectuée',
  annule: 'Annulée',
};

export const VISIT_STATUS_COLORS: Record<string, string> = {
  planifie: 'bg-blue-500/10 text-blue-600 border-blue-200',
  effectue: 'bg-green-500/10 text-green-600 border-green-200',
  annule: 'bg-red-500/10 text-red-600 border-red-200',
};

export function useAnimatorVisits(animatorId: string | null) {
  return useQuery({
    queryKey: ['animator-visits', animatorId],
    queryFn: async () => {
      if (!animatorId) return [];
      
      const { data, error } = await supabase
        .from('animator_visits')
        .select(`
          *,
          agency:apogee_agencies(id, label, slug)
        `)
        .eq('animator_id', animatorId)
        .order('visit_date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as AnimatorVisit[];
    },
    enabled: !!animatorId,
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (visit: {
      animator_id: string;
      agency_id: string;
      visit_date: string;
      visit_type: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('animator_visits')
        .insert(visit)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['animator-visits', variables.animator_id] });
    },
  });
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AnimatorVisit> & { id: string }) => {
      const { data, error } = await supabase
        .from('animator_visits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['animator-visits', data.animator_id] });
    },
  });
}

export function useDeleteVisit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, animatorId }: { id: string; animatorId: string }) => {
      const { error } = await supabase
        .from('animator_visits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { animatorId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['animator-visits', data.animatorId] });
    },
  });
}
