/**
 * Hooks pour les features agence (couche SaaS)
 * Indépendant du système de modules — ne touche pas usePermissions / hasAccess
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AgencyFeatureKey, AgencyFeatureStatus, AgencyFeatureBillingMode } from '@/config/agencyFeatures';

export interface AgencyFeatureRow {
  id: string;
  agency_id: string;
  feature_key: string;
  status: AgencyFeatureStatus;
  billing_mode: AgencyFeatureBillingMode;
  metadata: Record<string, unknown>;
  activated_at: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Charge toutes les features de l'agence courante
 */
export function useAgencyFeatures() {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['agency-features', agencyId],
    queryFn: async (): Promise<AgencyFeatureRow[]> => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from('agency_features')
        .select('*')
        .eq('agency_id', agencyId);

      if (error) throw error;
      return (data || []) as AgencyFeatureRow[];
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export interface AgencyFeatureResult {
  isActive: boolean;
  status: AgencyFeatureStatus | null;
  billingMode: AgencyFeatureBillingMode | null;
  metadata: Record<string, unknown>;
  isLoading: boolean;
}

/**
 * Vérifie une feature spécifique pour l'agence courante
 * N5+ (platform_admin) bypass automatique
 */
export function useAgencyFeature(featureKey: AgencyFeatureKey): AgencyFeatureResult {
  const { globalRole } = useAuth();
  const { data: features, isLoading } = useAgencyFeatures();

  // N5+ bypass — toujours actif
  if (globalRole === 'platform_admin') {
    return {
      isActive: true,
      status: 'active',
      billingMode: 'included',
      metadata: {},
      isLoading: false,
    };
  }

  const feature = features?.find(f => f.feature_key === featureKey);

  return {
    isActive: feature?.status === 'active' || feature?.status === 'trial',
    status: (feature?.status as AgencyFeatureStatus) ?? null,
    billingMode: (feature?.billing_mode as AgencyFeatureBillingMode) ?? null,
    metadata: (feature?.metadata as Record<string, unknown>) ?? {},
    isLoading,
  };
}
