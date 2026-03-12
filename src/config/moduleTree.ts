/**
 * MODULE TREE — Canonical structure reference
 * 
 * This file serves ONLY as:
 * - Seed reference for the module_registry table
 * - Dev guard-rail for structural drift detection
 * 
 * It is NEVER read at runtime for permissions.
 * The source of truth is the `module_registry` table in Supabase.
 */

export interface ModuleTreeNode {
  key: string;
  label: string;
  nodeType: 'section' | 'screen' | 'feature';
  requiredPlan: 'STARTER' | 'PRO';
  deployed: boolean;
  /** Si true, ce module n'est activé que par overwrite utilisateur */
  overwriteOnly?: boolean;
  children?: ModuleTreeNode[];
}

export const MODULE_TREE: ModuleTreeNode[] = [
  {
    key: 'stats',
    label: 'Statistiques',
    nodeType: 'section',
    requiredPlan: 'STARTER',
    deployed: true,
    children: [
      { key: 'stats.general', label: 'Général', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'stats.apporteurs', label: 'Apporteurs', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'stats.techniciens', label: 'Techniciens', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'stats.univers', label: 'Univers', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'stats.sav', label: 'SAV', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'stats.previsionnel', label: 'Prévisionnel', nodeType: 'screen', requiredPlan: 'PRO', deployed: true },
      { key: 'stats.exports', label: 'Exports', nodeType: 'feature', requiredPlan: 'PRO', deployed: true },
    ],
  },
  {
    key: 'salaries',
    label: 'Salariés',
    nodeType: 'section',
    requiredPlan: 'STARTER',
    deployed: true,
    children: [
      { key: 'salaries.gestionnaire', label: 'Gestionnaire', nodeType: 'feature', requiredPlan: 'STARTER', deployed: true },
      { key: 'salaries.admin_rh', label: 'Admin RH', nodeType: 'feature', requiredPlan: 'PRO', deployed: true },
    ],
  },
  {
    key: 'outils',
    label: 'Outils',
    nodeType: 'section',
    requiredPlan: 'STARTER',
    deployed: true,
    children: [
      { key: 'outils.actions', label: 'Actions', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      {
        key: 'outils.apporteurs',
        label: 'Apporteurs',
        nodeType: 'section',
        requiredPlan: 'STARTER',
        deployed: true,
        children: [
          { key: 'outils.apporteurs.consulter', label: 'Consulter', nodeType: 'feature', requiredPlan: 'STARTER', deployed: true },
          { key: 'outils.apporteurs.gerer', label: 'Gérer', nodeType: 'feature', requiredPlan: 'STARTER', deployed: true },
        ],
      },
      {
        key: 'outils.administratif',
        label: 'Administratif',
        nodeType: 'section',
        requiredPlan: 'STARTER',
        deployed: true,
        children: [
          { key: 'outils.administratif.plannings', label: 'Plannings', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
          { key: 'outils.administratif.reunions', label: 'Réunions', nodeType: 'screen', requiredPlan: 'STARTER', deployed: false },
          { key: 'outils.administratif.documents', label: 'Documents', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
        ],
      },
      {
        key: 'outils.parc',
        label: 'Parc',
        nodeType: 'section',
        requiredPlan: 'PRO',
        deployed: true,
        children: [
          { key: 'outils.parc.vehicules', label: 'Véhicules', nodeType: 'screen', requiredPlan: 'PRO', deployed: true },
          { key: 'outils.parc.epi', label: 'EPI', nodeType: 'screen', requiredPlan: 'PRO', deployed: true },
          { key: 'outils.parc.equipements', label: 'Équipements', nodeType: 'screen', requiredPlan: 'PRO', deployed: true },
        ],
      },
      { key: 'outils.performance', label: 'Performance', nodeType: 'screen', requiredPlan: 'PRO', deployed: false },
      { key: 'outils.commercial', label: 'Commercial', nodeType: 'screen', requiredPlan: 'PRO', deployed: false },
    ],
  },
  {
    key: 'documents',
    label: 'Documents',
    nodeType: 'screen',
    requiredPlan: 'STARTER',
    deployed: true,
    children: [
      { key: 'documents.consulter', label: 'Consulter', nodeType: 'feature', requiredPlan: 'STARTER', deployed: true },
      { key: 'documents.gerer', label: 'Gérer', nodeType: 'feature', requiredPlan: 'STARTER', deployed: true },
      { key: 'documents.corbeille_vider', label: 'Vider corbeille', nodeType: 'feature', requiredPlan: 'PRO', deployed: true },
    ],
  },
  {
    key: 'guides',
    label: 'Guides',
    nodeType: 'section',
    requiredPlan: 'STARTER',
    deployed: true,
    children: [
      { key: 'guides.apogee', label: 'Apogee', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'guides.apporteurs', label: 'Apporteurs', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'guides.helpconfort', label: 'HelpConfort', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'guides.faq', label: 'FAQ', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
    ],
  },
  {
    key: 'ticketing',
    label: 'Ticketing',
    nodeType: 'section',
    requiredPlan: 'STARTER',
    deployed: true,
    overwriteOnly: true,
    children: [
      { key: 'ticketing.kanban', label: 'Kanban', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'ticketing.liste', label: 'Liste', nodeType: 'screen', requiredPlan: 'STARTER', deployed: true },
      { key: 'ticketing.create', label: 'Créer', nodeType: 'feature', requiredPlan: 'STARTER', deployed: true },
      { key: 'ticketing.manage', label: 'Gérer', nodeType: 'feature', requiredPlan: 'STARTER', deployed: true },
      { key: 'ticketing.import', label: 'Import', nodeType: 'feature', requiredPlan: 'PRO', deployed: false },
    ],
  },
  {
    key: 'aide',
    label: 'Aide',
    nodeType: 'section',
    requiredPlan: 'STARTER',
    deployed: true,
    children: [
      { key: 'aide.user', label: 'Utilisateur', nodeType: 'feature', requiredPlan: 'STARTER', deployed: true },
      { key: 'aide.agent', label: 'Agent', nodeType: 'feature', requiredPlan: 'PRO', deployed: true },
    ],
  },
];
