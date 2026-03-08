/**
 * Hook pour gérer les Feature Flags
 * Permet d'activer/désactiver dynamiquement les modules sans modifier le code
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { toast } from 'sonner';

export type DevStatus = 'done' | 'in_progress' | 'todo' | 'disabled';

export interface FeatureFlag {
  id: string;
  module_key: string;
  module_label: string;
  module_group: string;
  is_enabled: boolean;
  dev_status: DevStatus;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Aliases pour éviter les doublons historiques (ex: apogee_tickets vs ticketing).
 * Objectif: 1 seule clé canonique côté UI, sans casser les enregistrements existants.
 */
const MODULE_KEY_ALIASES: Record<string, string> = {
  apogee_tickets: 'ticketing',
  'apogee_tickets.kanban': 'ticketing.kanban',
  'apogee_tickets.create': 'ticketing.create',
  'apogee_tickets.manage': 'ticketing.manage',
  'apogee_tickets.import': 'ticketing.import',
};

const MODULE_GROUP_ALIASES: Record<string, string> = {
  // ancien groupe historique
  projects: '07_ticketing',
};

function normalizeFeatureFlag(row: FeatureFlag): FeatureFlag {
  const module_key = MODULE_KEY_ALIASES[row.module_key] ?? row.module_key;
  const module_group = MODULE_GROUP_ALIASES[row.module_group] ?? row.module_group;
  return { ...row, module_key, module_group };
}

function pickBestFlag(a: FeatureFlag, b: FeatureFlag): FeatureFlag {
  // Priorité: clé déjà canonique > clé aliasée
  const aIsAliased = a.module_key !== (MODULE_KEY_ALIASES[a.module_key] ?? a.module_key);
  const bIsAliased = b.module_key !== (MODULE_KEY_ALIASES[b.module_key] ?? b.module_key);

  if (aIsAliased !== bIsAliased) return aIsAliased ? b : a;

  // Sinon: garder la plus récemment modifiée
  const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
  const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
  if (aUpdated !== bUpdated) return aUpdated > bUpdated ? a : b;

  // Fallback stable
  return a.display_order <= b.display_order ? a : b;
}

const QUERY_KEY = 'feature-flags';

/**
 * Hook pour charger tous les feature flags
 */
export function useFeatureFlags() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('module_group')
        .order('display_order');

      if (error) throw error;

      // Normalisation + déduplication (évite les doublons ticketing / apogee_tickets)
      const normalized = ((data || []) as FeatureFlag[]).map(normalizeFeatureFlag);
      const byKey = new Map<string, FeatureFlag>();

      for (const flag of normalized) {
        const existing = byKey.get(flag.module_key);
        byKey.set(flag.module_key, existing ? pickBestFlag(existing, flag) : flag);
      }

      return Array.from(byKey.values()).sort((a, b) => {
        const g = a.module_group.localeCompare(b.module_group);
        if (g !== 0) return g;
        const d = (a.display_order ?? 0) - (b.display_order ?? 0);
        if (d !== 0) return d;
        return a.module_key.localeCompare(b.module_key);
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook pour vérifier si un module spécifique est activé
 */
export function useFeatureFlag(moduleKey: string) {
  const { data: flags, isLoading } = useFeatureFlags();
  
  const flag = flags?.find(f => f.module_key === moduleKey);
  
  return {
    isEnabled: flag?.is_enabled ?? true, // Par défaut activé si non trouvé
    isLoading,
    flag,
  };
}

/**
 * Hook pour mettre à jour un feature flag
 */
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuthCore();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ 
          is_enabled,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Module "${data.module_label}" ${data.is_enabled ? 'activé' : 'désactivé'}`);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

/**
 * Hook pour créer un nouveau feature flag
 */
export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at' | 'updated_by'>) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .insert({
          ...flag,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Module ajouté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

/**
 * Hook pour supprimer un feature flag
 */
export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Module supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

/**
 * Helper pour grouper les flags par groupe
 */
export function groupFlagsByGroup(flags: FeatureFlag[]): Record<string, FeatureFlag[]> {
  return flags.reduce((acc, flag) => {
    const group = flag.module_group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(flag);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);
}

/**
 * Labels pour les groupes de modules (alignés avec les onglets UI)
 */
export const MODULE_GROUP_LABELS: Record<string, string> = {
  '01_agence': 'Mon Agence',
  '02_stats': 'Statistiques',
  '03_rh': 'Salariés (RH)',
  '04_parc': 'Parc & Équipements',
  '05_divers': 'Divers',
  '06_guides': 'Guides',
  '07_ticketing': 'Ticketing',
  '08_aide': 'Aide',
  '09_reseau': 'Réseau Franchiseur',
  '10_admin': 'Administration',
  '11_transversal': 'Transversal',
  // Legacy (pour rétrocompatibilité)
  rh: 'Ressources Humaines',
  pilotage: 'Pilotage Agence',
  support: 'Support',
  academy: 'Academy',
  reseau: 'Réseau Franchiseur',
  admin: 'Administration',
  parc: 'Parc & Équipements',
  projects: 'Gestion de Projet',
  search: 'Recherche',
};

/**
 * Configuration des statuts de développement
 */
export const DEV_STATUS_CONFIG: Record<DevStatus, { icon: string; label: string; color: string }> = {
  done: { icon: '✅', label: 'Opérationnel', color: 'bg-green-100 text-green-700 border-green-200' },
  in_progress: { icon: '🔧', label: 'En cours', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  todo: { icon: '⏳', label: 'À faire', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  disabled: { icon: '🚫', label: 'Désactivé', color: 'bg-red-100 text-red-700 border-red-200' },
};

/**
 * Hook pour mettre à jour le statut de développement
 */
export function useUpdateDevStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, dev_status }: { id: string; dev_status: DevStatus }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ 
          dev_status,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      const statusLabel = DEV_STATUS_CONFIG[data.dev_status as DevStatus]?.label || data.dev_status;
      toast.success(`Statut de "${data.module_label}" → ${statusLabel}`);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
