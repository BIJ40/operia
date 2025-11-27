import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  Headset, MessageSquare, Network, Building2, PieChart, GitCompare,
  Coins, Settings, Users, Shield, Database, Activity, ChevronRight, Home
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
import logoHelpconfort from '@/assets/logo_helpogee.png';
import { useState } from 'react';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  scope?: string;
  description?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  requiredRole?: 'admin' | 'support' | 'franchiseur';
}

export function UnifiedSidebar() {
  const location = useLocation();
  const { isAdmin, isSupport, isFranchiseur, canViewScope } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['help-academy', 'pilotage']));

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
      label: 'HELP Academy',
      items: [
        { title: 'Guide Apogée', url: '/apogee', icon: BookOpen, scope: 'apogee', description: 'Guide complet pour maîtriser le logiciel Apogée' },
        { title: 'Guide Apporteurs', url: '/apporteurs', icon: FileText, scope: 'apporteurs', description: 'Ressources pour les apporteurs d\'affaires' },
        { title: 'Base Documentaire', url: '/helpconfort', icon: FolderOpen, scope: 'helpconfort', description: 'Documents et ressources HelpConfort' },
      ],
    },
    {
      label: 'Pilotage Agence',
      items: [
        { title: 'Mes Indicateurs', url: '/mes-indicateurs', icon: BarChart3, scope: 'mes_indicateurs', description: 'Tableau de bord et KPI de votre agence' },
        { title: 'Actions à Mener', url: '/actions-a-mener', icon: ListTodo, scope: 'actions_a_mener', description: 'Suivi des actions et tâches en cours' },
        { title: 'Diffusion', url: '/diffusion', icon: Tv, scope: 'diffusion', description: 'Mode affichage TV agence' },
      ],
    },
    {
      label: 'Support',
      items: [
        { title: 'Mes Demandes', url: '/mes-demandes', icon: MessageSquare, scope: 'mes_demandes', description: 'Créer et suivre vos demandes de support' },
        { title: 'Gestion Tickets', url: '/admin/support', icon: Headset, scope: 'support_tickets', description: 'Traiter les demandes de support' },
      ],
      requiredRole: 'support',
    },
    {
      label: 'Réseau Franchiseur',
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
      items: [
        { title: 'Utilisateurs', url: '/admin/users', icon: Users, scope: 'admin_users', description: 'Gérer les comptes utilisateurs' },
        { title: 'Rôles & Permissions', url: '/admin/role-permissions', icon: Shield, scope: 'admin_roles', description: 'Configurer les droits d\'accès' },
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

  // Filter items within each group based on scope permissions
  const getFilteredItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.scope) return true;
      return canViewScope(item.scope);
    });
  };

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r bg-sidebar" collapsible="icon">
      <SidebarHeader className="p-3 border-b">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img 
            src={logoHelpconfort} 
            alt="HelpConfort Services" 
            className={`object-contain transition-all ${collapsed ? 'h-8 w-8' : 'h-12'}`}
          />
          {!collapsed && (
            <span className="font-bold text-lg text-primary">HC Services</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {/* Home link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={isActive('/') && location.pathname === '/' ? 'bg-primary/10 text-primary' : ''}>
                  <Link to="/" className="flex items-center gap-3">
                    <Home className="w-5 h-5" />
                    {!collapsed && <span>Accueil</span>}
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

          const isGroupOpen = openGroups.has(group.label);
          const hasActiveItem = items.some(item => isActive(item.url));

          return (
            <Collapsible 
              key={group.label} 
              open={isGroupOpen || hasActiveItem}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {!collapsed ? group.label : group.label.charAt(0)}
                    </span>
                    {!collapsed && (
                      <ChevronRight 
                        className={`w-4 h-4 text-muted-foreground transition-transform ${isGroupOpen ? 'rotate-90' : ''}`}
                      />
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.url);
                        
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton 
                              asChild 
                              className={`
                                transition-all duration-200 
                                ${active 
                                  ? 'bg-primary text-primary-foreground shadow-md' 
                                  : 'hover:bg-muted hover:translate-x-1'
                                }
                              `}
                              title={item.description}
                            >
                              <Link to={item.url} className="flex items-center gap-3">
                                <Icon className="w-5 h-5 shrink-0" />
                                {!collapsed && <span className="truncate">{item.title}</span>}
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
