import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  Headset, MessageSquare, Network, Building2, PieChart, GitCompare,
  Coins, Settings, Users, Shield, Database, Activity, ChevronRight, Home, User, Grid3X3
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/use-permissions';
import logoHelpconfortServices from '@/assets/help-confort-services-logo.png';
import { useState, useMemo, ReactNode } from 'react';

interface NavItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  scope?: string;
  description?: string;
  children?: NavItem[];
}

interface NavGroup {
  label: ReactNode;
  labelKey: string;
  items: NavItem[];
  requiredRole?: 'admin' | 'support' | 'franchiseur';
}

export function UnifiedSidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAdmin, isSupport, isFranchiseur, canViewScope } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['help-academy', 'pilotage']));

  // Check if currently in edit mode
  const isInEditMode = searchParams.get('edit') === 'true' && isAdmin;

  // Helper to preserve edit mode for guide URLs
  const getUrlWithEditMode = (url: string) => {
    const editablePrefix = ['/apogee', '/apporteurs', '/helpconfort'];
    const isEditableUrl = editablePrefix.some(prefix => url.startsWith(prefix));
    if (isInEditMode && isEditableUrl) {
      return `${url}?edit=true`;
    }
    return url;
  };

  const toggleGroup = (label: string) => {
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

  // Navigation groups with permission-based filtering
  const navGroups: NavGroup[] = [
    {
      label: <><span>Help</span><span className="text-helpconfort-orange animate-pulse">!</span><span> Academy</span></>,
      labelKey: 'help-academy',
      items: [
        { title: 'Guide Apogée', url: '/apogee', icon: BookOpen, scope: 'apogee', description: 'Guide complet pour maîtriser le logiciel Apogée' },
        { title: 'Guide Apporteurs', url: '/apporteurs', icon: FileText, scope: 'apporteurs', description: 'Ressources pour les apporteurs d\'affaires' },
        { title: 'Base Documentaire', url: '/helpconfort', icon: FolderOpen, scope: 'helpconfort', description: 'Documents et ressources HelpConfort' },
      ],
    },
    {
      label: 'Pilotage Agence',
      labelKey: 'pilotage',
      items: [
        { 
          title: 'Statistiques', 
          icon: PieChart, 
          scope: 'mes_indicateurs',
          children: [
            { title: 'Indicateurs généraux', url: '/mes-indicateurs', icon: BarChart3, scope: 'mes_indicateurs', description: 'Tableau de bord et KPI de votre agence' },
            { title: 'Indicateurs Apporteurs', url: '/mes-indicateurs/apporteurs', icon: BarChart3, scope: 'mes_indicateurs', description: 'Statistiques apporteurs' },
            { title: 'Indicateurs Univers', url: '/mes-indicateurs/univers', icon: BarChart3, scope: 'mes_indicateurs', description: 'Statistiques par univers' },
            { title: 'Indicateurs Techniciens', url: '/mes-indicateurs/techniciens', icon: BarChart3, scope: 'mes_indicateurs', description: 'Statistiques techniciens' },
            { title: 'Indicateurs SAV', url: '/mes-indicateurs/sav', icon: BarChart3, scope: 'mes_indicateurs', description: 'Statistiques SAV' },
          ]
        },
        { title: 'Actions à Mener', url: '/actions-a-mener', icon: ListTodo, scope: 'actions_a_mener', description: 'Suivi des actions et tâches en cours' },
        { title: 'Diffusion', url: '/diffusion', icon: Tv, scope: 'diffusion', description: 'Mode affichage TV agence' },
      ],
    },
    {
      label: 'Support',
      labelKey: 'support',
      items: [
        { title: 'Mes Demandes', url: '/mes-demandes', icon: MessageSquare, scope: 'mes_demandes', description: 'Créer et suivre vos demandes de support' },
        { title: 'Gestion Tickets', url: '/admin/support', icon: Headset, scope: 'support_tickets', description: 'Traiter les demandes de support' },
      ],
      requiredRole: 'support',
    },
    {
      label: 'Réseau Franchiseur',
      labelKey: 'franchiseur',
      items: [
        { title: 'Dashboard Réseau', url: '/tete-de-reseau', icon: Network, scope: 'franchiseur_dashboard' },
        { title: 'Agences', url: '/tete-de-reseau/agences', icon: Building2, scope: 'franchiseur_agencies' },
        { title: 'Statistiques', url: '/tete-de-reseau/stats', icon: PieChart, scope: 'franchiseur_kpi' },
        { title: 'Comparatifs', url: '/tete-de-reseau/comparatifs', icon: GitCompare, scope: 'franchiseur_kpi' },
        { title: 'Redevances', url: '/tete-de-reseau/redevances', icon: Coins, scope: 'franchiseur_royalties' },
      ],
      requiredRole: 'franchiseur',
    },
    {
      label: 'Administration',
      labelKey: 'admin',
      items: [
        { title: 'Utilisateurs', url: '/admin/users-list', icon: Users, scope: 'admin_users', description: 'Gérer les comptes utilisateurs' },
        { 
          title: 'Permissions', 
          icon: Shield, 
          scope: 'admin_roles',
          children: [
            { title: 'Groupes', url: '/admin/permissions/groups', icon: Users, scope: 'admin_roles', description: 'Gérer les groupes et leurs permissions' },
            { title: 'Utilisateurs', url: '/admin/permissions/users', icon: User, scope: 'admin_roles', description: 'Permissions individuelles' },
            { title: 'Matrice', url: '/admin/permissions/matrix', icon: Grid3X3, scope: 'admin_roles', description: 'Vue matricielle globale' },
          ]
        },
        { title: 'Agences', url: '/admin/agencies', icon: Building2, scope: 'admin_settings' },
        { title: 'Sauvegardes', url: '/admin/backup', icon: Database, scope: 'admin_backup' },
        { title: 'Activité', url: '/admin/user-activity', icon: Activity, scope: 'admin_settings' },
        { title: 'Paramètres', url: '/admin', icon: Settings, scope: 'admin_settings', description: 'Configuration du système' },
      ],
      requiredRole: 'admin',
    },
  ];

  // Filter groups based on roles
  const filteredGroups = navGroups.filter(group => {
    if (group.requiredRole === 'admin' && !isAdmin) return false;
    if (group.requiredRole === 'support' && !isSupport && !isAdmin) return false;
    if (group.requiredRole === 'franchiseur' && !isFranchiseur && !isAdmin) return false;
    return true;
  });

  // Filter items within each group based on scope permissions (including nested children)
  const getFilteredItems = (items: NavItem[]): NavItem[] => {
    return items.map(item => {
      if (item.children) {
        const filteredChildren = item.children.filter(child => {
          if (!child.scope) return true;
          return canViewScope(child.scope);
        });
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      if (!item.scope) return item;
      return canViewScope(item.scope) ? item : null;
    }).filter(Boolean) as NavItem[];
  };

  const isActive = (url?: string) => {
    if (!url) return false;
    if (url === '/') return location.pathname === '/';
    // For /admin and /mes-indicateurs, only match exact path to avoid highlighting parent when on sub-routes
    if (url === '/admin' || url === '/mes-indicateurs') return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  const isChildActive = (item: NavItem): boolean => {
    if (item.url && isActive(item.url)) return true;
    if (item.children) return item.children.some(child => isActive(child.url));
    return false;
  };

  // State for open submenus
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set(['statistiques']));

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
          const hasActiveItem = items.some(item => isChildActive(item));

          return (
            <Collapsible 
              key={group.labelKey} 
              open={isGroupOpen}
              onOpenChange={() => toggleGroup(group.labelKey)}
            >
              <SidebarGroup className="py-0.5">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel 
                    className={`
                      cursor-pointer rounded-md transition-colors flex items-center justify-between px-2 py-1.5 mx-1
                      ${hasActiveItem && !isGroupOpen 
                        ? 'bg-primary/15 text-primary border-l-2 border-primary' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <span className={`text-xs font-semibold tracking-wide uppercase ${hasActiveItem ? 'text-primary' : 'text-muted-foreground'}`}>
                      {!collapsed ? group.label : group.labelKey.charAt(0).toUpperCase()}
                    </span>
                    {!collapsed && (
                      <ChevronRight 
                        className={`w-3.5 h-3.5 transition-transform ${hasActiveItem ? 'text-primary' : 'text-muted-foreground'} ${isGroupOpen ? 'rotate-90' : ''}`}
                      />
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <SidebarGroupContent className="pt-0.5">
                    <SidebarMenu className="space-y-0.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        
                        // Item with children (submenu)
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
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton 
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
                                </CollapsibleTrigger>
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
                        
                        // Regular item (no children)
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
                                {!collapsed && <span className="truncate text-sm">{item.title}</span>}
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
