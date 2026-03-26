/**
 * useAgencyExchanges — Liste agrégée des dossiers ayant des échanges pour l'agence
 * Retourne par dossier_ref : dernier message, sender_type, date, badge "Réponse requise"
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AgencyExchangeSummary {
  dossier_ref: string;
  last_message_at: string;
  last_sender_type: 'apporteur' | 'agence';
  last_message_preview: string;
  last_sender_name: string;
  total_messages: number;
  needs_reply: boolean;
}

export function useAgencyExchanges() {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['agency-exchanges', agencyId],
    queryFn: async (): Promise<AgencyExchangeSummary[]> => {
      if (!agencyId) return [];

      const { data, error } = await supabase
        .from('dossier_exchanges')
        .select('dossier_ref, sender_type, sender_name, message, created_at')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[useAgencyExchanges] Error:', error.message);
        return [];
      }

      if (!data?.length) return [];

      // Group by dossier_ref, keep last message
      const grouped = new Map<string, AgencyExchangeSummary>();

      for (const row of data) {
        const ref = row.dossier_ref;
        if (!grouped.has(ref)) {
          grouped.set(ref, {
            dossier_ref: ref,
            last_message_at: row.created_at,
            last_sender_type: row.sender_type as 'apporteur' | 'agence',
            last_message_preview: (row.message ?? '').substring(0, 120),
            last_sender_name: row.sender_name,
            total_messages: 1,
            needs_reply: row.sender_type === 'apporteur',
          });
        } else {
          grouped.get(ref)!.total_messages++;
        }
      }

      // Sort by last_message_at descending, needs_reply first
      return Array.from(grouped.values()).sort((a, b) => {
        if (a.needs_reply !== b.needs_reply) return a.needs_reply ? -1 : 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    },
    enabled: !!agencyId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
