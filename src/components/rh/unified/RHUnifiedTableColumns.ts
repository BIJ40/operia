/**
 * Configuration des colonnes du tableau RH unifié
 * Organisé par onglets avec headers groupés
 */

import { RHCollaborator } from '@/types/rh-suivi';

export type RHTabId = 'general' | 'securite' | 'competences' | 'parc' | 'idmdp' | 'documents';

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
  sensitive?: boolean;
}

// Colonnes fixes (toujours visibles)
export const FIXED_COLUMNS: ColumnDef[] = [
  {
    id: 'last_name',
    label: 'Nom',
    accessor: (row) => row.last_name,
  },
  {
    id: 'first_name',
    label: 'Prénom',
    accessor: (row) => row.first_name,
  },
];

// Configuration par onglet
export const TAB_COLUMNS: Record<RHTabId, ColumnGroup[]> = {
  general: [
    {
      id: 'contact',
      label: '📞 Contact',
      columns: [
        { id: 'email', label: 'Email', accessor: (row) => row.email, className: 'email-truncate' },
        { id: 'phone', label: 'Téléphone', accessor: (row) => row.phone },
      ],
    },
    {
      id: 'ice',
      label: '❤️ ICE',
      className: 'bg-red-50 dark:bg-red-950/30',
      columns: [
        { id: 'emergency_contact', label: 'Contact', accessor: () => null, sensitive: true },
        { id: 'emergency_phone', label: 'Téléphone', accessor: () => null, sensitive: true },
      ],
    },
    {
      id: 'infos_rh',
      label: 'Infos RH',
      className: 'bg-slate-50 dark:bg-slate-950/30',
      columns: [
        { id: 'social_security_number', label: 'N° Sécu', accessor: () => null, sensitive: true },
        { id: 'permis', label: 'Permis', accessor: (row) => row.permis },
        { id: 'cni', label: 'CNI', accessor: (row) => row.cni },
        { id: 'notes', label: 'Observations', accessor: (row) => row.notes },
      ],
    },
    {
      id: 'dates',
      label: 'Dates',
      columns: [
        { id: 'hiring_date', label: 'Entrée', accessor: (row) => row.hiring_date },
        { id: 'leaving_date', label: 'Sortie', accessor: (row) => row.leaving_date },
      ],
    },
  ],
  securite: [
    {
      id: 'tailles',
      label: 'Tailles',
      className: 'bg-orange-50 dark:bg-orange-950/30',
      columns: [
        { id: 'taille_haut', label: 'Haut', accessor: (row) => row.epi_profile?.taille_haut },
        { id: 'taille_bas', label: 'Bas', accessor: (row) => row.epi_profile?.taille_bas },
        { id: 'pointure', label: 'Pointure', accessor: (row) => row.epi_profile?.pointure },
        { id: 'taille_gants', label: 'Gants', accessor: (row) => row.epi_profile?.taille_gants },
      ],
    },
    {
      id: 'epi_status',
      label: 'Statut EPI',
      className: 'bg-yellow-50 dark:bg-yellow-950/30',
      columns: [
        { id: 'statut_epi', label: 'Statut', accessor: (row) => row.epi_profile?.statut_epi },
        { id: 'date_renouvellement', label: 'Renouvellement', accessor: (row) => row.epi_profile?.date_renouvellement },
      ],
    },
  ],
  competences: [
    {
      id: 'habilitations',
      label: 'Habilitations',
      className: 'bg-purple-50 dark:bg-purple-950/30',
      columns: [
        { id: 'hab_elec_statut', label: 'Hab. Élec.', accessor: (row) => row.competencies?.habilitation_electrique_statut },
        { id: 'hab_elec_date', label: 'Date', accessor: (row) => row.competencies?.habilitation_electrique_date },
      ],
    },
    {
      id: 'caces',
      label: 'CACES',
      className: 'bg-indigo-50 dark:bg-indigo-950/30',
      columns: [
        { id: 'caces_count', label: 'Nb CACES', accessor: (row) => row.competencies?.caces?.length || 0 },
      ],
    },
  ],
  parc: [
    {
      id: 'vehicule',
      label: '🚗 VÉHICULE',
      className: 'bg-blue-50 dark:bg-blue-950/30',
      columns: [
        { id: 'vehicule_attribue', label: 'Véhicule', accessor: (row) => row.assets?.vehicule_attribue },
      ],
    },
    {
      id: 'cartes',
      label: '💳 CARTES',
      className: 'bg-green-50 dark:bg-green-950/30',
      columns: [
        { id: 'carte_carburant', label: 'Carburant', accessor: (row) => row.assets?.carte_carburant ? 'Oui' : 'Non' },
        { id: 'carte_bancaire', label: 'Bancaire', accessor: (row) => row.assets?.carte_bancaire ? 'Oui' : 'Non' },
        { id: 'carte_autre', label: 'Autre', accessor: (row) => row.assets?.carte_autre_nom || 'Non' },
      ],
    },
    {
      id: 'materiels',
      label: '📱 MATÉRIELS',
      className: 'bg-purple-50 dark:bg-purple-950/30',
      columns: [
        { id: 'informatique_liste', label: 'Informatique', accessor: () => null },
        { id: 'outils_liste', label: 'Outils', accessor: () => null },
      ],
    },
  ],
  idmdp: [
    {
      id: 'identifiants',
      label: '🔐 IDENTIFIANTS',
      className: 'bg-amber-50 dark:bg-amber-950/30',
      columns: [
        { id: 'identifiants_liste', label: 'ID / MDP', accessor: () => null, sensitive: true },
      ],
    },
  ],
  documents: [
    {
      id: 'documents',
      label: '📄 DOCUMENTS',
      className: 'bg-amber-50 dark:bg-amber-950/30',
      columns: [
        { id: 'docs_icons', label: 'Documents disponibles', accessor: () => null },
        { id: 'docs_coffre', label: 'Accès Coffre', accessor: () => null },
      ],
    },
  ],
};

export const TAB_CONFIG: { id: RHTabId; label: string; icon: string }[] = [
  { id: 'general', label: 'Général', icon: 'User' },
  { id: 'securite', label: 'Sécurité & EPI', icon: 'Shield' },
  { id: 'competences', label: 'Compétences', icon: 'Award' },
  { id: 'parc', label: 'Parc & Matériel', icon: 'Car' },
  { id: 'idmdp', label: 'ID / MDP', icon: 'Key' },
  { id: 'documents', label: 'Documents', icon: 'FolderOpen' },
];

// Catégories de collaborateurs
export const COLLABORATOR_CATEGORIES = {
  ADMINISTRATIF: {
    label: 'Administratif',
    types: ['ASSISTANTE', 'DIRIGEANT', 'COMMERCIAL'],
    icon: '🏢',
    className: 'bg-blue-100 dark:bg-blue-900/30',
  },
  TERRAIN: {
    label: 'Terrain',
    types: ['TECHNICIEN', 'AUTRE'],
    icon: '🔧',
    className: 'bg-green-100 dark:bg-green-900/30',
  },
} as const;

export type CollaboratorCategory = keyof typeof COLLABORATOR_CATEGORIES;
