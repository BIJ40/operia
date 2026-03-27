/**
 * useAgencyZone — Load/save the agency's map zone (selected communes).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { toast } from 'sonner';

export interface ZoneCommune {
  code_insee: string;
  nom: string;
}

export function useAgencyZone() {
  const { agencyId } = useEffectiveAuth();
  const qc = useQueryClient();

  const query = useQuery<ZoneCommune[]>({
    queryKey: ['agency-map-zone', agencyId],
    enabled: !!agencyId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await (supabase as any)
        .from('agency_map_zone_communes')
        .select('code_insee, nom')
        .eq('agency_id', agencyId);
      if (error) throw error;
      return (data || []) as ZoneCommune[];
    },
  });

  const saveZone = useMutation({
    mutationFn: async (communes: ZoneCommune[]) => {
      if (!agencyId) throw new Error('No agency');
      // Delete all existing, then insert new ones
      await (supabase as any)
        .from('agency_map_zone_communes')
        .delete()
        .eq('agency_id', agencyId);

      if (communes.length > 0) {
        const rows = communes.map(c => ({
          agency_id: agencyId,
          code_insee: c.code_insee,
          nom: c.nom,
        }));
        // Insert in batches of 500
        for (let i = 0; i < rows.length; i += 500) {
          const batch = rows.slice(i, i + 500);
          const { error } = await (supabase as any)
            .from('agency_map_zone_communes')
            .insert(batch);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-map-zone'] });
      // Also invalidate all choropleth queries so they reload with the zone
      qc.invalidateQueries({ queryKey: ['rdv-density-choropleth'] });
      qc.invalidateQueries({ queryKey: ['rdv-profitability'] });
      qc.invalidateQueries({ queryKey: ['rdv-zones'] });
      qc.invalidateQueries({ queryKey: ['rdv-apporteurs'] });
      qc.invalidateQueries({ queryKey: ['rdv-saisonnalite'] });
      qc.invalidateQueries({ queryKey: ['rdv-score'] });
      toast.success(`Zone enregistrée`);
    },
    onError: (err: Error) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  return {
    zone: query.data || [],
    isLoading: query.isLoading,
    zoneSet: new Set((query.data || []).map(c => c.code_insee)),
    saveZone,
  };
}
