/**
 * Configuration des colonnes du tableau RH unifié
 * Organisé par onglets avec headers groupés - VERSION OPTIMISÉE
 */

import { RHCollaborator } from '@/types/rh-suivi';

export type RHTabId = 'general' | 'infos_perso' | 'securite' | 'competences' | 'parc' | 'documents';

export interface ColumnGroup {
  id: string;
  label: string;
  icon?: string;
  className?: string;
  columns: ColumnDef[];
}

export interface ColumnDef {
  id: string;
  label: string;
  accessor: (row: RHCollaborator) => string | number | boolean | null | undefined;
  className?: string;
  width?: string; // Largeur CSS optimisée
  sensitive?: boolean;
}

// Colonnes fixes (toujours visibles) - COMPACTES ET FIXES
export const FIXED_COLUMNS: ColumnDef[] = [
  {
    id: 'last_name',
    label: 'Nom',
    accessor: (row) => row.last_name,
    width: 'w-[90px] min-w-[90px] max-w-[90px]',
  },
  {
    id: 'first_name',
    label: 'Prénom',
    accessor: (row) => row.first_name,
    width: 'w-[80px] min-w-[80px] max-w-[80px]',
  },
];

// Configuration par onglet - COLONNES OPTIMISÉES ET COMPACTES
export const TAB_COLUMNS: Record<RHTabId, ColumnGroup[]> = {
  general: [
    {
      id: 'contact',
      label: '📞 Contact',
      className: 'bg-sky-50/50 dark:bg-sky-950/20',
      columns: [
        { id: 'email', label: 'Email', accessor: (row) => row.email, width: 'w-40' },
        { id: 'phone', label: 'Tél.', accessor: (row) => row.phone, width: 'w-28' },
      ],
    },
    {
      id: 'ice',
      label: '❤️ ICE',
      className: 'bg-red-50/50 dark:bg-red-950/20',
      columns: [
        { id: 'emergency_contact', label: 'Contact', accessor: () => null, sensitive: true, width: 'w-28' },
        { id: 'emergency_phone', label: 'Tél.', accessor: () => null, sensitive: true, width: 'w-24' },
      ],
    },
    {
      id: 'dates',
      label: '📅 Dates',
      className: 'bg-slate-50/50 dark:bg-slate-950/20',
      columns: [
        { id: 'hiring_date', label: 'Entrée', accessor: (row) => row.hiring_date, width: 'w-24' },
        { id: 'leaving_date', label: 'Sortie', accessor: (row) => row.leaving_date, width: 'w-24' },
      ],
    },
    {
      id: 'infos_rh',
      label: '📋 RH',
      className: 'bg-amber-50/50 dark:bg-amber-950/20',
      columns: [
        { id: 'notes', label: 'Observations', accessor: (row) => row.notes, width: 'w-40' },
      ],
    },
  ],
  infos_perso: [
    {
      id: 'naissance',
      label: '🎂 Naissance',
      className: 'bg-pink-50/50 dark:bg-pink-950/20',
      columns: [
        { id: 'birth_date', label: 'Date', accessor: () => null, sensitive: true, width: 'w-24' },
        { id: 'birth_place', label: 'Lieu', accessor: (row) => row.birth_place, width: 'w-32' },
      ],
    },
    {
      id: 'adresse',
      label: '🏠 Adresse',
      className: 'bg-indigo-50/50 dark:bg-indigo-950/20',
      columns: [
        { id: 'street', label: 'Rue', accessor: (row) => row.street, width: 'w-40' },
        { id: 'postal_code', label: 'CP', accessor: (row) => row.postal_code, width: 'w-16' },
        { id: 'city', label: 'Ville', accessor: (row) => row.city, width: 'w-28' },
      ],
    },
    {
      id: 'documents_id',
      label: '🪪 Identité',
      className: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      columns: [
        { id: 'social_security_number', label: 'N° Sécu', accessor: () => null, sensitive: true, width: 'w-32' },
        { id: 'permis', label: 'Permis', accessor: (row) => row.permis, width: 'w-20' },
        { id: 'cni', label: 'CNI', accessor: (row) => row.cni, width: 'w-20' },
      ],
    },
  ],
  securite: [
    {
      id: 'tailles',
      label: '📏 Tailles',
      className: 'bg-orange-50/50 dark:bg-orange-950/20',
      columns: [
        { id: 'tailles_all', label: 'Tailles', accessor: () => null, width: 'w-28' },
      ],
    },
    {
      id: 'epi_status',
      label: '🦺 EPI',
      className: 'bg-green-50/50 dark:bg-green-950/20',
      columns: [
        { id: 'epi_indicator', label: 'Statut', accessor: () => null, width: 'w-14' },
      ],
    },
  ],
  competences: [
    {
      id: 'metiers',
      label: '🛠️ Métiers',
      className: 'bg-green-50/50 dark:bg-green-950/20',
      columns: [
        { id: 'metiers_liste', label: 'Compétences', accessor: (row) => row.competencies?.competences_techniques?.join(', ') || '', width: 'w-48' },
      ],
    },
    {
      id: 'habilitations',
      label: '⚡ Hab.',
      className: 'bg-purple-50/50 dark:bg-purple-950/20',
      columns: [
        { id: 'hab_elec_statut', label: 'Élec.', accessor: (row) => row.competencies?.habilitation_electrique_statut, width: 'w-20' },
      ],
    },
    {
      id: 'caces',
      label: '🚜 CACES',
      className: 'bg-indigo-50/50 dark:bg-indigo-950/20',
      columns: [
        { id: 'caces_count', label: 'Nb', accessor: (row) => row.competencies?.caces?.length || 0, width: 'w-12' },
      ],
    },
  ],
  parc: [
    {
      id: 'vehicule',
      label: '🚗 Véhicule',
      className: 'bg-blue-50/50 dark:bg-blue-950/20',
      columns: [
        { id: 'vehicule_attribue', label: 'Attribué', accessor: (row) => row.assets?.vehicule_attribue, width: 'w-44' },
      ],
    },
    {
      id: 'cartes',
      label: '💳 Cartes',
      className: 'bg-green-50/50 dark:bg-green-950/20',
      columns: [
        { id: 'carte_carburant', label: 'Carb.', accessor: (row) => row.assets?.carte_carburant ? 'Oui' : 'Non', width: 'w-20' },
        { id: 'carte_bancaire', label: 'Banq.', accessor: (row) => row.assets?.carte_bancaire ? 'Oui' : 'Non', width: 'w-20' },
        { id: 'carte_autre', label: 'Autre', accessor: (row) => row.assets?.carte_autre_nom || 'Non', width: 'w-20' },
      ],
    },
    {
      id: 'materiels',
      label: '📱 Matériels',
      className: 'bg-purple-50/50 dark:bg-purple-950/20',
      columns: [
        { id: 'informatique_liste', label: 'Info.', accessor: () => null, width: 'w-28' },
        { id: 'outils_liste', label: 'Outils', accessor: () => null, width: 'w-28' },
      ],
    },
  ],
  documents: [
    {
      id: 'documents',
      label: '📄 Documents',
      className: 'bg-amber-50/50 dark:bg-amber-950/20',
      columns: [
        { id: 'docs_icons', label: 'Disponibles', accessor: () => null, width: 'w-48' },
        { id: 'docs_coffre', label: 'Coffre', accessor: () => null, width: 'w-28' },
      ],
    },
  ],
};

// Configuration des onglets avec icônes et badges
export const TAB_CONFIG: { id: RHTabId; label: string; icon: string; shortLabel?: string }[] = [
  { id: 'general', label: 'Général', icon: 'User', shortLabel: 'Gén.' },
  { id: 'infos_perso', label: 'Infos perso', icon: 'UserCircle', shortLabel: 'Perso' },
  { id: 'securite', label: 'Sécurité', icon: 'Shield', shortLabel: 'Sécu' },
  { id: 'competences', label: 'Compétences', icon: 'Award', shortLabel: 'Comp.' },
  { id: 'parc', label: 'Parc & Matériel', icon: 'Car', shortLabel: 'Parc' },
  { id: 'documents', label: 'Documents', icon: 'FolderOpen', shortLabel: 'Docs' },
];

// Catégories de collaborateurs
export const COLLABORATOR_CATEGORIES = {
  ADMINISTRATIF: {
    label: 'Administratif',
    types: ['ADMINISTRATIF', 'DIRIGEANT', 'COMMERCIAL'],
    icon: '🏢',
    className: 'bg-blue-50/80 dark:bg-blue-900/20',
  },
  TERRAIN: {
    label: 'Terrain',
    types: ['TECHNICIEN', 'AUTRE'],
    icon: '🔧',
    className: 'bg-orange-50/80 dark:bg-orange-900/20',
  },
} as const;

export type CollaboratorCategory = keyof typeof COLLABORATOR_CATEGORIES;
