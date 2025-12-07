/**
 * MobileNav - Navigation mobile en panneau vertical
 * 
 * Filtre les liens selon:
 * - Rôle global (minRole)
 * - Module activé (moduleKey)
 * - Option de module (requiresOption)
 * - is_salaried_manager pour les N2 qui veulent accéder au coffre RH
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown, Home, Circle,
  LayoutDashboard, Users, BarChart3, Handshake, PieChart, 
  Wrench, ListTodo, Tv, FolderOpen, FileText, Kanban, Sparkles,
  GitCompare, BookOpen, Network, Building2, Coins, HelpCircle,
  MessageCircle, Database, Activity, LifeBuoy, Headset, Brain, Settings,
  Briefcase, GraduationCap, Calendar, CalendarDays, HeartPulse,
  LucideIcon
} from 'lucide-react';
import { MegaMenuSection, MegaMenuLink } from '@/config/megaMenuConfig';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { GLOBAL_ROLES } from '@/types/globalRoles';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MobileNavProps {
  sections: MegaMenuSection[];
  supportSection?: MegaMenuSection;
  onClose: () => void;
}

// Map d'icônes
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, BarChart3, Handshake, PieChart, Wrench,
  ListTodo, Tv, FolderOpen, FileText, Kanban, Sparkles, GitCompare,
  BookOpen, Network, Building2, Coins, HelpCircle, MessageCircle,
  Database, Activity, LifeBuoy, Headset, Brain, Settings, Briefcase,
  GraduationCap, Calendar, CalendarDays, HeartPulse,
};

// Helper pour obtenir une icône par son nom
const getIcon = (name?: string): LucideIcon => {
  if (!name) return Circle;
  return ICON_MAP[name] || Circle;
};

export function MobileNav({ sections, supportSection, onClose }: MobileNavProps) {
  const location = useLocation();
  const { globalRole, canAccessSupportConsoleUI, enabledModules, isSalariedManager } = useAuth();
  const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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

  const allSections = supportSection ? [...sections, supportSection] : sections;

  return (
    <div className="lg:hidden border-t bg-background">
      <ScrollArea className="h-[calc(100vh-7rem)]">
        <div className="p-4 space-y-2">
          {/* Accueil */}
          <Link
            to="/"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              location.pathname === '/'
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Accueil</span>
          </Link>

          {/* Sections */}
          {allSections.map((section) => {
            const SectionIcon = getIcon(section.icon);
            const isOpen = openSections.has(section.id);
            
            // Filtrer les liens
            const filteredLinks = section.links.filter(canAccessLink);

            if (filteredLinks.length === 0) return null;

            return (
              <Collapsible
                key={section.id}
                open={isOpen}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <SectionIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{section.title}</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>

                <CollapsibleContent className="pl-11 pr-3 pb-2 space-y-1">
                  {filteredLinks.map((link) => {
                    const Icon = getIcon(link.icon);
                    const isActive = location.pathname === link.href;
                    const isDisabled = link.isDisabled;

                    if (isDisabled) {
                      return (
                        <div
                          key={link.href}
                          className="flex items-center gap-2 p-2 rounded-md opacity-50"
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{link.label}</span>
                          {link.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
                              {link.badge}
                            </Badge>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{link.label}</span>
                        {link.badge && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
                            {link.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
