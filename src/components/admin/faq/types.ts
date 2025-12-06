/**
 * Types for FAQ Hub Admin
 */

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  context_type: string;
  category_id: string | null;
  is_published: boolean;
  role_cible: string | null;
  display_order: number;
  created_at: string;
  category?: { id: string; label: string } | null;
}

export interface FaqCategory {
  id: string;
  label: string;
  slug: string;
  display_order: number;
}

export interface FaqContextStats {
  context: ContextType;
  label: string;
  icon: string;
  count: number;
  categories: number;
  publishedPercent: number;
  color: string;
}

export const CONTEXT_OPTIONS = [
  { value: 'apogee', label: 'Apogée', icon: '🔧', color: 'helpconfort-blue' },
  { value: 'helpconfort', label: 'HelpConfort', icon: '🏢', color: 'helpconfort-orange' },
  { value: 'apporteurs', label: 'Apporteurs', icon: '👥', color: 'emerald-500' },
  { value: 'documents', label: 'Documents', icon: '📄', color: 'violet-500' },
  { value: 'franchise', label: 'Franchise', icon: '💰', color: 'amber-500' },
  { value: 'metier', label: 'Métier', icon: '🔨', color: 'rose-500' },
  { value: 'marche_batiment', label: 'Marché Bâtiment', icon: '🏗️', color: 'sky-500' },
  { value: 'groupe_laposte_axeo', label: 'Groupe La Poste / AXEO', icon: '📮', color: 'yellow-500' },
  { value: 'auto', label: 'Auto', icon: '⚙️', color: 'slate-500' },
] as const;

export type ContextType = typeof CONTEXT_OPTIONS[number]['value'];

export const ROLE_OPTIONS = [
  { value: 'all', label: 'Tous les utilisateurs' },
  { value: 'base_user', label: 'Utilisateurs de base (N0+)' },
  { value: 'franchisee_user', label: 'Équipe agence (N1+)' },
  { value: 'franchisee_admin', label: 'Dirigeants (N2+)' },
  { value: 'franchisor_user', label: 'Franchiseur (N3+)' },
  { value: 'platform_admin', label: 'Admin plateforme (N5+)' },
];
