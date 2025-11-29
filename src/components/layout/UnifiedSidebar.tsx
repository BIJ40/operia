import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  Headset, Network, Building2, PieChart, GitCompare,
  Coins, Settings, Users, Database, Activity, ChevronRight, Home, Calendar, LifeBuoy
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleCapabilities } from '@/config/roleMatrix';
import logoHelpconfortServices from '@/assets/help-confort-services-logo.png';
import { useState, ReactNode } from 'react';

interface NavItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  description?: string;
  children?: NavItem[];
  badge?: string;
  minRole?: GlobalRole;
  requiresSupportConsole?: boolean;
}

interface NavGroup {
  label: ReactNode;
  labelKey: string;
  indexUrl: string; // URL de la page index de la section
  items: NavItem[];
  accessKey?: 'canAccessHelpAcademy' | 'canAccessPilotageAgence' | 'canAccessSupport' | 'canAccessFranchiseur' | 'canAccessAdmin';
}

export function UnifiedSidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { globalRole, agence, canAccessSupportConsole } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  const caps = getRoleCapabilities(globalRole);

  const isInEditMode = searchParams.get('edit') === 'true' && caps.canAccessAdmin;

  const getUrlWithEditMode = (url: string) => {
    const editablePrefix = ['/academy/apogee', '/academy/apporteurs', '/academy/documents', '/apogee', '/apporteurs', '/helpconfort'];
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
      label: <><span>Help</span><span className="text-helpconfort-orange animate-pulse">!</span><span> Academy</span></>,
      labelKey: 'help-academy',
      indexUrl: '/academy',
      items: [
        { title: 'Guide Apogée', url: '/academy/apogee', icon: BookOpen, description: 'Guide complet pour maîtriser le logiciel Apogée' },
        { title: 'Guide Apporteurs', url: '/academy/apporteurs', icon: FileText, description: 'Ressources pour les apporteurs d\'affaires' },
        { title: 'Base Documentaire', url: '/academy/documents', icon: FolderOpen, description: 'Documents et ressources HelpConfort' },
      ],
      accessKey: 'canAccessHelpAcademy',
    },
    {
      label: 'Pilotage Agence',
      labelKey: 'pilotage',
      indexUrl: '/pilotage',
      items: [
        { 
          title: 'Statistiques', 
          icon: PieChart, 
          children: [
            { title: 'Indicateurs généraux', url: '/pilotage/indicateurs', icon: BarChart3, description: 'Tableau de bord et KPI de votre agence' },
            { title: 'Indicateurs Apporteurs', url: '/pilotage/indicateurs/apporteurs', icon: BarChart3, description: 'Statistiques apporteurs' },
            { title: 'Indicateurs Univers', url: '/pilotage/indicateurs/univers', icon: BarChart3, description: 'Statistiques par univers' },
            { title: 'Indicateurs Techniciens', url: '/pilotage/indicateurs/techniciens', icon: BarChart3, description: 'Statistiques techniciens' },
            { title: 'Indicateurs SAV', url: '/pilotage/indicateurs/sav', icon: BarChart3, description: 'Statistiques SAV' },
          ]
        },
        { title: 'Actions à Mener', url: '/pilotage/actions', icon: ListTodo, description: 'Suivi des actions et tâches en cours' },
        { title: 'Diffusion', url: '/pilotage/diffusion', icon: Tv, description: 'Mode affichage TV agence', badge: 'En cours' },
        { title: 'RH Tech', url: '/pilotage/rh-tech', icon: Calendar, description: 'Planning hebdomadaire techniciens' },
      ],
      accessKey: 'canAccessPilotageAgence',
    },
    {
      label: 'Support',
      labelKey: 'support',
      indexUrl: '/support',
      items: [
        { title: 'Mes Demandes', url: '/support/mes-demandes', icon: LifeBuoy, description: 'Créer et suivre vos demandes de support' },
        { title: 'Console Support', url: '/support/console', icon: Headset, description: 'Traiter les demandes de support', requiresSupportConsole: true },
      ],
      accessKey: 'canAccessSupport',
    },
    {
      label: 'Réseau Franchiseur',
      labelKey: 'franchiseur',
      indexUrl: '/reseau',
      items: [
        { title: 'Dashboard Réseau', url: '/reseau/dashboard', icon: Network },
        { title: 'Agences', url: '/reseau/agences', icon: Building2 },
        { title: 'Animateurs', url: '/reseau/animateurs', icon: Users, minRole: 'franchisor_admin' },
        { title: 'Statistiques', url: '/reseau/stats', icon: PieChart },
        { title: 'Comparatifs', url: '/reseau/comparatifs', icon: GitCompare },
        { title: 'Redevances', url: '/reseau/redevances', icon: Coins, minRole: 'franchisor_admin' },
      ],
      accessKey: 'canAccessFranchiseur',
    },
    {
      label: 'Administration',
      labelKey: 'admin',
      indexUrl: '/admin',
      items: [
        { title: 'Utilisateurs', url: '/admin/users', icon: Users, description: 'Gérer les comptes utilisateurs' },
        { title: 'Agences', url: '/admin/agencies', icon: Building2 },
        { title: 'Sauvegardes', url: '/admin/backup', icon: Database },
        { title: 'Activité', url: '/admin/user-activity', icon: Activity },
        { title: 'Paramètres', url: '/admin', icon: Settings, description: 'Configuration du système' },
      ],
      accessKey: 'canAccessAdmin',
    },
  ];

  const filteredGroups = navGroups.filter(group => {
    if (!group.accessKey) return true;
    if (group.accessKey === 'canAccessPilotageAgence') {
      if (caps.requiresAgencyForPilotage && !agence) return false;
    }
    return caps[group.accessKey];
  });

  const getFilteredItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      if (item.requiresSupportConsole && !canAccessSupportConsole) return false;
      if (!item.minRole) return true;
      const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
      const requiredLevel = GLOBAL_ROLES[item.minRole];
      return userLevel >= requiredLevel;
    });
  };

  const isActive = (url?: string) => {
    if (!url) return false;
    if (url === '/') return location.pathname === '/';
    if (url === '/admin' || url === '/pilotage/indicateurs') return location.pathname === url;
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
            className={`object-contain transition-all ${collapsed ? 'h-10 w-10 mx-auto my-1' : 'w-full'}`}
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="pt-1 space-y-0">
        {/* Home link */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={isActive('/') && location.pathname === '/' ? 'bg-primary/10 text-primary' : ''}>
                  <Link to="/" className="flex items-center gap-2 py-1.5">
                    <Home className="w-4 h-4" />
                    {!collapsed && <span className="text-sm">Accueil</span>}
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
                <div className="flex items-center">
                  {/* Label cliquable → navigation vers la page index */}
                  <Link
                    to={group.indexUrl}
                    className={`
                      flex-1 cursor-pointer rounded-l-md transition-colors flex items-center px-2 py-1.5 mx-1
                      ${groupIsActive 
                        ? 'bg-primary/15 text-primary border-l-2 border-primary' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <span className={`text-xs font-semibold tracking-wide uppercase ${groupIsActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {!collapsed ? group.label : group.labelKey.charAt(0).toUpperCase()}
                    </span>
                  </Link>
                  
                  {/* Chevron cliquable → expand/collapse */}
                  {!collapsed && (
                    <button
                      onClick={(e) => toggleGroup(group.labelKey, e)}
                      className={`
                        p-1.5 mr-1 rounded-r-md transition-colors
                        ${groupIsActive ? 'text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-muted/50'}
                      `}
                    >
                      <ChevronRight 
                        className={`w-3.5 h-3.5 transition-transform ${isGroupOpen ? 'rotate-90' : ''}`}
                      />
                    </button>
                  )}
                </div>
                
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <SidebarGroupContent className="pt-0.5">
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
                              onOpenChange={() => toggleSubmenu(submenuKey)}
                            >
                              <SidebarMenuItem>
                                <SidebarMenuButton 
                                  onClick={() => toggleSubmenu(submenuKey)}
                                  className={`
                                    cursor-pointer transition-all duration-200 py-1.5
                                    ${hasActiveChild 
                                      ? isSubmenuOpen 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'bg-primary/15 text-primary border-l-2 border-primary'
                                      : 'hover:bg-muted hover:translate-x-0.5'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {!collapsed && (
                                      <>
                                        <span className="truncate flex-1 text-sm">{item.title}</span>
                                        <ChevronRight 
                                          className={`w-3.5 h-3.5 transition-transform ${hasActiveChild ? 'text-primary' : 'text-muted-foreground'} ${isSubmenuOpen ? 'rotate-90' : ''}`}
                                        />
                                      </>
                                    )}
                                  </div>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                                <div className="ml-3 border-l border-border/50 pl-2 py-0.5 space-y-0.5">
                                  {item.children.map((child) => {
                                    const ChildIcon = child.icon;
                                    const childActive = isActive(child.url);
                                    
                                    return (
                                      <SidebarMenuItem key={child.url}>
                                        <SidebarMenuButton 
                                          asChild 
                                          className={`
                                            transition-all duration-200 text-xs py-1
                                            ${childActive 
                                              ? 'bg-primary text-primary-foreground shadow-sm' 
                                              : 'hover:bg-muted hover:translate-x-0.5'
                                            }
                                          `}
                                          title={child.description}
                                        >
                                          <Link to={getUrlWithEditMode(child.url!)} className="flex items-center gap-2">
                                            <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                                            {!collapsed && <span className="truncate">{child.title}</span>}
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
                        
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton 
                              asChild 
                              className={`
                                transition-all duration-200 py-1.5
                                ${active 
                                  ? 'bg-primary text-primary-foreground shadow-sm' 
                                  : 'hover:bg-muted hover:translate-x-0.5'
                                }
                              `}
                              title={item.description}
                            >
                              <Link to={getUrlWithEditMode(item.url!)} className="flex items-center gap-2">
                                <Icon className="w-4 h-4 shrink-0" />
                                {!collapsed && (
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="truncate text-sm">{item.title}</span>
                                    {item.badge && (
                                      <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </Link>
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
    </Sidebar>
  );
}
