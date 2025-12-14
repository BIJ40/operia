/**
 * Configuration des colonnes du tableau RH unifié
 * Organisé par onglets avec headers groupés
 */

import { RHCollaborator } from '@/types/rh-suivi';

export type RHTabId = 'essentiel' | 'rh' | 'securite' | 'competences' | 'parc' | 'it' | 'documents';

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
  {
    id: 'type',
    label: 'Type',
    accessor: (row) => row.type,
  },
];

// Configuration par onglet
export const TAB_COLUMNS: Record<RHTabId, ColumnGroup[]> = {
  essentiel: [
    {
      id: 'contact',
      label: 'Contact',
      columns: [
        { id: 'email', label: 'Email', accessor: (row) => row.email },
        { id: 'phone', label: 'Téléphone', accessor: (row) => row.phone },
      ],
    },
    {
      id: 'dates',
      label: 'Dates',
      columns: [
        { id: 'hiring_date', label: 'Date entrée', accessor: (row) => row.hiring_date },
        { id: 'leaving_date', label: 'Date sortie', accessor: (row) => row.leaving_date },
      ],
    },
  ],
  rh: [
    {
      id: 'identite',
      label: 'Identité',
      columns: [
        { id: 'role', label: 'Fonction', accessor: (row) => row.role },
        { id: 'notes', label: 'Observations', accessor: (row) => row.notes },
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
        { id: 'vehicule_attribue', label: 'Marque / Modèle', accessor: (row) => row.assets?.vehicule_attribue },
      ],
    },
    {
      id: 'cartes',
      label: '💳 CARTES',
      className: 'bg-green-50 dark:bg-green-950/30',
      columns: [
        { id: 'carte_carburant', label: 'Carburant', accessor: (row) => row.assets?.carte_carburant ? 'Oui' : 'Non' },
        { id: 'carte_societe', label: 'Société', accessor: (row) => row.assets?.carte_societe ? 'Oui' : 'Non' },
      ],
    },
    {
      id: 'materiel_it',
      label: '📱 MATÉRIEL IT',
      className: 'bg-purple-50 dark:bg-purple-950/30',
      columns: [
        { id: 'tablette_telephone', label: 'Tablette / Tél', accessor: (row) => row.assets?.tablette_telephone },
        { id: 'imei', label: 'IMEI', accessor: (row) => row.assets?.imei },
      ],
    },
  ],
  it: [
    {
      id: 'acces',
      label: 'Accès',
      columns: [
        { id: 'acces_outils', label: 'Outils', accessor: (row) => row.it_access?.acces_outils?.join(', ') },
        { id: 'notes_it', label: 'Notes IT', accessor: (row) => row.it_access?.notes_it },
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
      ],
    },
  ],
};

export const TAB_CONFIG: { id: RHTabId; label: string; icon: string }[] = [
  { id: 'essentiel', label: 'Essentiel', icon: 'User' },
  { id: 'rh', label: 'RH', icon: 'FileText' },
  { id: 'securite', label: 'Sécurité & EPI', icon: 'Shield' },
  { id: 'competences', label: 'Compétences', icon: 'Award' },
  { id: 'parc', label: 'Parc & Matériel', icon: 'Car' },
  { id: 'it', label: 'IT & Accès', icon: 'Laptop' },
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
