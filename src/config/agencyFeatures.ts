/**
 * Registre des features agence (couche SaaS)
 * Usage UI uniquement — la source de vérité est la table agency_features
 * 
 * Schema metadata attendu par feature :
 * suivi_client:       { quota?: number, usage?: number }
 * apporteur_portal:   { included_spaces: number, extra_spaces: number, max_spaces: number, contact_sales_required: boolean }
 * apporteur_exchange:  { quota?: number, usage?: number }
 */

import { Eye, UserCheck, MessageSquare, type LucideIcon } from 'lucide-react';

export interface AgencyFeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: 'relations';
  icon: LucideIcon;
}

export const AGENCY_FEATURES: Record<string, AgencyFeatureDefinition> = {
  suivi_client: {
    key: 'suivi_client',
    label: 'Suivi Client',
    description: 'Portail de suivi client externe avec SMS, paiements et avis Google.',
    category: 'relations',
    icon: Eye,
  },
  apporteur_portal: {
    key: 'apporteur_portal',
    label: 'Portail Apporteurs',
    description: "Espaces dédiés pour vos apporteurs d'affaires avec tableau de bord et suivi.",
    category: 'relations',
    icon: UserCheck,
  },
  apporteur_exchange: {
    key: 'apporteur_exchange',
    label: 'Échanges Apporteurs',
    description: 'Messagerie et échanges documentaires avec vos apporteurs.',
    category: 'relations',
    icon: MessageSquare,
  },
} as const;

export type AgencyFeatureKey = keyof typeof AGENCY_FEATURES;

export const AGENCY_FEATURE_KEYS = Object.keys(AGENCY_FEATURES) as AgencyFeatureKey[];

/**
 * Features du pack Relations (pour l'affichage commercial)
 */
export const RELATIONS_PACK_FEATURES = [
  'suivi_client',
  'apporteur_portal', 
  'apporteur_exchange',
] as const;

/**
 * Statuts possibles
 */
export type AgencyFeatureStatus = 'active' | 'inactive' | 'trial' | 'suspended';

/**
 * Modes de facturation
 */
export type AgencyFeatureBillingMode = 'manual' | 'included' | 'trial' | 'complimentary';
