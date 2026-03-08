/**
 * useProspectPool - CRUD pour le pool de prospects importés
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { toast } from 'sonner';

export interface ProspectPoolItem {
  id: string;
  agency_id: string;
  import_batch_id: string;
  siren: string | null;
  siret: string | null;
  denomination: string | null;
  enseigne: string | null;
  date_creation_etablissement: string | null;
  tranche_effectif: string | null;
  categorie_juridique: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  code_ape: string | null;
  activite_principale: string | null;
  denomination_unite_legale: string | null;
  nb_etablissements: number | null;
  chiffre_affaire: string | null;
  date_cloture_exercice: string | null;
  telephone: string | null;
  site_web: string | null;
  representant: string | null;
  coordonnees: string | null;
  latitude: number | null;
  longitude: number | null;
  imported_at: string;
  imported_by: string | null;
}

export interface ProspectPoolFilters {
  search?: string;
  codePostal?: string;
  ville?: string;
  batchId?: string;
}

export function useProspectPool(filters: ProspectPoolFilters = {}) {
  const { agencyId } = useProfile();

  return useQuery({
    queryKey: ['prospect-pool', agencyId, filters],
    queryFn: async (): Promise<ProspectPoolItem[]> => {
      let query = supabase
        .from('prospect_pool')
        .select('*')
        .order('denomination', { ascending: true });

      if (filters.codePostal) {
        query = query.ilike('code_postal', `${filters.codePostal}%`);
      }

      if (filters.ville) {
        query = query.ilike('ville', `%${filters.ville}%`);
      }

      if (filters.search) {
        query = query.or(
          `denomination.ilike.%${filters.search}%,enseigne.ilike.%${filters.search}%,representant.ilike.%${filters.search}%,adresse.ilike.%${filters.search}%`
        );
      }

      if (filters.batchId) {
        query = query.eq('import_batch_id', filters.batchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ProspectPoolItem[];
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useImportProspects() {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();
  const { user } = useAuthCore();

  return useMutation({
    mutationFn: async (rows: Omit<ProspectPoolItem, 'id' | 'agency_id' | 'imported_at' | 'imported_by'>[]) => {
      const batchId = crypto.randomUUID();
      const toInsert = rows.map(row => ({
        ...row,
        agency_id: agencyId!,
        import_batch_id: batchId,
        imported_by: user!.id,
      }));

      // Insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('prospect_pool')
          .insert(chunk as any);
        if (error) throw error;
      }

      return { batchId, count: toInsert.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-pool'] });
      toast.success(`${result.count} prospects importés avec succès`);
    },
    onError: (err: Error) => {
      toast.error(`Erreur d'import: ${err.message}`);
    },
  });
}

export function useDeleteImportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from('prospect_pool')
        .delete()
        .eq('import_batch_id', batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-pool'] });
      toast.success('Import supprimé');
    },
  });
}
