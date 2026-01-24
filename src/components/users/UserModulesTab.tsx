import { memo, useState, useMemo } from 'react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, canAccessModule } from '@/types/modules';
import { MODULE_OPTION_MIN_ROLES } from '@/permissions/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, Eye, ShieldCheck, Briefcase, Truck, 
  HelpCircle, CheckCircle2, ChevronDown, ChevronRight,
  FileText, Users, CreditCard, Car, Wrench, AlertTriangle,
  BookOpen, BarChart3, Headphones, Settings, MessageSquare, Kanban,
  Network, Building2, Coins, Calendar, MapPin, Search
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

// ============================================================================
// GENERATED FROM MODULE_DEFINITIONS - Single Source of Truth
// ============================================================================

// Mapping module -> catégorie UI (pour le regroupement visuel)
const MODULE_CATEGORY_MAP: Record<ModuleKey, string> = {
  rh: 'rh',
  parc: 'parc',
  help_academy: 'academy',
  pilotage_agence: 'pilotage',
  reseau_franchiseur: 'reseau',
  support: 'support',
  admin_plateforme: 'admin',
  apogee_tickets: 'projet',
  unified_search: 'other',
};

// Mapping icon par module (pour l'affichage)
const MODULE_ICONS: Record<ModuleKey, React.ReactNode> = {
  rh: <Briefcase className="w-5 h-5" />,
  parc: <Truck className="w-5 h-5" />,
  help_academy: <BookOpen className="w-5 h-5" />,
  pilotage_agence: <BarChart3 className="w-5 h-5" />,
  reseau_franchiseur: <Network className="w-5 h-5" />,
  support: <Headphones className="w-5 h-5" />,
  admin_plateforme: <Settings className="w-5 h-5" />,
  apogee_tickets: <Kanban className="w-5 h-5" />,
  unified_search: <Search className="w-5 h-5" />,
};

// Mapping couleur par catégorie
const CATEGORY_COLORS: Record<string, string> = {
  rh: 'text-helpconfort-blue',
  parc: 'text-helpconfort-orange',
  academy: 'text-primary',
  pilotage: 'text-emerald-500',
  reseau: 'text-purple-500',
  support: 'text-violet-500',
  admin: 'text-slate-500',
  projet: 'text-indigo-500',
  other: 'text-gray-500',
};

// Mapping icônes spécifiques par option (override le module)
const OPTION_ICONS: Record<string, React.ReactNode> = {
  'rh.rh_viewer': <Eye className="w-5 h-5" />,
  'rh.rh_admin': <ShieldCheck className="w-5 h-5" />,
  'parc.vehicules': <Car className="w-5 h-5" />,
  'parc.equipements': <Wrench className="w-5 h-5" />,
  'support.agent': <MessageSquare className="w-5 h-5" />,
  'support.admin': <Settings className="w-5 h-5" />,
  'pilotage_agence.carte_rdv': <MapPin className="w-5 h-5" />,
  'pilotage_agence.mes_apporteurs': <Building2 className="w-5 h-5" />,
  'pilotage_agence.gestion_apporteurs': <Building2 className="w-5 h-5" />,
  'reseau_franchiseur.redevances': <Coins className="w-5 h-5" />,
  'reseau_franchiseur.agences': <Building2 className="w-5 h-5" />,
};

// Features détaillées par option (pour l'UI explicative)
// NOTE: Options N1 (coffre, mon_planning, etc.) supprimées en v0.8.3
const OPTION_FEATURES: Record<string, string[]> = {
  'rh.rh_viewer': [
    'Voir les fiches des collaborateurs',
    'Uploader des documents',
    'Traiter les demandes de documents',
    'Gérer les absences et congés',
    '⛔ PAS d\'accès aux bulletins de paie',
  ],
  'rh.rh_admin': [
    '✅ Tout ce que fait le Gestionnaire RH',
    'Accès complet aux bulletins de paie',
    'Modification des informations salariales',
    'Export des données comptables',
  ],
  'parc.vehicules': [
    'Liste des véhicules de l\'agence',
    'Suivi des contrôles techniques',
    'Gestion des assurances',
    'Affectation aux techniciens',
  ],
  'parc.equipements': [
    'Inventaire du matériel',
    'Suivi des EPI',
    'Dates de renouvellement',
    'Affectation par collaborateur',
  ],
  'pilotage_agence.indicateurs': [
    'Dashboard avec KPIs principaux',
    'Vue d\'ensemble de l\'agence',
  ],
  'pilotage_agence.stats_hub': [
    'Analyses détaillées par technicien',
    'Suivi CA par apporteur',
    'Répartition par univers métier',
  ],
  'pilotage_agence.carte_rdv': [
    'Visualiser les RDV sur une carte',
    'Filtrer par technicien / date',
    'Optimiser les tournées',
  ],
  'pilotage_agence.mes_apporteurs': [
    'Liste des apporteurs de l\'agence',
    'Statistiques par apporteur',
    'Contacts et coordonnées',
  ],
  'pilotage_agence.gestion_apporteurs': [
    'Créer des comptes apporteurs',
    'Modifier les informations',
    'Gérer les accès portail',
  ],
  'support.user': [
    'Créer des demandes de support',
    'Suivre ses tickets',
    'Consulter l\'historique',
  ],
  'support.agent': [
    'Accès à la console support',
    'Voir tous les tickets du réseau',
    'Répondre et résoudre les tickets',
  ],
  'apogee_tickets.kanban': [
    'Consulter le tableau Kanban',
    'Voir les détails des tickets',
    'Filtrer et rechercher',
  ],
  'apogee_tickets.create': [
    'Créer des tickets depuis le Kanban',
    'Signaler des bugs ou demandes',
    'Attacher des fichiers',
  ],
  'apogee_tickets.manage': [
    'Modifier le statut et la priorité',
    'Éditer le contenu des tickets',
    'Gérer les qualifications',
  ],
  'apogee_tickets.import': [
    'Import en masse depuis Excel',
    'Mapping des colonnes',
    'Historique des imports',
  ],
  'reseau_franchiseur.dashboard': [
    'Vue d\'ensemble multi-agences',
    'Dashboard consolidé du réseau',
  ],
  'reseau_franchiseur.stats': [
    'Comparatif inter-agences',
    'Graphiques de performance',
  ],
  'reseau_franchiseur.agences': [
    'Liste des agences du réseau',
    'Fiches détaillées par agence',
  ],
  'reseau_franchiseur.redevances': [
    'Configuration des tranches',
    'Calcul automatique des royalties',
    'Historique des redevances',
  ],
};

// Target users par option
// NOTE: Options N1 (coffre, mon_planning, etc.) supprimées en v0.8.3
const OPTION_TARGET_USERS: Record<string, string> = {
  'rh.rh_viewer': 'Assistante RH, Manager',
  'rh.rh_admin': 'Dirigeant, Responsable Paie',
  'parc.vehicules': 'Dirigeant, Responsable logistique',
  'parc.equipements': 'Dirigeant, Responsable sécurité',
  'support.agent': 'Équipe support',
  'apogee_tickets.kanban': 'Tous les membres du projet',
  'apogee_tickets.create': 'Contributeurs actifs',
  'apogee_tickets.manage': 'Gestionnaires de projet',
  'apogee_tickets.import': 'Administrateurs projet',
  'pilotage_agence.indicateurs': 'Dirigeant, Responsable d\'agence',
  'pilotage_agence.stats_hub': 'Dirigeant, Analyste',
  'pilotage_agence.carte_rdv': 'Dirigeant, Responsable planning',
  'pilotage_agence.mes_apporteurs': 'Dirigeant, Commercial',
  'pilotage_agence.gestion_apporteurs': 'Dirigeant uniquement',
  'reseau_franchiseur.dashboard': 'Animateurs réseau',
  'reseau_franchiseur.stats': 'Animateurs réseau',
  'reseau_franchiseur.agences': 'Animateurs réseau',
  'reseau_franchiseur.redevances': 'Directeur réseau uniquement',
};

// ============================================================================
// PERMISSION DEFINITION GENERATED FROM MODULE_DEFINITIONS
// ============================================================================

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
  category: string;
}

/**
 * Génère les définitions de permissions depuis MODULE_DEFINITIONS
 * C'est LA source de vérité unique
 */
function generatePermissionsFromModules(): PermissionDefinition[] {
  const permissions: PermissionDefinition[] = [];
  
  for (const moduleDef of MODULE_DEFINITIONS) {
    const category = MODULE_CATEGORY_MAP[moduleDef.key] || 'other';
    const moduleIcon = MODULE_ICONS[moduleDef.key];
    const color = CATEGORY_COLORS[category];
    
    // Ajouter chaque option comme une permission
    for (const option of moduleDef.options) {
      const optionPath = `${moduleDef.key}.${option.key}`;
      const optionMinRoleKey = optionPath;
      const optionMinRole = MODULE_OPTION_MIN_ROLES[optionMinRoleKey] as GlobalRole | undefined;
      
      permissions.push({
        key: `${moduleDef.key}_${option.key}`,
        moduleKey: moduleDef.key,
        optionKey: option.key,
        label: option.label,
        shortDescription: option.description,
        features: OPTION_FEATURES[optionPath] || [option.description],
        targetUsers: OPTION_TARGET_USERS[optionPath] || 'Utilisateurs autorisés',
        icon: OPTION_ICONS[optionPath] || moduleIcon,
        color,
        minRole: optionMinRole || moduleDef.minRole,
        category,
      });
    }
  }
  
  return permissions;
}

// ============================================================================
// CATEGORY INFO
// ============================================================================

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
  other: { 
    label: 'Autres', 
    icon: <Search className="w-5 h-5 text-gray-500" />,
    description: 'Fonctionnalités diverses'
  },
};

// ============================================================================
// ROLE-BASED OPTION FILTERING
// ============================================================================

// Options autorisées par rôle pour chaque module
// NOTE: Options N1 supprimées en v0.8.3
const OPTIONS_BY_ROLE: Record<ModuleKey, Record<GlobalRole, string[]>> = {
  rh: {
    base_user: [],
    franchisee_user: [],
    franchisee_admin: ['rh_viewer', 'rh_admin'],
    franchisor_user: ['rh_viewer', 'rh_admin'],
    franchisor_admin: ['rh_viewer', 'rh_admin'],
    platform_admin: ['rh_viewer', 'rh_admin'],
    superadmin: ['rh_viewer', 'rh_admin'],
  },
  parc: {
    base_user: [],
    franchisee_user: [],
    franchisee_admin: ['vehicules', 'equipements', 'epi'],
    franchisor_user: ['vehicules', 'equipements', 'epi'],
    franchisor_admin: ['vehicules', 'equipements', 'epi'],
    platform_admin: ['vehicules', 'equipements', 'epi'],
    superadmin: ['vehicules', 'equipements', 'epi'],
  },
  reseau_franchiseur: {
    base_user: [],
    franchisee_user: [],
    franchisee_admin: [],
    franchisor_user: ['dashboard', 'agences', 'stats', 'comparatifs'],
    franchisor_admin: ['dashboard', 'agences', 'stats', 'comparatifs', 'redevances'],
    platform_admin: ['dashboard', 'agences', 'stats', 'comparatifs', 'redevances'],
    superadmin: ['dashboard', 'agences', 'stats', 'comparatifs', 'redevances'],
  },
  apogee_tickets: {
    base_user: ['kanban', 'create', 'manage', 'import'],
    franchisee_user: ['kanban', 'create', 'manage', 'import'],
    franchisee_admin: ['kanban', 'create', 'manage', 'import'],
    franchisor_user: ['kanban', 'create', 'manage', 'import'],
    franchisor_admin: ['kanban', 'create', 'manage', 'import'],
    platform_admin: ['kanban', 'create', 'manage', 'import'],
    superadmin: ['kanban', 'create', 'manage', 'import'],
  },
  // Modules avec toutes options disponibles selon le rôle minimum du module
  help_academy: {
    base_user: ['apogee', 'helpconfort', 'apporteurs', 'edition'],
    franchisee_user: ['apogee', 'helpconfort', 'apporteurs', 'edition'],
    franchisee_admin: ['apogee', 'helpconfort', 'apporteurs', 'edition'],
    franchisor_user: ['apogee', 'helpconfort', 'apporteurs', 'edition'],
    franchisor_admin: ['apogee', 'helpconfort', 'apporteurs', 'edition'],
    platform_admin: ['apogee', 'helpconfort', 'apporteurs', 'edition'],
    superadmin: ['apogee', 'helpconfort', 'apporteurs', 'edition'],
  },
  pilotage_agence: {
    base_user: [],
    franchisee_user: ['indicateurs', 'stats_hub', 'actions_a_mener', 'diffusion', 'exports', 'veille_apporteurs', 'carte_rdv'],
    franchisee_admin: ['indicateurs', 'stats_hub', 'actions_a_mener', 'diffusion', 'exports', 'veille_apporteurs', 'carte_rdv', 'mes_apporteurs', 'gestion_apporteurs'],
    franchisor_user: ['indicateurs', 'stats_hub', 'actions_a_mener', 'diffusion', 'exports', 'veille_apporteurs', 'carte_rdv', 'mes_apporteurs', 'gestion_apporteurs'],
    franchisor_admin: ['indicateurs', 'stats_hub', 'actions_a_mener', 'diffusion', 'exports', 'veille_apporteurs', 'carte_rdv', 'mes_apporteurs', 'gestion_apporteurs'],
    platform_admin: ['indicateurs', 'stats_hub', 'actions_a_mener', 'diffusion', 'exports', 'veille_apporteurs', 'carte_rdv', 'mes_apporteurs', 'gestion_apporteurs'],
    superadmin: ['indicateurs', 'stats_hub', 'actions_a_mener', 'diffusion', 'exports', 'veille_apporteurs', 'carte_rdv', 'mes_apporteurs', 'gestion_apporteurs'],
  },
  support: {
    base_user: ['user', 'agent'],
    franchisee_user: ['user', 'agent'],
    franchisee_admin: ['user', 'agent', 'admin'],
    franchisor_user: ['user', 'agent', 'admin'],
    franchisor_admin: ['user', 'agent', 'admin'],
    platform_admin: ['user', 'agent', 'admin'],
    superadmin: ['user', 'agent', 'admin'],
  },
  admin_plateforme: {
    base_user: [],
    franchisee_user: [],
    franchisee_admin: [],
    franchisor_user: [],
    franchisor_admin: [],
    platform_admin: ['users', 'agencies', 'permissions', 'backup', 'logs', 'faq_admin'],
    superadmin: ['users', 'agencies', 'permissions', 'backup', 'logs', 'faq_admin'],
  },
  unified_search: {
    base_user: [],
    franchisee_user: ['stats', 'docs'],
    franchisee_admin: ['stats', 'docs'],
    franchisor_user: ['stats', 'docs'],
    franchisor_admin: ['stats', 'docs'],
    platform_admin: ['stats', 'docs'],
    superadmin: ['stats', 'docs'],
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const UserModulesTab = memo(function UserModulesTab({
  enabledModules,
  userRole,
  canEdit,
  onModuleToggle,
  onModuleOptionToggle,
}: UserModulesTabProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['rh', 'parc', 'projet']);

  // Générer les permissions depuis MODULE_DEFINITIONS (source unique)
  const PERMISSION_DEFINITIONS = useMemo(() => generatePermissionsFromModules(), []);

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
    
    // Vérifier les contraintes spécifiques par module/option
    if (perm.optionKey) {
      const moduleOptions = OPTIONS_BY_ROLE[perm.moduleKey];
      if (moduleOptions) {
        const allowedOptions = moduleOptions[userRole];
        if (!allowedOptions || !allowedOptions.includes(perm.optionKey)) {
          return false;
        }
      }
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

  // Ordre des catégories pour l'affichage
  const categoryOrder = ['rh', 'parc', 'pilotage', 'projet', 'reseau', 'support', 'academy', 'admin', 'other'];

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

      {/* Permissions par catégorie (dans l'ordre défini) */}
      {categoryOrder.map(category => {
        const permissions = permissionsByCategory[category];
        if (!permissions || permissions.length === 0) return null;
        
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
                                    Cette permission nécessite un rôle {perm.minRole ? VISIBLE_ROLE_LABELS[perm.minRole] : 'supérieur'}
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