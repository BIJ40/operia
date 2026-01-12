import { memo, useState } from 'react';
import { GlobalRole, GLOBAL_ROLES, GLOBAL_ROLE_LABELS } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, canAccessModule } from '@/types/modules';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Lock, Eye, ShieldCheck, Briefcase, Truck, 
  HelpCircle, CheckCircle2, ChevronDown, ChevronRight,
  FileText, Users, CreditCard, Car, Wrench, AlertTriangle,
  BookOpen, BarChart3, Headphones, Settings, MessageSquare, Kanban,
  Network, Building2, Coins, Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UserModulesTabProps {
  enabledModules: EnabledModules | null;
  userRole: GlobalRole | null;
  canEdit: boolean;
  onModuleToggle: (moduleKey: ModuleKey, enabled: boolean) => void;
  onModuleOptionToggle: (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => void;
}

// Définition complète des permissions avec descriptions détaillées
interface PermissionDefinition {
  key: string;
  moduleKey: ModuleKey;
  optionKey?: string;
  label: string;
  shortDescription: string;
  features: string[];
  targetUsers: string;
  icon: React.ReactNode;
  color: string;
  minRole?: GlobalRole;
  category: 'rh' | 'parc' | 'academy' | 'pilotage' | 'support' | 'admin' | 'projet' | 'reseau' | 'other';
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // ===== RH =====
  {
    key: 'rh_coffre',
    moduleKey: 'rh',
    optionKey: 'coffre',
    label: 'Mon Coffre RH Personnel',
    shortDescription: 'Accès à ses propres documents RH',
    features: [
      'Consulter ses bulletins de paie',
      'Voir ses contrats et avenants',
      'Télécharger ses attestations',
      'Faire des demandes de documents (attestation employeur, etc.)',
      'Suivre l\'état de ses demandes',
    ],
    targetUsers: 'Tous les collaborateurs',
    icon: <Lock className="w-5 h-5" />,
    color: 'text-helpconfort-blue',
    category: 'rh',
  },
  {
    key: 'rh_mon_planning',
    moduleKey: 'rh',
    optionKey: 'mon_planning',
    label: 'Mon Planning Personnel',
    shortDescription: 'Accès à son planning hebdomadaire',
    features: [
      'Consulter son planning de la semaine',
      'Voir ses RDV et interventions',
      'Signer et valider son planning',
    ],
    targetUsers: 'Techniciens et collaborateurs terrain',
    icon: <Users className="w-5 h-5" />,
    color: 'text-emerald-500',
    category: 'rh',
  },
  // Mon Véhicule et Mes Equipements déplacés dans la catégorie 'parc'
  {
    key: 'rh_viewer',
    moduleKey: 'rh',
    optionKey: 'rh_viewer',
    label: 'Gestionnaire RH',
    shortDescription: 'Gestion des documents équipe SANS accès paie',
    features: [
      'Voir les fiches de tous les collaborateurs',
      'Uploader des documents (contrats, attestations)',
      'Traiter les demandes de documents',
      'Gérer les absences et congés',
      '⛔ PAS d\'accès aux bulletins de paie',
      '⛔ PAS d\'accès aux informations salariales',
    ],
    targetUsers: 'Assistante RH, Manager d\'équipe',
    icon: <Eye className="w-5 h-5" />,
    color: 'text-amber-500',
    minRole: 'franchisee_admin',
    category: 'rh',
  },
  {
    key: 'rh_admin',
    moduleKey: 'rh',
    optionKey: 'rh_admin',
    label: 'Administrateur RH Complet',
    shortDescription: 'Contrôle TOTAL sur la paie et les RH',
    features: [
      '✅ Tout ce que fait le Gestionnaire RH',
      'Accès complet aux bulletins de paie',
      'Modification des informations salariales',
      'Export des données comptables',
      'Paramétrage des contrats types',
      'Accès aux données sensibles (N° sécu, etc.)',
    ],
    targetUsers: 'Dirigeant, Responsable Paie, Comptable',
    icon: <ShieldCheck className="w-5 h-5" />,
    color: 'text-destructive',
    minRole: 'franchisee_admin',
    category: 'rh',
  },

  // ===== RH - Self-service (Mon Véhicule / Mon Matériel) =====
  // CORRECTION: Ces options sont sous 'rh', pas 'parc' (alignement avec MODULE_DEFINITIONS)
  {
    key: 'rh_mon_vehicule',
    moduleKey: 'rh',
    optionKey: 'mon_vehicule',
    label: 'Mon Véhicule',
    shortDescription: 'Voir son véhicule de service assigné',
    features: [
      'Consulter les informations de son véhicule',
      'Voir les dates de CT et révision',
      'Signaler une anomalie ou panne',
      'Faire une demande concernant le véhicule',
    ],
    targetUsers: 'Techniciens avec véhicule attribué',
    icon: <Car className="w-5 h-5" />,
    color: 'text-helpconfort-orange',
    category: 'rh',
  },
  {
    key: 'rh_mon_materiel',
    moduleKey: 'rh',
    optionKey: 'mon_materiel',
    label: 'Mon Matériel',
    shortDescription: 'Voir son matériel et équipements assignés',
    features: [
      'Consulter le matériel attribué',
      'Voir ses EPI et équipements',
      'Signaler un besoin ou problème',
    ],
    targetUsers: 'Techniciens et collaborateurs terrain',
    icon: <Wrench className="w-5 h-5" />,
    color: 'text-helpconfort-orange',
    category: 'rh',
  },

  // ===== PARC - Gestion admin =====
  {
    key: 'parc_vehicules',
    moduleKey: 'parc',
    optionKey: 'vehicules',
    label: 'Gestion Véhicules',
    shortDescription: 'Suivi du parc automobile',
    features: [
      'Liste des véhicules de l\'agence',
      'Suivi des contrôles techniques',
      'Gestion des assurances',
      'Historique des entretiens',
      'Affectation aux techniciens',
    ],
    targetUsers: 'Dirigeant, Responsable logistique',
    icon: <Car className="w-5 h-5" />,
    color: 'text-helpconfort-orange',
    minRole: 'franchisee_admin',
    category: 'parc',
  },
  {
    key: 'parc_equipements',
    moduleKey: 'parc',
    optionKey: 'equipements',
    label: 'Gestion Équipements & EPI',
    shortDescription: 'Matériel et équipements de protection',
    features: [
      'Inventaire du matériel',
      'Suivi des EPI (casques, gants, etc.)',
      'Dates de renouvellement',
      'Affectation par collaborateur',
      'Alertes d\'expiration',
    ],
    targetUsers: 'Dirigeant, Responsable sécurité',
    icon: <Wrench className="w-5 h-5" />,
    minRole: 'franchisee_admin',
    color: 'text-helpconfort-orange',
    category: 'parc',
  },

  // ===== ACADEMY =====
  {
    key: 'help_academy',
    moduleKey: 'help_academy',
    label: 'Help Academy',
    shortDescription: 'Accès à la base de connaissances',
    features: [
      'Documentation Apogée',
      'Guides métier HelpConfort',
      'Fiches apporteurs',
      'Chatbot d\'assistance',
    ],
    targetUsers: 'Tous les utilisateurs',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'text-primary',
    category: 'academy',
  },

  // ===== PILOTAGE =====
  {
    key: 'pilotage_agence',
    moduleKey: 'pilotage_agence',
    label: 'Pilotage Agence',
    shortDescription: 'Tableaux de bord et statistiques',
    features: [
      'Dashboard de l\'agence',
      'Indicateurs de performance (CA, SAV, etc.)',
      'Suivi par univers et apporteur',
      'Actions à mener',
      'Mode diffusion',
    ],
    targetUsers: 'Dirigeant, Responsable d\'agence',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'text-emerald-500',
    minRole: 'franchisee_admin',
    category: 'pilotage',
  },
  {
    key: 'pilotage_stats_hub',
    moduleKey: 'pilotage_agence',
    optionKey: 'stats_hub',
    label: 'Stats Hub',
    shortDescription: 'Tableaux de bord avancés',
    features: [
      'Analyses détaillées par technicien',
      'Suivi CA par apporteur',
      'Répartition par univers métier',
    ],
    targetUsers: 'Dirigeant, Responsable d\'agence',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'text-emerald-500',
    minRole: 'franchisee_admin',
    category: 'pilotage',
  },
  {
    key: 'pilotage_carte_rdv',
    moduleKey: 'pilotage_agence',
    optionKey: 'carte_rdv',
    label: 'Carte RDV',
    shortDescription: 'Carte interactive des interventions',
    features: [
      'Visualiser les RDV sur une carte',
      'Filtrer par technicien / date',
      'Optimiser les tournées',
    ],
    targetUsers: 'Dirigeant, Responsable planning',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'text-emerald-500',
    minRole: 'franchisee_user',
    category: 'pilotage',
  },
  {
    key: 'pilotage_mes_apporteurs',
    moduleKey: 'pilotage_agence',
    optionKey: 'mes_apporteurs',
    label: 'Mes Apporteurs',
    shortDescription: 'Consultation des apporteurs',
    features: [
      'Liste des apporteurs de l\'agence',
      'Statistiques par apporteur',
      'Contacts et coordonnées',
    ],
    targetUsers: 'Dirigeant, Commercial',
    icon: <Building2 className="w-5 h-5" />,
    color: 'text-emerald-500',
    minRole: 'franchisee_admin',
    category: 'pilotage',
  },
  {
    key: 'pilotage_gestion_apporteurs',
    moduleKey: 'pilotage_agence',
    optionKey: 'gestion_apporteurs',
    label: 'Gestion Apporteurs',
    shortDescription: 'Créer et gérer les comptes apporteurs',
    features: [
      'Créer des comptes apporteurs',
      'Modifier les informations',
      'Gérer les accès portail',
    ],
    targetUsers: 'Dirigeant uniquement',
    icon: <Building2 className="w-5 h-5" />,
    color: 'text-emerald-500',
    minRole: 'franchisee_admin',
    category: 'pilotage',
  },

  // ===== RÉSEAU FRANCHISEUR =====
  {
    key: 'reseau_dashboard',
    moduleKey: 'reseau_franchiseur',
    optionKey: 'dashboard',
    label: 'Dashboard Réseau',
    shortDescription: 'Vue d\'ensemble multi-agences',
    features: [
      'Dashboard consolidé du réseau',
      'Vue globale des performances',
      'Filtres par agences',
    ],
    targetUsers: 'Animateurs et Directeurs réseau',
    icon: <Network className="w-5 h-5" />,
    color: 'text-purple-500',
    minRole: 'franchisor_user',
    category: 'reseau',
  },
  {
    key: 'reseau_agences',
    moduleKey: 'reseau_franchiseur',
    optionKey: 'agences',
    label: 'Gestion des Agences',
    shortDescription: 'Fiches et paramètres agences',
    features: [
      'Liste des agences du réseau',
      'Fiches détaillées par agence',
      'Paramètres et configuration',
    ],
    targetUsers: 'Animateurs et Directeurs réseau',
    icon: <Building2 className="w-5 h-5" />,
    color: 'text-purple-500',
    minRole: 'franchisor_user',
    category: 'reseau',
  },
  {
    key: 'reseau_stats',
    moduleKey: 'reseau_franchiseur',
    optionKey: 'stats',
    label: 'Statistiques Réseau',
    shortDescription: 'Comparatifs et graphiques',
    features: [
      'Comparatif inter-agences',
      'Graphiques de performance',
      'Tableaux de bord avancés',
    ],
    targetUsers: 'Animateurs et Directeurs réseau',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'text-purple-500',
    minRole: 'franchisor_user',
    category: 'reseau',
  },
  {
    key: 'reseau_periodes',
    moduleKey: 'reseau_franchiseur',
    optionKey: 'periodes',
    label: 'Gestion des Périodes',
    shortDescription: 'Périodes comptables et exercices',
    features: [
      'Configuration des périodes',
      'Clôtures mensuelles',
      'Historique par exercice',
    ],
    targetUsers: 'Animateurs et Directeurs réseau',
    icon: <Calendar className="w-5 h-5" />,
    color: 'text-purple-500',
    minRole: 'franchisor_user',
    category: 'reseau',
  },
  {
    key: 'reseau_redevances',
    moduleKey: 'reseau_franchiseur',
    optionKey: 'redevances',
    label: 'Redevances (Royalties)',
    shortDescription: 'Calcul et suivi des redevances',
    features: [
      'Configuration des tranches',
      'Calcul automatique des royalties',
      'Historique des redevances',
      'Modèles de facturation',
    ],
    targetUsers: 'Directeur réseau uniquement',
    icon: <Coins className="w-5 h-5" />,
    color: 'text-amber-500',
    minRole: 'franchisor_admin',
    category: 'reseau',
  },

  // ===== SUPPORT =====
  {
    key: 'support_user',
    moduleKey: 'support',
    label: 'Support Utilisateur',
    shortDescription: 'Créer et suivre ses tickets',
    features: [
      'Créer des demandes de support',
      'Suivre ses tickets',
      'Consulter l\'historique',
      'Accéder à la FAQ',
    ],
    targetUsers: 'Tous les utilisateurs',
    icon: <Headphones className="w-5 h-5" />,
    color: 'text-violet-500',
    category: 'support',
  },
  {
    key: 'support_agent',
    moduleKey: 'support',
    optionKey: 'agent',
    label: 'Agent Support (Console)',
    shortDescription: 'Traiter les tickets des autres utilisateurs',
    features: [
      'Accès à la console support',
      'Voir tous les tickets du réseau',
      'Répondre et résoudre les tickets',
      'Escalader vers le niveau supérieur',
    ],
    targetUsers: 'Équipe support (interne ou externe)',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-violet-500',
    minRole: 'base_user',
    category: 'support',
  },

  // ===== GESTION DE PROJET =====
  {
    key: 'apogee_tickets_kanban',
    moduleKey: 'apogee_tickets',
    optionKey: 'kanban',
    label: 'Accès Kanban',
    shortDescription: 'Voir le tableau Kanban et les tickets',
    features: [
      'Consulter le tableau Kanban',
      'Voir les détails des tickets',
      'Filtrer et rechercher',
    ],
    targetUsers: 'Tous les membres du projet',
    icon: <Kanban className="w-5 h-5" />,
    color: 'text-indigo-500',
    minRole: 'base_user',
    category: 'projet',
  },
  {
    key: 'apogee_tickets_create',
    moduleKey: 'apogee_tickets',
    optionKey: 'create',
    label: 'Créer des tickets',
    shortDescription: 'Créer de nouveaux tickets',
    features: [
      'Créer des tickets depuis le Kanban',
      'Signaler des bugs ou demandes',
      'Attacher des fichiers',
    ],
    targetUsers: 'Contributeurs actifs',
    icon: <Kanban className="w-5 h-5" />,
    color: 'text-indigo-500',
    minRole: 'base_user',
    category: 'projet',
  },
  {
    key: 'apogee_tickets_manage',
    moduleKey: 'apogee_tickets',
    optionKey: 'manage',
    label: 'Modifier les tickets',
    shortDescription: 'Éditer priorité, statut, contenu',
    features: [
      'Modifier le statut et la priorité',
      'Éditer le contenu des tickets',
      'Gérer les qualifications',
    ],
    targetUsers: 'Gestionnaires de projet',
    icon: <Kanban className="w-5 h-5" />,
    color: 'text-indigo-500',
    minRole: 'base_user',
    category: 'projet',
  },
  {
    key: 'apogee_tickets_import',
    moduleKey: 'apogee_tickets',
    optionKey: 'import',
    label: 'Import Excel',
    shortDescription: 'Importer des tickets depuis fichiers Excel',
    features: [
      'Import en masse depuis Excel',
      'Mapping des colonnes',
      'Historique des imports',
    ],
    targetUsers: 'Administrateurs projet',
    icon: <Kanban className="w-5 h-5" />,
    color: 'text-indigo-500',
    minRole: 'base_user',
    category: 'projet',
  },

  // ===== ADMIN =====
  {
    key: 'admin_plateforme',
    moduleKey: 'admin_plateforme',
    label: 'Administration Plateforme',
    shortDescription: 'Paramètres système et utilisateurs',
    features: [
      'Gestion des utilisateurs',
      'Configuration des agences',
      'Paramètres globaux',
      'Logs et supervision',
    ],
    targetUsers: 'Administrateurs plateforme uniquement',
    icon: <Settings className="w-5 h-5" />,
    color: 'text-slate-500',
    minRole: 'platform_admin',
    category: 'admin',
  },
];

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  rh: { 
    label: 'Ressources Humaines', 
    icon: <Briefcase className="w-5 h-5 text-helpconfort-blue" />,
    description: 'Documents, paie, contrats et gestion des collaborateurs'
  },
  parc: { 
    label: 'Parc & Équipements', 
    icon: <Truck className="w-5 h-5 text-helpconfort-orange" />,
    description: 'Véhicules, matériel et EPI'
  },
  academy: { 
    label: 'Formation & Documentation', 
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    description: 'Base de connaissances et guides'
  },
  pilotage: { 
    label: 'Pilotage & Statistiques', 
    icon: <BarChart3 className="w-5 h-5 text-emerald-500" />,
    description: 'Indicateurs de performance et tableaux de bord'
  },
  support: { 
    label: 'Support', 
    icon: <Headphones className="w-5 h-5 text-violet-500" />,
    description: 'Assistance et tickets'
  },
  admin: { 
    label: 'Administration', 
    icon: <Settings className="w-5 h-5 text-slate-500" />,
    description: 'Configuration système'
  },
  projet: { 
    label: 'Gestion de Projet', 
    icon: <Kanban className="w-5 h-5 text-indigo-500" />,
    description: 'Kanban et tickets développement'
  },
  reseau: { 
    label: 'Réseau Franchiseur', 
    icon: <Network className="w-5 h-5 text-purple-500" />,
    description: 'Pilotage multi-agences et redevances'
  },
};

// Mapping rôle global → options RH autorisées
// CORRECTION: mon_vehicule et mon_materiel sont sous rh (self-service)
const RH_OPTIONS_BY_ROLE: Record<GlobalRole, string[]> = {
  base_user: ['coffre', 'mon_planning', 'mon_vehicule', 'mon_materiel'],
  franchisee_user: ['coffre', 'mon_planning', 'mon_vehicule', 'mon_materiel'],
  franchisee_admin: ['coffre', 'mon_planning', 'mon_vehicule', 'mon_materiel', 'rh_viewer', 'rh_admin'],
  franchisor_user: ['coffre', 'mon_planning', 'mon_vehicule', 'mon_materiel', 'rh_viewer', 'rh_admin'],
  franchisor_admin: ['coffre', 'mon_planning', 'mon_vehicule', 'mon_materiel', 'rh_viewer', 'rh_admin'],
  platform_admin: ['coffre', 'mon_planning', 'mon_vehicule', 'mon_materiel', 'rh_viewer', 'rh_admin'],
  superadmin: ['coffre', 'mon_planning', 'mon_vehicule', 'mon_materiel', 'rh_viewer', 'rh_admin'],
};

// Mapping rôle global → options Parc autorisées (gestion admin seulement)
const PARC_OPTIONS_BY_ROLE: Record<GlobalRole, string[]> = {
  base_user: [],
  franchisee_user: [],
  franchisee_admin: ['vehicules', 'equipements', 'epi'],
  franchisor_user: ['vehicules', 'equipements', 'epi'],
  franchisor_admin: ['vehicules', 'equipements', 'epi'],
  platform_admin: ['vehicules', 'equipements', 'epi'],
  superadmin: ['vehicules', 'equipements', 'epi'],
};

// Mapping rôle global → options Réseau autorisées (automatique N3+, redevances N4+)
const RESEAU_OPTIONS_BY_ROLE: Record<GlobalRole, string[]> = {
  base_user: [],
  franchisee_user: [],
  franchisee_admin: [],
  franchisor_user: ['dashboard', 'agences', 'stats', 'periodes'], // N3 - pas redevances
  franchisor_admin: ['dashboard', 'agences', 'stats', 'periodes', 'redevances'], // N4 - tout
  platform_admin: ['dashboard', 'agences', 'stats', 'periodes', 'redevances'],
  superadmin: ['dashboard', 'agences', 'stats', 'periodes', 'redevances'],
};

// Mapping rôle global → options Projet autorisées (toutes options disponibles pour tous les rôles)
const PROJET_OPTIONS_BY_ROLE: Record<GlobalRole, string[]> = {
  base_user: ['kanban', 'create', 'manage', 'import'],
  franchisee_user: ['kanban', 'create', 'manage', 'import'],
  franchisee_admin: ['kanban', 'create', 'manage', 'import'],
  franchisor_user: ['kanban', 'create', 'manage', 'import'],
  franchisor_admin: ['kanban', 'create', 'manage', 'import'],
  platform_admin: ['kanban', 'create', 'manage', 'import'],
  superadmin: ['kanban', 'create', 'manage', 'import'],
};

export const UserModulesTab = memo(function UserModulesTab({
  enabledModules,
  userRole,
  canEdit,
  onModuleToggle,
  onModuleOptionToggle,
}: UserModulesTabProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['rh', 'parc']);

  const isModuleEnabled = (moduleKey: ModuleKey): boolean => {
    if (!enabledModules) return false;
    const state = enabledModules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  const isOptionEnabled = (moduleKey: ModuleKey, optionKey: string): boolean => {
    if (!enabledModules) return false;
    const state = enabledModules[moduleKey];
    if (typeof state === 'object' && state.options) {
      return state.options[optionKey] ?? false;
    }
    return false;
  };

  const isPermissionEnabled = (perm: PermissionDefinition): boolean => {
    if (perm.optionKey) {
      return isModuleEnabled(perm.moduleKey) && isOptionEnabled(perm.moduleKey, perm.optionKey);
    }
    return isModuleEnabled(perm.moduleKey);
  };

  const isPermissionAllowed = (perm: PermissionDefinition): boolean => {
    if (!userRole) return false;
    
    // Vérifier le rôle minimum du module
    if (!canAccessModule(userRole, perm.moduleKey)) return false;
    
    // Vérifier les contraintes spécifiques RH (coffre, mon_planning disponibles pour N1)
    if (perm.moduleKey === 'rh' && perm.optionKey) {
      const allowedOptions = RH_OPTIONS_BY_ROLE[userRole];
      if (!allowedOptions) return false;
      return allowedOptions.includes(perm.optionKey);
    }
    
    // Vérifier les contraintes spécifiques Parc
    if (perm.moduleKey === 'parc' && perm.optionKey) {
      const allowedOptions = PARC_OPTIONS_BY_ROLE[userRole];
      if (!allowedOptions) return false;
      return allowedOptions.includes(perm.optionKey);
    }
    
    // Vérifier les contraintes spécifiques Réseau (automatique N3+, redevances N4+)
    if (perm.moduleKey === 'reseau_franchiseur' && perm.optionKey) {
      const allowedOptions = RESEAU_OPTIONS_BY_ROLE[userRole];
      if (!allowedOptions) return false;
      return allowedOptions.includes(perm.optionKey);
    }
    
    // Vérifier les contraintes spécifiques Projet (apogee_tickets)
    if (perm.moduleKey === 'apogee_tickets' && perm.optionKey) {
      const allowedOptions = PROJET_OPTIONS_BY_ROLE[userRole];
      if (!allowedOptions) return false;
      return allowedOptions.includes(perm.optionKey);
    }
    
    // Vérifier le rôle minimum de la permission
    if (perm.minRole) {
      return GLOBAL_ROLES[userRole] >= GLOBAL_ROLES[perm.minRole];
    }
    
    return true;
  };

  const togglePermission = (perm: PermissionDefinition) => {
    if (!canEdit || !isPermissionAllowed(perm)) return;
    
    const isCurrentlyEnabled = isPermissionEnabled(perm);
    
    if (perm.optionKey) {
      // C'est une option - s'assurer que le module est activé d'abord
      if (!isModuleEnabled(perm.moduleKey) && !isCurrentlyEnabled) {
        onModuleToggle(perm.moduleKey, true);
      }
      onModuleOptionToggle(perm.moduleKey, perm.optionKey, !isCurrentlyEnabled);
    } else {
      // C'est un module complet
      onModuleToggle(perm.moduleKey, !isCurrentlyEnabled);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Grouper par catégorie
  const permissionsByCategory = PERMISSION_DEFINITIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, PermissionDefinition[]>);

  // Compter les permissions actives
  const activeCount = PERMISSION_DEFINITIONS.filter(p => isPermissionEnabled(p)).length;

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Cochez les permissions que vous souhaitez accorder à cet utilisateur
          </span>
        </div>
        <Badge variant="secondary">
          {activeCount} permission{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Permissions par catégorie */}
      {Object.entries(permissionsByCategory).map(([category, permissions]) => {
        const categoryInfo = CATEGORY_INFO[category];
        const isExpanded = expandedCategories.includes(category);
        const activeInCategory = permissions.filter(p => isPermissionEnabled(p)).length;

        return (
          <Card key={category} className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      {categoryInfo?.icon}
                      <div>
                        <CardTitle className="text-base">{categoryInfo?.label}</CardTitle>
                        <CardDescription className="text-xs">{categoryInfo?.description}</CardDescription>
                      </div>
                    </div>
                    {activeInCategory > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {activeInCategory} actif{activeInCategory > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-3">
                    {permissions.map(perm => {
                      const isEnabled = isPermissionEnabled(perm);
                      const isAllowed = isPermissionAllowed(perm);
                      const isDisabled = !canEdit || !isAllowed;

                      return (
                        <div
                          key={perm.key}
                          className={`relative rounded-lg border-2 p-4 transition-all ${
                            isDisabled ? 'opacity-50 cursor-not-allowed bg-muted/30' : 'cursor-pointer hover:shadow-md'
                          } ${
                            isEnabled 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-muted hover:border-primary/40'
                          }`}
                          onClick={() => togglePermission(perm)}
                        >
                          <div className="flex gap-4">
                            {/* Checkbox */}
                            <div className="pt-0.5">
                              <Checkbox
                                checked={isEnabled}
                                disabled={isDisabled}
                                onCheckedChange={() => togglePermission(perm)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5"
                              />
                            </div>

                            {/* Contenu */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className={perm.color}>{perm.icon}</span>
                                <h4 className="font-semibold">{perm.label}</h4>
                                {isEnabled && (
                                  <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                                )}
                              </div>

                              {/* Description courte */}
                              <p className="text-sm text-muted-foreground mb-3">
                                {perm.shortDescription}
                              </p>

                              {/* Liste des fonctionnalités */}
                              <div className="bg-muted/50 rounded-md p-3 mb-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Cette permission donne accès à :
                                </p>
                                <ul className="text-sm space-y-1">
                                  {perm.features.map((feature, idx) => (
                                    <li key={idx} className={`flex items-start gap-2 ${
                                      feature.startsWith('⛔') ? 'text-destructive' : 
                                      feature.startsWith('✅') ? 'text-primary' : ''
                                    }`}>
                                      {!feature.startsWith('⛔') && !feature.startsWith('✅') && (
                                        <span className="text-primary mt-0.5">•</span>
                                      )}
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Cible */}
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Recommandé pour : <strong>{perm.targetUsers}</strong>
                                </span>
                              </div>

                              {/* Avertissement si rôle insuffisant */}
                              {!isAllowed && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <span>
                                    Cette permission nécessite un rôle {perm.minRole ? GLOBAL_ROLE_LABELS[perm.minRole] : 'supérieur'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
});
