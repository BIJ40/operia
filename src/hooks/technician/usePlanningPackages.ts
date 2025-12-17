import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTechnicianProfile } from './useTechnicianProfile';

export interface PlanningPackage {
  id: string;
  week_start: string;
  title: string | null;
  sent_at: string;
  signed_at: string | null;
  signed_comment: string | null;
  recipient_id: string;
}

export function useMyPlanningPackages() {
  const { data: profile } = useTechnicianProfile();

  return useQuery({
    queryKey: ['my-planning-packages', profile?.id],
    queryFn: async (): Promise<PlanningPackage[]> => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('planning_package_recipients')
        .select(`
          id,
          signed_at,
          signed_comment,
          package:planning_packages(
            id,
            week_start,
            title,
            sent_at
          )
        `)
        .eq('collaborator_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.package?.id || '',
        week_start: r.package?.week_start || '',
        title: r.package?.title,
        sent_at: r.package?.sent_at || '',
        signed_at: r.signed_at,
        signed_comment: r.signed_comment,
        recipient_id: r.id,
      }));
    },
    enabled: !!profile?.id,
  });
}

export function useSignPlanning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      recipientId, 
      comment 
    }: { 
      recipientId: string; 
      comment?: string;
    }) => {
      const { data, error } = await supabase
        .from('planning_package_recipients')
        .update({
          signed_at: new Date().toISOString(),
          signed_comment: comment || null,
        })
        .eq('id', recipientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-planning-packages'] });
    },
  });
}
