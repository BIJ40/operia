/**
 * SmartSidebar - Sidebar intelligente expérimentale
 * 
 * Remplace UnifiedSidebar + IconNavBar quand USE_EXPERIMENTAL_NAV = true.
 * Affiche les items de navigation en fonction de la section active (pathname).
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, ChevronLeft, ChevronRight,
  GraduationCap, FileText, FolderOpen,
  Building2, Users, PieChart, ListTodo, Tv, Calendar, Briefcase,
  Network, Coins, GitCompare,
  Headset, HelpCircle,
  FolderKanban, Kanban, Sparkles,
  Settings, Database, Activity, MessageCircle, Brain,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleCapabilities } from '@/config/roleMatrix';
import { ROUTES } from '@/config/routes';
import { EXPERIMENTAL_HUB_ROUTE } from '@/config/experimentalNav';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  minRole?: GlobalRole;
  requiresSupportConsole?: boolean;
}

interface SectionConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  pathPrefix: string[];
}

// Configuration des sections avec leurs items
const SECTIONS: SectionConfig[] = [
  {
    id: 'academy',
    label: 'Help! Academy',
    icon: GraduationCap,
    pathPrefix: ['/academy'],
    items: [
      { title: 'Guide Apogée', url: ROUTES.academy.apogee, icon: GraduationCap },
      { title: 'Guide Apporteurs', url: ROUTES.academy.apporteurs, icon: FileText },
      { title: 'Base Documentaire', url: ROUTES.academy.documents, icon: FolderOpen },
    ],
  },
  {
    id: 'agence',
    label: 'Mon Agence',
    icon: Building2,
    pathPrefix: ['/hc-agency', '/pilotage'],
    items: [
      { title: 'Mon équipe', url: ROUTES.pilotage.equipe, icon: Users },
      { title: 'Mes Indicateurs', url: ROUTES.pilotage.statsHub, icon: PieChart },
      { title: 'Actions à Mener', url: ROUTES.pilotage.actions, icon: ListTodo },
      { title: 'Commercial', url: ROUTES.pilotage.commercial, icon: Briefcase },
      { title: 'Diffusion', url: ROUTES.pilotage.diffusion, icon: Tv },
      { title: 'Validation plannings', url: ROUTES.pilotage.rhTech, icon: Calendar },
    ],
  },
  {
    id: 'reseau',
    label: 'Réseau Franchiseur',
    icon: Network,
    pathPrefix: ['/hc-reseau'],
    items: [
      { title: 'Dashboard', url: ROUTES.reseau.dashboard, icon: Network },
      { title: 'Agences', url: ROUTES.reseau.agences, icon: Building2 },
      { title: 'Animateurs', url: ROUTES.reseau.animateurs, icon: Users, minRole: 'franchisor_admin' },
      { title: 'Tableaux', url: ROUTES.reseau.tableaux, icon: PieChart },
      { title: 'Périodes', url: ROUTES.reseau.periodes, icon: GitCompare },
      { title: 'Redevances', url: ROUTES.reseau.redevances, icon: Coins, minRole: 'franchisor_admin' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: Headset,
    pathPrefix: ['/support'],
    items: [
      { title: 'Support', url: ROUTES.support.index, icon: HelpCircle },
      { title: 'Console Support', url: ROUTES.support.console, icon: Headset, requiresSupportConsole: true },
    ],
  },
  {
    id: 'projects',
    label: 'Gestion de Projet',
    icon: FolderKanban,
    pathPrefix: ['/projects'],
    items: [
      { title: 'Kanban', url: ROUTES.projects.kanban, icon: Kanban },
      { title: 'Liste', url: ROUTES.projects.list, icon: ListTodo },
      { title: 'Doublons', url: ROUTES.projects.duplicates, icon: GitCompare },
      { title: 'Auto-Classeur', url: ROUTES.projects.autoClassify, icon: Sparkles },
      { title: 'Incomplets', url: ROUTES.projects.incomplete, icon: FileText },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Settings,
    pathPrefix: ['/admin'],
    items: [
      { title: 'Utilisateurs', url: ROUTES.admin.users, icon: Users },
      { title: 'Agences', url: ROUTES.admin.agencies, icon: Building2 },
      { title: 'Annonces', url: ROUTES.admin.announcements, icon: MessageCircle },
      { title: 'FAQ', url: ROUTES.admin.faq, icon: HelpCircle },
      { title: 'Helpi', url: ROUTES.admin.helpi, icon: Brain },
      { title: 'Sauvegardes', url: ROUTES.admin.backup, icon: Database },
      { title: 'Activité', url: ROUTES.admin.userActivity, icon: Activity },
    ],
  },
];

export function SmartSidebar() {
  const location = useLocation();
  const { globalRole, canAccessSupportConsoleUI } = useAuth();
  const caps = getRoleCapabilities(globalRole);
  const [collapsed, setCollapsed] = useState(false);

  // Détecter la section active
  const getActiveSection = (): SectionConfig | null => {
    for (const section of SECTIONS) {
      if (section.pathPrefix.some(prefix => location.pathname.startsWith(prefix))) {
        return section;
      }
    }
    return null;
  };

  const activeSection = getActiveSection();
  const isOnHub = location.pathname === EXPERIMENTAL_HUB_ROUTE || location.pathname === '/';

  // Filtrer les items selon les permissions
  const getFilteredItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      if (item.requiresSupportConsole && !canAccessSupportConsoleUI) return false;
      if (!item.minRole) return true;
      const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
      const requiredLevel = GLOBAL_ROLES[item.minRole];
      return userLevel >= requiredLevel;
    });
  };

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  // Mode hub : afficher juste les icônes des sections
  if (isOnHub) {
    return (
      <aside className={cn(
        "h-full bg-sidebar border-r flex flex-col transition-all duration-200",
        "w-16"
      )}>
        <div className="p-3 border-b flex justify-center">
          <Link to={EXPERIMENTAL_HUB_ROUTE}>
            <Home className="w-6 h-6 text-primary" />
          </Link>
        </div>
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col items-center gap-2 px-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <Tooltip key={section.id}>
                  <TooltipTrigger asChild>
                    <Link
                      to={section.items[0]?.url || '/'}
                      className={cn(
                        "p-2 rounded-lg transition-colors hover:bg-muted",
                        "flex items-center justify-center"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {section.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
    );
  }

  // Mode section active : afficher les items de la section
  const filteredItems = activeSection ? getFilteredItems(activeSection.items) : [];

  return (
    <aside className={cn(
      "h-full bg-sidebar border-r flex flex-col transition-all duration-200",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Header avec toggle */}
      <div className="p-3 border-b flex items-center justify-between">
        <Link to={EXPERIMENTAL_HUB_ROUTE} className="flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          {!collapsed && <span className="font-semibold text-sm">Hub</span>}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Section label */}
      {activeSection && !collapsed && (
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <activeSection.icon className="w-4 h-4" />
            <span>{activeSection.label}</span>
          </div>
        </div>
      )}

      {/* Navigation items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);

            if (collapsed) {
              return (
                <Tooltip key={item.url}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.url}
                      className={cn(
                        "p-2 rounded-lg transition-colors flex items-center justify-center",
                        active 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "px-3 py-2 rounded-lg transition-colors flex items-center gap-3 text-sm",
                  active 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.title}</span>
              </Link>
            );
          })}

          {/* Fallback si pas de section active */}
          {!activeSection && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Sélectionnez une section depuis le Hub
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* Footer avec accès rapide Dashboard */}
      <div className="p-2 border-t">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm",
            "hover:bg-muted text-muted-foreground hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          {!collapsed && <span>Dashboard</span>}
        </Link>
      </div>
    </aside>
  );
}
