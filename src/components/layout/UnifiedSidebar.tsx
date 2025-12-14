import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  GraduationCap, FileText, FolderOpen, BarChart3, ListTodo, Tv, Heart,
  Headset, Network, Building2, PieChart, GitCompare, Briefcase,
  Coins, Settings, Users, Database, Activity, ChevronRight, Home, Calendar, LifeBuoy, MessageCircle, Kanban, FolderKanban, HelpCircle, Sparkles, Wrench, Brain, Radar
} from 'lucide-react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleCapabilities } from '@/config/roleMatrix';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';
import logoHelpconfortServices from '@/assets/help-confort-services-logo.png';
import { useState, useEffect, ReactNode } from 'react';
import { useGlobalFeatureFlags, isFeatureFlagEnabled } from '@/hooks/useGlobalFeatureFlags';
import { ModuleKey } from '@/types/modules';

import { getCurrentVersion } from '@/config/changelog';

// Mapping route → pageKey pour récupérer le menu_label
const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  // Index pages (sections)
  [ROUTES.academy.index]: 'academy_index',
  [ROUTES.agency.index]: 'pilotage_index',
  [ROUTES.support.index]: 'support_index',
  [ROUTES.projects.index]: 'projects_index',
  [ROUTES.reseau.index]: 'reseau_index',
  [ROUTES.admin.index]: 'admin_index',
  // Academy
  [ROUTES.academy.apogee]: 'academy_apogee',
  [ROUTES.academy.apporteurs]: 'academy_apporteurs',
  [ROUTES.academy.documents]: 'academy_documents',
  // Pilotage
  [ROUTES.agency.indicateurs]: 'pilotage_indicateurs',
  [ROUTES.agency.indicateursApporteurs]: 'pilotage_indicateurs_apporteurs',
  [ROUTES.agency.indicateursUnivers]: 'pilotage_indicateurs_univers',
  [ROUTES.agency.indicateursTechniciens]: 'pilotage_indicateurs_techniciens',
  [ROUTES.agency.indicateursSav]: 'pilotage_indicateurs_sav',
  [ROUTES.agency.actions]: 'pilotage_actions',
  [ROUTES.agency.diffusion]: 'pilotage_diffusion',
  [ROUTES.agency.rhTech]: 'pilotage_rh_tech',
  [ROUTES.rh.equipe]: 'rh_equipe',
  // Support
  [ROUTES.support.console]: 'support_console',
  // Projects
  [ROUTES.projects.kanban]: 'projects_kanban',
  [ROUTES.projects.incomplete]: 'projects_incomplete',
  // Réseau
  [ROUTES.reseau.dashboard]: 'reseau_dashboard',
  [ROUTES.reseau.agences]: 'reseau_agences',
  [ROUTES.reseau.animateurs]: 'reseau_animateurs',
  [ROUTES.reseau.tableaux]: 'reseau_stats',
  [ROUTES.reseau.periodes]: 'reseau_periodes',
  [ROUTES.reseau.redevances]: 'reseau_redevances',
  // Admin
  [ROUTES.admin.users]: 'admin_users',
  [ROUTES.admin.agencies]: 'admin_agencies',
  [ROUTES.admin.backup]: 'admin_backup',
  [ROUTES.admin.pageMetadata]: 'admin_page_metadata',
};

interface NavItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  description?: string;
  children?: NavItem[];
  badge?: string;
  minRole?: GlobalRole;
  requiresSupportConsoleUI?: boolean;
  isDisabled?: boolean; // Lien désactivé (tuile "Bientôt")
  featureFlagKey?: string; // Clé du feature flag global à vérifier (ex: 'pilotage.actions-mener')
}

interface NavGroup {
  label: ReactNode;
  labelKey: string;
  indexUrl: string; // URL de la page index de la section
  icon: React.ElementType; // Icône de la catégorie
  items: NavItem[];
  accessKey?: 'canAccessHelpAcademy' | 'canAccessPilotageAgence' | 'canAccessSupport' | 'canAccessFranchiseur' | 'canAccessAdmin';
}

export function UnifiedSidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { globalRole, agence, canAccessSupportConsoleUI, isAdmin, hasModule } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const menuLabels = useMenuLabels();
  
  // Feature flags globaux
  const { data: globalFlags } = useGlobalFeatureFlags();
  
  
  // Helper pour obtenir le label d'un item (menu_label personnalisé ou titre par défaut)
  const getItemLabel = (item: NavItem): string => {
    if (item.url) {
      const pageKey = ROUTE_TO_PAGE_KEY[item.url];
      if (pageKey && menuLabels.has(pageKey)) {
        return menuLabels.get(pageKey)!;
      }
    }
    return item.title;
  };
  
  // Helper pour obtenir le label d'un groupe (menu_label personnalisé ou label par défaut)
  const getGroupLabel = (group: NavGroup): ReactNode => {
    const pageKey = ROUTE_TO_PAGE_KEY[group.indexUrl];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return group.label;
  };
  
  // Auto-open groups based on current route
  const getActiveGroup = (): string | null => {
    if (location.pathname.startsWith('/academy')) return 'help-academy';
    if (location.pathname === '/mon-coffre-rh' || location.pathname.startsWith('/hc-agency/demandes-rh')) return 'rh';
    if (location.pathname.startsWith('/hc-agency')) return 'pilotage';
    if (location.pathname.startsWith('/support')) return 'support';
    if (location.pathname.startsWith('/projects')) return 'projects';
    if (location.pathname.startsWith('/hc-reseau')) return 'franchiseur';
    if (location.pathname.startsWith('/admin')) return 'admin';
    return null;
  };
  
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = getActiveGroup();
    return active ? new Set([active]) : new Set();
  });
  
  // Ouvrir le groupe et sous-menu actifs en fonction de la route
  useEffect(() => {
    const activeGroup = getActiveGroup();
    if (activeGroup) {
      setOpenGroups(new Set([activeGroup]));
    }
    
    // Auto-ouvrir le sous-menu Statistiques si on est sur une de ses routes
    const statsRoutes = [
      ROUTES.agency.statsHub,
      ROUTES.agency.indicateurs,
      ROUTES.agency.indicateursApporteurs,
      ROUTES.agency.indicateursUnivers,
      ROUTES.agency.indicateursTechniciens,
      ROUTES.agency.indicateursSav,
    ];
    if (statsRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'))) {
      setOpenSubmenus(new Set(['statistiques']));
    }
  }, [location.pathname]);

  const caps = getRoleCapabilities(globalRole);

  const isInEditMode = searchParams.get('edit') === 'true' && caps.canAccessAdmin;

  const getUrlWithEditMode = (url: string) => {
    const editablePrefix = ['/academy/apogee', '/academy/apporteurs', '/academy/hc-base', '/apogee', '/apporteurs', '/helpconfort'];
    const isEditableUrl = editablePrefix.some(prefix => url.startsWith(prefix));
    if (isInEditMode && isEditableUrl) {
      return `${url}?edit=true`;
    }
    return url;
  };

  const toggleGroup = (label: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  // Navigation groups avec indexUrl pour chaque section
  const navGroups: NavGroup[] = [
    {
      label: <>Help<span className="text-helpconfort-orange font-black">!</span> Academy</>,
      labelKey: 'help-academy',
      indexUrl: ROUTES.academy.index,
      icon: GraduationCap,
      items: [
        { title: 'Guide Apogée', url: ROUTES.academy.apogee, icon: GraduationCap, description: 'Guide complet pour maîtriser le logiciel Apogée' },
        { title: 'Guide Apporteurs', url: ROUTES.academy.apporteurs, icon: FileText, description: 'Ressources pour les apporteurs d\'affaires', badge: 'Bientôt', isDisabled: true },
        { title: 'Base Documentaire', url: ROUTES.academy.documents, icon: FolderOpen, description: 'Documents et ressources HelpConfort' },
        { title: 'Mes Favoris', url: ROUTES.academy.favorites, icon: Heart, description: 'Vos sections favorites' },
      ],
      accessKey: 'canAccessHelpAcademy',
    },
    {
      label: 'Mon Agence',
      labelKey: 'pilotage',
      indexUrl: ROUTES.agency.index,
      icon: Building2,
      items: [
        { 
          title: 'Stats Hub', 
          url: ROUTES.agency.statsHub,
          icon: PieChart, 
          description: 'Centre statistiques unifié'
        },
        { title: 'Actions à Mener', url: ROUTES.agency.actions, icon: ListTodo, description: 'Suivi des actions et tâches en cours', featureFlagKey: 'pilotage.actions-mener' },
        { title: 'Veille Apporteurs', url: ROUTES.agency.veilleApporteurs, icon: Radar, description: 'Suivi performance et alertes apporteurs' },
        { title: 'Commercial', url: ROUTES.agency.commercial, icon: Briefcase, description: 'Outils et suivi commercial' },
        { title: 'Diffusion', url: ROUTES.agency.diffusion, icon: Tv, description: 'Mode affichage TV agence', badge: 'En cours', featureFlagKey: 'pilotage.diffusion' },
        { title: 'Validation plannings', url: ROUTES.agency.rhTech, icon: Calendar, description: 'Validation des plannings hebdomadaires', badge: 'Bientôt', isDisabled: true, featureFlagKey: 'rh.validation-plannings' },
      ],
      accessKey: 'canAccessPilotageAgence',
    },
    {
      label: 'Mon Espace RH',
      labelKey: 'rh',
      indexUrl: ROUTES.rh.index,
      icon: Briefcase,
      items: [
        // Back-office N2
        { title: 'Suivi RH', url: ROUTES.rh.suivi, icon: Users, description: 'Gestion complète des collaborateurs (back-office)', minRole: 'franchisee_admin' },
        { title: 'Mon équipe', url: ROUTES.rh.equipe, icon: Users, description: 'Collaborateurs, documents RH et bulletins de salaire', minRole: 'franchisee_admin' },
        { title: 'Traiter demandes', url: ROUTES.rh.demandes, icon: FileText, description: 'Traiter les demandes de documents', minRole: 'franchisee_admin' },
        // Portail salarié N1+
        { title: 'Mon Coffre RH', url: ROUTES.rh.coffre, icon: FolderOpen, description: 'Mes documents RH personnels' },
        { title: 'Mes demandes', url: ROUTES.rh.demande, icon: FileText, description: 'Créer et suivre mes demandes' },
        { title: 'Mon planning', url: ROUTES.rh.monPlanning, icon: Calendar, description: 'Mon planning hebdomadaire' },
        { title: 'Ma signature', url: ROUTES.rh.signature, icon: FileText, description: 'Gérer ma signature personnelle' },
      ],
      accessKey: 'canAccessPilotageAgence',
    },
    {
      label: 'Espace Technicien',
      labelKey: 'technicien',
      indexUrl: ROUTES.agency.techInterventions,
      icon: Wrench,
      items: [
        { title: 'APP', url: ROUTES.agency.techInterventions, icon: Wrench, description: 'Interventions et relevés techniques' },
      ],
    },
    {
      label: 'Support',
      labelKey: 'support',
      indexUrl: ROUTES.support.index,
      icon: Headset,
      items: [
        { title: 'Support', url: ROUTES.support.index, icon: HelpCircle, description: 'Chat IA et assistance en ligne' },
        { title: 'Console Support', url: ROUTES.support.console, icon: Headset, description: 'Traiter les demandes de support', requiresSupportConsoleUI: true },
      ],
      accessKey: 'canAccessSupport',
    },
    {
      label: 'Gestion de Projet',
      labelKey: 'projects',
      indexUrl: ROUTES.projects.index,
      icon: FolderKanban,
      items: [
        { title: 'Kanban', url: ROUTES.projects.kanban, icon: Kanban, description: 'Tableau de bord projet' },
        { title: 'Liste', url: ROUTES.projects.list, icon: ListTodo, description: 'Vue liste des tickets' },
        { title: 'IA-IA (Doublons)', url: ROUTES.projects.duplicates, icon: GitCompare, description: 'Détection des doublons' },
        
        { title: 'Tickets incomplets', url: ROUTES.projects.incomplete, icon: FileText, description: 'Tickets à compléter' },
      ],
    },
    {
      label: 'Espace Franchiseur',
      labelKey: 'franchiseur',
      indexUrl: ROUTES.reseau.index,
      icon: Network,
      items: [
        { title: 'Dashboard Réseau', url: ROUTES.reseau.dashboard, icon: Network },
        { title: 'Agences', url: ROUTES.reseau.agences, icon: Building2 },
        { title: 'Animateurs', url: ROUTES.reseau.animateurs, icon: Users, minRole: 'franchisor_admin' },
        { title: 'Tableaux', url: ROUTES.reseau.tableaux, icon: PieChart },
        { title: 'Périodes', url: ROUTES.reseau.periodes, icon: GitCompare },
        { title: 'Redevances', url: ROUTES.reseau.redevances, icon: Coins, minRole: 'franchisor_admin' },
      ],
      accessKey: 'canAccessFranchiseur',
    },
    {
      label: 'Administration',
      labelKey: 'admin',
      indexUrl: ROUTES.admin.index,
      icon: Settings,
      items: [
        { title: 'Utilisateurs', url: ROUTES.admin.users, icon: Users, description: 'Gérer les comptes utilisateurs' },
        { title: 'Agences', url: ROUTES.admin.agencies, icon: Building2 },
        { title: 'Annonces', url: ROUTES.admin.announcements, icon: MessageCircle, description: 'Annonces prioritaires' },
        { title: 'FAQ', url: ROUTES.admin.faq, icon: HelpCircle, description: 'Gérer les questions fréquentes' },
        { title: 'Helpi', url: ROUTES.admin.helpi, icon: Brain, description: 'Moteur de connaissances IA' },
        { title: 'Sauvegardes', url: ROUTES.admin.backup, icon: Database },
        { title: 'Activité', url: ROUTES.admin.userActivity, icon: Activity },
        { title: 'Paramètres', url: ROUTES.admin.index, icon: Settings, description: 'Configuration du système' },
      ],
      accessKey: 'canAccessAdmin',
    },
  ];

  const filteredGroups = navGroups.filter(group => {
    // ✅ FIX F-PERM-2: Filtrer le groupe projects si module apogee_tickets non activé
    if (group.labelKey === 'projects') {
      return hasModule('apogee_tickets');
    }
    
    // ✅ FIX: Filtrer Help Academy si module help_academy non activé
    if (group.labelKey === 'help-academy') {
      return hasModule('help_academy');
    }
    
    // ✅ FIX: Filtrer Pilotage Agence si module pilotage_agence non activé
    if (group.labelKey === 'pilotage') {
      return hasModule('pilotage_agence');
    }
    
    // ✅ FIX P0: Filtrer Mon Espace RH si module rh non activé
    if (group.labelKey === 'rh') {
      return hasModule('rh');
    }
    
    if (!group.accessKey) return true;
    if (group.accessKey === 'canAccessPilotageAgence') {
      if (caps.requiresAgencyForPilotage && !agence) return false;
    }
    return caps[group.accessKey];
  });

  const getFilteredItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      // ✅ Vérifier les feature flags globaux (sauf pour admins)
      if (item.featureFlagKey && !isAdmin) {
        const flagEnabled = globalFlags?.get(item.featureFlagKey);
        if (flagEnabled === false) return false;
      }
      
      if (item.requiresSupportConsoleUI && !canAccessSupportConsoleUI) return false;
      if (!item.minRole) return true;
      const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
      const requiredLevel = GLOBAL_ROLES[item.minRole];
      return userLevel >= requiredLevel;
    });
  };

  const isActive = (url?: string) => {
    if (!url) return false;
    if (url === '/') return location.pathname === '/';
    if (url === '/admin' || url === '/hc-agency/indicateurs') return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  const isChildActive = (item: NavItem): boolean => {
    if (item.url && isActive(item.url)) return true;
    if (item.children) return item.children.some(child => isActive(child.url));
    return false;
  };

  const isGroupActive = (group: NavGroup): boolean => {
    return location.pathname.startsWith(group.indexUrl);
  };

  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(() => new Set());

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <Sidebar className="border-r bg-sidebar" collapsible="icon">
      <SidebarHeader className="border-b p-0">
        <Link to="/" className="block w-full">
          <img 
            src={logoHelpconfortServices} 
            alt="HelpConfort Services" 
            className={`object-contain transition-all ${collapsed ? 'h-16 w-16 mx-auto my-2' : 'w-full py-2'}`}
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="pt-1 space-y-0">
        {/* Home & Dashboard links */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={isActive('/') && location.pathname === '/' ? 'bg-helpconfort-blue/8 text-helpconfort-blue border-l-2 border-helpconfort-blue' : ''}>
                  <Link to="/" className="group/item flex items-center gap-2 py-1.5">
                    <Home className="w-4 h-4 transition-transform duration-300 group-hover/item:animate-bounce-subtle" />
                    {!collapsed && <span className="text-sm">Accueil</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={isActive('/dashboard') ? 'bg-helpconfort-blue/8 text-helpconfort-blue border-l-2 border-helpconfort-blue' : ''}>
                  <Link to="/dashboard" className="group/item flex items-center gap-2 py-1.5">
                    <BarChart3 className="w-4 h-4 transition-transform duration-300 group-hover/item:animate-bounce-subtle" />
                    {!collapsed && <span className="text-sm">Mon Dashboard</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation groups */}
        {filteredGroups.map((group) => {
          const items = getFilteredItems(group.items);
          if (items.length === 0) return null;

          const isGroupOpen = openGroups.has(group.labelKey);
          const groupIsActive = isGroupActive(group);

          return (
            <Collapsible 
              key={group.labelKey} 
              open={isGroupOpen}
              onOpenChange={() => {}}
            >
              <SidebarGroup className="py-0.5">
                <div className="flex items-center group/nav mx-1">
                  {/* Label cliquable → navigation vers la page index */}
                  <Link
                    to={group.indexUrl}
                    className={`
                      flex-1 cursor-pointer rounded-xl transition-all duration-300 ease-out flex items-center gap-2 px-3 py-2
                      ${groupIsActive 
                        ? 'bg-helpconfort-blue/8 text-helpconfort-blue border-l-2 border-helpconfort-blue' 
                        : 'hover:bg-helpconfort-blue/5 hover:scale-[1.02] hover:shadow-sm'
                      }
                    `}
                  >
                    <group.icon className="w-4 h-4 flex-shrink-0 text-helpconfort-blue" />
                    <span className={`text-xs font-semibold tracking-wide uppercase transition-colors duration-300 ${groupIsActive ? 'text-helpconfort-blue' : 'text-muted-foreground group-hover/nav:text-helpconfort-blue'}`}>
                      {!collapsed ? getGroupLabel(group) : group.labelKey.charAt(0).toUpperCase()}
                    </span>
                  </Link>
                  
                  {/* Chevron cliquable → expand/collapse */}
                  {!collapsed && (
                    <button
                      onClick={(e) => toggleGroup(group.labelKey, e)}
                      className={`
                        p-2 rounded-xl transition-all duration-300 ease-out
                        ${groupIsActive ? 'text-helpconfort-blue hover:bg-helpconfort-blue/10 hover:scale-110' : 'text-muted-foreground hover:bg-muted/50 hover:text-helpconfort-blue hover:scale-110'}
                      `}
                      aria-label={isGroupOpen ? `Réduire la section ${group.labelKey}` : `Développer la section ${group.labelKey}`}
                      aria-expanded={isGroupOpen}
                    >
                      <ChevronRight 
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${isGroupOpen ? 'rotate-90' : ''}`}
                      />
                    </button>
                  )}
                </div>
                
                <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <SidebarGroupContent className="pt-0.5 animate-fade-in">
                    <SidebarMenu className="space-y-0.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        
                        if (item.children) {
                          const submenuKey = item.title.toLowerCase().replace(/\s+/g, '-');
                          const isSubmenuOpen = openSubmenus.has(submenuKey);
                          const hasActiveChild = item.children.some(child => isActive(child.url));
                          
                          return (
                            <Collapsible
                              key={submenuKey}
                              open={isSubmenuOpen}
                              onOpenChange={() => {}}
                            >
                              <SidebarMenuItem>
                                <div className={`
                                  flex items-center w-full rounded-xl transition-all duration-300 ease-out
                                  ${hasActiveChild || isActive(item.url)
                                    ? isSubmenuOpen 
                                      ? 'bg-helpconfort-blue/5 text-helpconfort-blue' 
                                      : 'bg-helpconfort-blue/8 text-helpconfort-blue border-l-2 border-helpconfort-blue'
                                    : 'hover:bg-helpconfort-blue/5 hover:scale-[1.01]'
                                  }
                                `}>
                                  {/* Partie cliquable pour navigation */}
                                  {item.url ? (
                                    <Link
                                      to={getUrlWithEditMode(item.url)}
                                      onClick={() => {
                                        // Ouvrir le sous-menu quand on clique sur le lien parent
                                        if (!openSubmenus.has(submenuKey)) {
                                          setOpenSubmenus(prev => new Set([...prev, submenuKey]));
                                        }
                                      }}
                                      className="group/item flex items-center gap-2 flex-1 py-2 px-3 hover:translate-x-0.5 transition-all duration-300"
                                    >
                                      <Icon className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/item:animate-bounce-subtle" />
                                      {!collapsed && <span className="truncate text-sm">{getItemLabel(item)}</span>}
                                    </Link>
                                  ) : (
                                    <button
                                      onClick={() => toggleSubmenu(submenuKey)}
                                      className="group/item flex items-center gap-2 flex-1 py-2 px-3"
                                    >
                                      <Icon className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/item:animate-bounce-subtle" />
                                      {!collapsed && <span className="truncate text-sm">{getItemLabel(item)}</span>}
                                    </button>
                                  )}
                                  {/* Chevron pour expand/collapse */}
                                  {!collapsed && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleSubmenu(submenuKey);
                                      }}
                                      className="p-1.5 hover:bg-muted rounded-r-md"
                                    >
                                      <ChevronRight 
                                        className={`w-3.5 h-3.5 transition-transform ${hasActiveChild || isActive(item.url) ? 'text-helpconfort-blue' : 'text-muted-foreground'} ${isSubmenuOpen ? 'rotate-90' : ''}`}
                                      />
                                    </button>
                                  )}
                                </div>
                              </SidebarMenuItem>
                              <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                                <div className="ml-3 border-l border-border/50 pl-2 py-0.5 space-y-0.5 animate-fade-in">
                                  {item.children.map((child) => {
                                    const ChildIcon = child.icon;
                                    const childActive = isActive(child.url);
                                    
                                    return (
                                      <SidebarMenuItem key={child.url}>
                                        <SidebarMenuButton 
                                          asChild 
                                          className={`
                                            transition-all duration-300 ease-out text-xs py-1.5 rounded-lg
                                            ${childActive 
                                              ? 'bg-helpconfort-blue/10 text-helpconfort-blue border-l-2 border-helpconfort-blue' 
                                              : 'hover:bg-helpconfort-blue/5 hover:translate-x-0.5 hover:scale-[1.01]'
                                            }
                                          `}
                                          title={child.description}
                                        >
                                        <Link to={getUrlWithEditMode(child.url!)} className="group/child flex items-center gap-2">
                                            <ChildIcon className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover/child:animate-bounce-subtle" />
                                            {!collapsed && <span className="truncate">{getItemLabel(child)}</span>}
                                          </Link>
                                        </SidebarMenuButton>
                                      </SidebarMenuItem>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        }
                        
                        const active = isActive(item.url);
                        const isItemDisabled = item.isDisabled;
                        
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton 
                              asChild={!isItemDisabled}
                              disabled={isItemDisabled}
                              className={`
                                transition-all duration-300 ease-out py-2 rounded-xl
                                ${isItemDisabled 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : active 
                                    ? 'bg-helpconfort-blue/10 text-helpconfort-blue border-l-2 border-helpconfort-blue' 
                                    : 'hover:bg-helpconfort-blue/5 hover:translate-x-0.5 hover:scale-[1.01]'
                                }
                              `}
                              title={item.description}
                            >
                              {isItemDisabled ? (
                                <div className="group/item flex items-center gap-2">
                                  <Icon className="w-4 h-4 shrink-0" />
                                  {!collapsed && (
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="truncate text-sm">{getItemLabel(item)}</span>
                                      {item.badge && (
                                        <span className="text-[10px] bg-helpconfort-blue text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Link to={getUrlWithEditMode(item.url!)} className="group/item flex items-center gap-2">
                                  <Icon className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/item:animate-bounce-subtle" />
                                  {!collapsed && (
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="truncate text-sm">{getItemLabel(item)}</span>
                                      {item.badge && (
                                        <span className="text-[10px] bg-helpconfort-orange text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </Link>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      
      <SidebarFooter className="border-t p-2 space-y-2">
        {/* P1 FIX: Bouton "Tout replier" pour les utilisateurs avec beaucoup de sections */}
        {filteredGroups.length > 4 && !collapsed && (
          <button
            onClick={() => setOpenGroups(new Set())}
            className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-left px-2 py-1 rounded hover:bg-muted"
          >
            ↑ Tout replier
          </button>
        )}
        <Link
          to="/changelog"
          className={`text-xs font-semibold text-muted-foreground hover:text-primary transition-colors block ${collapsed ? 'text-center' : 'text-left'}`}
        >
          {getCurrentVersion().version}
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
