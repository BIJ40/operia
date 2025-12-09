/**
 * MegaMenu - Panneau de méga-menu pour la navigation principale
 * 
 * Filtre les liens selon:
 * - Rôle global (minRole)
 * - Module activé (moduleKey)
 * - Option de module (requiresOption)
 * - is_salaried_manager pour les N2 qui veulent accéder au coffre RH
 */

import { Link, useLocation } from 'react-router-dom';
import {
  Circle, LayoutDashboard, LayoutGrid, Users, BarChart3, Handshake, PieChart, 
  Wrench, ListTodo, Tv, FolderOpen, FileText, Kanban, Sparkles,
  GitCompare, BookOpen, Network, Building2, Coins, HelpCircle,
  MessageCircle, Database, Activity, LifeBuoy, Headset, Brain, Settings,
  Calendar, CalendarDays, HeartPulse,
  LucideIcon
} from 'lucide-react';
import { MegaMenuSection, MegaMenuLink } from '@/config/megaMenuConfig';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { GLOBAL_ROLES } from '@/types/globalRoles';
import { Badge } from '@/components/ui/badge';

interface MegaMenuProps {
  section: MegaMenuSection;
  onClose: () => void;
}

// Map d'icônes
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, LayoutGrid, Users, BarChart3, Handshake, PieChart, Wrench,
  ListTodo, Tv, FolderOpen, FileText, Kanban, Sparkles, GitCompare,
  BookOpen, Network, Building2, Coins, HelpCircle, MessageCircle,
  Database, Activity, LifeBuoy, Headset, Brain, Settings,
  Calendar, CalendarDays, HeartPulse,
};

// Helper pour obtenir une icône par son nom
const getIcon = (name?: string): LucideIcon => {
  if (!name) return Circle;
  return ICON_MAP[name] || Circle;
};

export function MegaMenu({ section, onClose }: MegaMenuProps) {
  const location = useLocation();
  const { globalRole, canAccessSupportConsoleUI, enabledModules, isSalariedManager } = useAuth();
  const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;

  /**
   * Filtre un lien selon les permissions de l'utilisateur
   */
  const canAccessLink = (link: MegaMenuLink): boolean => {
    // 1. Vérifier requiresSupportConsoleUI
    if (link.requiresSupportConsoleUI && !canAccessSupportConsoleUI) {
      return false;
    }

    // 2. Vérifier minRole
    if (link.minRole) {
      const requiredLevel = GLOBAL_ROLES[link.minRole as keyof typeof GLOBAL_ROLES] || 0;
      if (userLevel < requiredLevel) {
        return false;
      }
    }

    // 3. Vérifier requiresOption (option de module)
    if (link.requiresOption) {
      const { module, option } = link.requiresOption;
      const moduleConfig = enabledModules?.[module];
      
      // Vérifier si le module est activé (gère les deux formats: boolean et objet)
      const isModuleActive = typeof moduleConfig === 'boolean' 
        ? moduleConfig 
        : moduleConfig?.enabled;
      
      if (!isModuleActive) {
        return false;
      }
      
      // Vérifier si l'option est activée
      const optionEnabled = typeof moduleConfig === 'object' 
        ? moduleConfig.options?.[option] === true 
        : true; // Si module = boolean true, toutes options considérées actives
      
      // Exception: si c'est une option "coffre" pour la section salarié,
      // un N2 avec is_salaried_manager peut y accéder
      if (link.section === 'salarie' && option === 'coffre') {
        // N1 avec coffre activé OU N2 salarié
        if (optionEnabled) return true;
        if (userLevel >= GLOBAL_ROLES.franchisee_admin && isSalariedManager) return true;
        return false;
      }
      
      if (!optionEnabled) {
        return false;
      }
    }

    return true;
  };

  // Filtrer les liens selon les permissions
  const filteredLinks = section.links.filter(canAccessLink);

  if (filteredLinks.length === 0) return null;

  const SectionIcon = getIcon(section.icon);

  // Séparer les liens par section pour le menu RH
  const salarieLinks = filteredLinks.filter(l => l.section === 'salarie');
  const dirigeantLinks = filteredLinks.filter(l => l.section === 'dirigeant');
  
  // Séparer les liens par groupe pour le menu Admin
  const ADMIN_GROUPS = {
    users: { label: 'Utilisateurs & Agences', order: 1 },
    content: { label: 'Contenu', order: 2 },
    ai: { label: 'IA & Métriques', order: 3 },
    system: { label: 'Système', order: 4 },
    support: { label: 'Support', order: 5 },
    monitoring: { label: 'Monitoring', order: 6 },
  };
  
  const groupedAdminLinks = filteredLinks.filter(l => l.group);
  const otherLinks = filteredLinks.filter(l => !l.section && !l.group);

  const hasRHSections = salarieLinks.length > 0 && dirigeantLinks.length > 0;
  const hasAdminGroups = groupedAdminLinks.length > 0;
  
  // Organiser les liens admin par groupe
  const adminLinksByGroup = hasAdminGroups ? 
    Object.entries(ADMIN_GROUPS)
      .map(([key, config]) => ({
        key,
        label: config.label,
        order: config.order,
        links: groupedAdminLinks.filter(l => l.group === key)
      }))
      .filter(g => g.links.length > 0)
      .sort((a, b) => a.order - b.order)
    : [];

  return (
    <div 
      className="absolute top-full left-0 z-[100]"
      style={{ paddingTop: 0 }}
    >
      {/* Invisible bridge to prevent gap between trigger and menu */}
      <div className="h-2 w-full" />
      <div 
        className={cn(
          "bg-popover border rounded-lg shadow-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200",
          hasAdminGroups ? "w-[340px]" : "w-80"
        )}
      >
        {/* En-tête du méga-menu - cliquable si href défini */}
        {section.href ? (
          <Link 
            to={section.href} 
            onClick={onClose}
            className="flex items-center gap-3 pb-3 mb-3 border-b hover:bg-muted/50 -mx-4 -mt-4 p-4 rounded-t-lg transition-colors"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <SectionIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              {section.description && (
                <p className="text-xs text-muted-foreground">{section.description}</p>
              )}
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 pb-3 mb-3 border-b">
            <div className="p-2 rounded-lg bg-primary/10">
              <SectionIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              {section.description && (
                <p className="text-xs text-muted-foreground">{section.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Conteneur scrollable avec max-height */}
        <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
          {/* Liens regroupés par section (pour RH) */}
          {hasRHSections ? (
            <div className="space-y-4">
              {salarieLinks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Mon espace
                  </p>
                  <div className="space-y-1">
                    {salarieLinks.map(renderLink)}
                  </div>
                </div>
              )}
              {dirigeantLinks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Gestion RH
                  </p>
                  <div className="space-y-1">
                    {dirigeantLinks.map(renderLink)}
                  </div>
                </div>
              )}
            </div>
          ) : hasAdminGroups ? (
            /* Liens regroupés par groupe (pour Admin) */
            <div className="space-y-3">
              {adminLinksByGroup.map(({ key, label, links }) => (
                <div key={key}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-2">
                    {label}
                  </p>
                  <div className="space-y-0.5">
                    {links.map(renderLink)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Liste simple (autres menus) */
            <div className="space-y-1">
              {[...salarieLinks, ...dirigeantLinks, ...otherLinks].map(renderLink)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function renderLink(link: MegaMenuLink) {
    const Icon = getIcon(link.icon);
    const isActive = location.pathname === link.href || 
                    location.pathname.startsWith(link.href + '/');
    const isDisabled = link.isDisabled;

    if (isDisabled) {
      return (
        <div
          key={link.href}
          className="flex items-start gap-3 p-2 rounded-md opacity-50 cursor-not-allowed"
        >
          <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {link.label}
              </span>
              {link.badge && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {link.badge}
                </Badge>
              )}
            </div>
            {link.description && (
              <p className="text-xs text-muted-foreground truncate">
                {link.description}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <Link
        key={link.href}
        to={link.href}
        onClick={onClose}
        className={cn(
          "flex items-start gap-3 p-2 rounded-md transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-foreground"
        )}
      >
        <Icon className={cn(
          "w-4 h-4 mt-0.5",
          isActive ? "text-primary" : "text-muted-foreground"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {link.label}
            </span>
            {link.badge && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {link.badge}
              </Badge>
            )}
          </div>
          {link.description && (
            <p className="text-xs text-muted-foreground truncate">
              {link.description}
            </p>
          )}
        </div>
      </Link>
    );
  }
}
