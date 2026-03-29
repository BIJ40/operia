/**
 * Hook admin pour gérer les features agence (CRUD)
 * Usage N4+ — mutations sur la table agency_features
 * Ne touche PAS usePermissions, hasAccess, PlanGuard, etc.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { toast } from 'sonner';
import type { AgencyFeatureRow } from './useAgencyFeature';
import type { AgencyFeatureStatus, AgencyFeatureBillingMode } from '@/config/agencyFeatures';

/**
 * Bridge: sync relations.apporteurs in user_modules for all agency users
 * when Relations pack is activated or deactivated.
 */
async function syncApporteursModuleForAgency(
  agencyId: string,
  activate: boolean,
  enabledBy: string | null,
) {
  // Get all users belonging to this agency
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .eq('agency_id', agencyId);

  if (profilesError || !profiles?.length) return;

  const now = new Date().toISOString();

  if (activate) {
    // Upsert relations.apporteurs for each user
    const rows = profiles.map((p) => ({
      user_id: p.id,
      module_key: 'relations.apporteurs',
      options: null,
      enabled_at: now,
      enabled_by: enabledBy,
    }));

    await (supabase
      .from('user_modules' as any) as any)
      .upsert(rows, { onConflict: 'user_id,module_key' });
  } else {
    // Remove relations.apporteurs for each user
    await (supabase
      .from('user_modules' as any) as any)
      .delete()
      .in('user_id', profiles.map((p) => p.id))
      .eq('module_key', 'relations.apporteurs');
  }
}

/**
 * Charge les features d'une agence spécifique (admin)
 */
export function useAgencyFeaturesForAgency(agencyId: string | null) {
  return useQuery({
    queryKey: ['agency-features', agencyId],
    queryFn: async (): Promise<AgencyFeatureRow[]> => {
      if (!agencyId) return [];
      const { data, error } = await (supabase
        .from('agency_features' as any) as any)
        .select('*')
        .eq('agency_id', agencyId);
      if (error) throw error;
      return (data || []) as AgencyFeatureRow[];
    },
    enabled: !!agencyId,
  });
}

/**
 * Upsert une feature agence
 */
export function useUpsertAgencyFeature() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      agencyId: string;
      featureKey: string;
      status: AgencyFeatureStatus;
      billingMode?: AgencyFeatureBillingMode;
      metadata?: Record<string, unknown>;
    }) => {
      const { agencyId, featureKey, status, billingMode = 'manual', metadata = {} } = params;

      const row: Record<string, unknown> = {
        agency_id: agencyId,
        feature_key: featureKey,
        status,
        billing_mode: billingMode,
        metadata,
      };
      if (status === 'active' || status === 'trial') {
        row.activated_at = new Date().toISOString();
        row.suspended_at = null;
      }
      if (status === 'suspended') {
        row.suspended_at = new Date().toISOString();
      }

      const { data, error } = await (supabase
        .from('agency_features' as any) as any)
        .upsert(row as any, { onConflict: 'agency_id,feature_key' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['agency-features', vars.agencyId] });
      toast.success('Feature mise à jour');
    },
    onError: (err: Error) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });
}

/**
 * Update le metadata d'une feature existante (ex: extensions)
 */
export function useUpdateFeatureMetadata() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      agencyId: string;
      featureKey: string;
      metadata: Record<string, unknown>;
    }) => {
      const { agencyId, featureKey, metadata } = params;

      const { data, error } = await (supabase
        .from('agency_features' as any) as any)
        .update({ metadata: metadata as any })
        .eq('agency_id', agencyId)
        .eq('feature_key', featureKey)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['agency-features', vars.agencyId] });
      toast.success('Extension mise à jour');
    },
    onError: (err: Error) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });
}

/**
 * Active le pack Relations complet (3 features)
 */
export function useActivateRelationsPack() {
  const qc = useQueryClient();
  const { user } = useAuthCore();

  return useMutation({
    mutationFn: async (agencyId: string) => {
      const features = [
        {
          agency_id: agencyId,
          feature_key: 'suivi_client',
          status: 'active',
          billing_mode: 'manual',
          metadata: {},
          activated_at: new Date().toISOString(),
          suspended_at: null,
        },
        {
          agency_id: agencyId,
          feature_key: 'apporteur_portal',
          status: 'active',
          billing_mode: 'manual',
          metadata: { included_spaces: 5, extra_spaces: 0, extension_pack: null },
          activated_at: new Date().toISOString(),
          suspended_at: null,
        },
        {
          agency_id: agencyId,
          feature_key: 'apporteur_exchange',
          status: 'active',
          billing_mode: 'manual',
          metadata: {},
          activated_at: new Date().toISOString(),
          suspended_at: null,
        },
      ];

      const { error } = await (supabase
        .from('agency_features' as any) as any)
        .upsert(features as any[], { onConflict: 'agency_id,feature_key' });

      if (error) throw error;

      // Bridge: activate relations.apporteurs for all agency users
      await syncApporteursModuleForAgency(agencyId, true, user?.id ?? null);
    },
    onSuccess: (_, agencyId) => {
      qc.invalidateQueries({ queryKey: ['agency-features', agencyId] });
      qc.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Pack Relations activé');
    },
    onError: (err: Error) => {
      toast.error(`Erreur activation pack : ${err.message}`);
    },
  });
}

/**
 * Désactive le pack Relations (passe en inactive, ne supprime pas)
 */
export function useDeactivateRelationsPack() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (agencyId: string) => {
      const keys = ['suivi_client', 'apporteur_portal', 'apporteur_exchange'];

      const { error } = await (supabase
        .from('agency_features' as any) as any)
        .update({ status: 'inactive', suspended_at: new Date().toISOString() } as any)
        .eq('agency_id', agencyId)
        .in('feature_key', keys);

      if (error) throw error;

      // Bridge: remove relations.apporteurs for all agency users
      await syncApporteursModuleForAgency(agencyId, false, null);
    },
    onSuccess: (_, agencyId) => {
      qc.invalidateQueries({ queryKey: ['agency-features', agencyId] });
      qc.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Pack Relations désactivé');
    },
    onError: (err: Error) => {
      toast.error(`Erreur désactivation pack : ${err.message}`);
    },
  });
}
