/**
 * MegaMenu - Panneau de méga-menu pour la navigation principale
 */

import { Link, useLocation } from 'react-router-dom';
import {
  Circle, LayoutDashboard, Users, BarChart3, Handshake, PieChart, 
  Wrench, ListTodo, Tv, FolderOpen, FileText, Kanban, Sparkles,
  GitCompare, BookOpen, Network, Building2, Coins, HelpCircle,
  MessageCircle, Database, Activity, LifeBuoy, Headset, Brain, Settings,
  LucideIcon
} from 'lucide-react';
import { MegaMenuSection } from '@/config/megaMenuConfig';
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
  LayoutDashboard, Users, BarChart3, Handshake, PieChart, Wrench,
  ListTodo, Tv, FolderOpen, FileText, Kanban, Sparkles, GitCompare,
  BookOpen, Network, Building2, Coins, HelpCircle, MessageCircle,
  Database, Activity, LifeBuoy, Headset, Brain, Settings,
};

// Helper pour obtenir une icône par son nom
const getIcon = (name?: string): LucideIcon => {
  if (!name) return Circle;
  return ICON_MAP[name] || Circle;
};

export function MegaMenu({ section, onClose }: MegaMenuProps) {
  const location = useLocation();
  const { globalRole, canAccessSupportConsoleUI } = useAuth();
  const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;

  // Filtrer les liens selon les permissions
  const filteredLinks = section.links.filter(link => {
    if (link.requiresSupportConsoleUI && !canAccessSupportConsoleUI) {
      return false;
    }
    if (link.minRole) {
      const requiredLevel = GLOBAL_ROLES[link.minRole as keyof typeof GLOBAL_ROLES] || 0;
      if (userLevel < requiredLevel) {
        return false;
      }
    }
    return true;
  });

  if (filteredLinks.length === 0) return null;

  const SectionIcon = getIcon(section.icon);

  return (
    <div className="absolute top-full left-0 pt-1 z-50">
      <div 
        className="w-80 bg-popover border rounded-lg shadow-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200"
      >
      {/* En-tête du méga-menu */}
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

      {/* Liste des liens */}
      <div className="space-y-1">
        {filteredLinks.map((link) => {
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
        })}
      </div>
      </div>
    </div>
  );
}
