/**
 * Hook — Activity log for a realisation
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealisationActivityLog } from '../types';

const db = supabase as any;

export function useRealisationActivityLog(realisationId: string | undefined) {
  return useQuery({
    queryKey: ['realisation-activity-log', realisationId],
    queryFn: async (): Promise<RealisationActivityLog[]> => {
      if (!realisationId) return [];
      const { data, error } = await db
        .from('realisation_activity_log')
        .select('*')
        .eq('realisation_id', realisationId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as RealisationActivityLog[];
    },
    enabled: !!realisationId,
  });
}

export const ACTION_TYPE_LABELS: Record<string, string> = {
  created: 'Création',
  updated: 'Modification',
  media_uploaded: 'Média ajouté',
  media_deleted: 'Média supprimé',
  status_changed_to_draft: 'Passage en brouillon',
  status_changed_to_pending_review: 'Envoi en validation',
  status_changed_to_approved: 'Validation',
  status_changed_to_rejected: 'Refus',
  status_changed_to_archived: 'Archivage',
  publication_private: 'Passage en privé',
  publication_internal_ready: 'Prêt interne',
  publication_web_ready: 'Prêt web',
  publication_published: 'Publication',
};
