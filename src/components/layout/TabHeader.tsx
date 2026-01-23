/**
 * TabHeader - Header à 3 lignes avec morphing Framer Motion
 * 
 * Ligne 1: Logo + Search (Ctrl+K) + Actions user
 * Ligne 2: Onglets principaux avec indicateur morphing
 * Ligne 3: Sous-onglets contextuels avec animation slide
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, User, Settings, Headset, Loader2, Home,
  Building2, Briefcase, Kanban, GraduationCap, Network,
  LucideIcon, Circle, PenTool
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupportNotifications } from '@/hooks/use-support-notifications';
import { ROUTES } from '@/config/routes';
import { APP_VERSION } from '@/config/version';
import { cn } from '@/lib/utils';
import { MEGA_MENU_CONFIG, SUPPORT_MENU, MegaMenuLink, MegaMenuSection } from '@/config/megaMenuConfig';
import { getRoleCapabilities } from '@/config/roleMatrix';
// Logo temporairement retiré
import { ModuleKey } from '@/types/modules';
import { UnifiedSearchFloatingBar } from '@/components/unified-search';
import { GLOBAL_ROLES } from '@/types/globalRoles';

// Couleur active - bleu plus moderne et élégant
const ACTIVE_COLOR = 'hsl(217, 91%, 60%)'; // Un bleu plus vif et moderne

// Map d'icônes pour les sections
const SECTION_ICONS: Record<string, LucideIcon> = {
  'Building2': Building2,
  'Briefcase': Briefcase,
  'Kanban': Kanban,
  'GraduationCap': GraduationCap,
  'Network': Network,
  'Settings': Settings,
  'Headset': Headset,
};

const getIcon = (name: string): LucideIcon => {
  return SECTION_ICONS[name] || Circle;
};

const stripSearch = (href: string) => href.split('?')[0] || href;

/**
 * Détermine l'onglet actif en se basant sur les href réellement rendus.
 * => évite les incohérences “sous-statut de la page précédente” lors des navigations.
 */
const resolveActiveTopTab = <T extends { href: string; id: string }>(
  tabs: T[],
  pathname: string
): T | null => {
  const candidates = tabs.filter((t) => {
    const base = stripSearch(t.href);
    if (base === '/') return pathname === '/';
    return pathname === base || pathname.startsWith(base + '/');
  });

  if (candidates.length === 0) return null;
  // “Longest prefix wins”
  return candidates.reduce((best, cur) => {
    const bestLen = stripSearch(best.href).length;
    const curLen = stripSearch(cur.href).length;
    return curLen > bestLen ? cur : best;
  }, candidates[0]);
};

export function TabHeader() {
  const location = useLocation();
  const { 
    isAdmin, 
    canAccessSupportConsoleUI, 
    isLoggingOut, 
    logout, 
    globalRole, 
    enabledModules,
    hasModule,
    user,
    isSalariedManager,
  } = useAuth();
  const { hasNewTickets, newTicketsCount } = useSupportNotifications();
  
  const caps = getRoleCapabilities(globalRole);
  const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;

  const canAccessLink = useCallback(
    (link: MegaMenuLink): boolean => {
      if (link.requiresSupportConsoleUI && !canAccessSupportConsoleUI) {
        return false;
      }
      if (link.minRole) {
        const requiredLevel = GLOBAL_ROLES[link.minRole as keyof typeof GLOBAL_ROLES] || 0;
        if (userLevel < requiredLevel) {
          return false;
        }
      }
      if (link.requiresOption) {
        const { module, option } = link.requiresOption;
        const moduleConfig = enabledModules?.[module];
        const isModuleActive =
          typeof moduleConfig === 'boolean' ? moduleConfig : moduleConfig?.enabled;

        if (!isModuleActive) return false;

        const optionEnabled = typeof moduleConfig === 'object' ? moduleConfig.options?.[option] === true : true;

        if (link.section === 'salarie' && option === 'coffre') {
          if (optionEnabled) return true;
          if (userLevel >= GLOBAL_ROLES.franchisee_admin && isSalariedManager) return true;
          return false;
        }

        if (!optionEnabled) return false;
      }
      return true;
    },
    [
      canAccessSupportConsoleUI,
      enabledModules,
      isSalariedManager,
      userLevel,
    ]
  );

  // Filtrer les sections de menu selon les permissions
  const filteredMenus = useMemo(() => {
    return MEGA_MENU_CONFIG.filter(section => {
      if (section.moduleKey && !hasModule(section.moduleKey as ModuleKey)) {
        return false;
      }
      if (section.accessKey && !caps[section.accessKey]) {
        return false;
      }
      return true;
    });
  }, [hasModule, caps]);

  const showSupport = caps.canAccessSupport;

  /**
   * React Router peut différer l'update de location pendant le chargement (navigation en transition).
   * Pour éviter de garder les sous-statuts de l'ancienne section pendant ce temps,
   * on applique un “optimistic tab id” dès le clic sur un onglet principal.
   */
  const [optimisticTopTabId, setOptimisticTopTabId] = useState<string | null>(null);

  // Dès que la navigation est effectivement commit (location change), on reset l'optimistic.
  useEffect(() => {
    setOptimisticTopTabId(null);
  }, [location.key]);

  // Construire la liste des onglets principaux
  const topTabs = useMemo(() => {
    const tabs: { id: string; label: string; href: string; icon: LucideIcon; section?: MegaMenuSection }[] = [
      { id: 'home', label: 'Accueil', href: '/', icon: Home },
    ];

    filteredMenus.forEach(section => {
      tabs.push({
        id: section.id,
        label: section.title,
        href: section.href || section.links[0]?.href || '/',
        icon: getIcon(section.icon),
        section,
      });
    });

    if (showSupport) {
      tabs.push({
        id: 'support',
        label: 'Support',
        href: ROUTES.support.index,
        icon: Headset,
        section: SUPPORT_MENU,
      });
    }

    return tabs;
  }, [filteredMenus, showSupport]);

  // Onglet actif basé sur la route (résolution via href réellement rendus)
  const activeTopTab = useMemo(() => {
    return resolveActiveTopTab(topTabs, location.pathname);
  }, [topTabs, location.pathname]);

  const activeTabId = activeTopTab?.id ?? null;

  const effectiveTopTab = useMemo(() => {
    if (!optimisticTopTabId) return activeTopTab;
    return topTabs.find((t) => t.id === optimisticTopTabId) ?? activeTopTab;
  }, [activeTopTab, optimisticTopTabId, topTabs]);

  const effectiveTabId = effectiveTopTab?.id ?? activeTabId;

  // Sous-onglets de l'onglet actif
  const subTabs = useMemo(() => {
    const links = effectiveTopTab?.section?.links;
    if (!links) return [];
    return links.filter(canAccessLink);
  }, [effectiveTopTab, canAccessLink]);

  // Animation fluide pour le morphing - la navigation est instantanée, l'animation suit
  const morphTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
  };

  // Animation slide rapide pour les sous-onglets
  const slideVariants = {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
  };

  return (
    <>
      {/* Skip link pour accessibilité */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Aller au contenu principal
      </a>

      {/* Overlay de déconnexion */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
          <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">Déconnexion en cours...</h3>
              <p className="text-sm text-muted-foreground">À bientôt !</p>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative mx-auto max-w-[1600px] px-4">

          {/* Ligne 1 : Search + Actions */}
          <div className="relative flex items-center justify-center h-14 gap-4">
            {/* Search pill centré */}
            <div className="flex justify-center">
              <UnifiedSearchFloatingBar />
            </div>

            {/* Actions droite - position absolue dans ligne 1 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">

              {canAccessSupportConsoleUI && (
                <Link to={ROUTES.support.console}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("relative h-8 w-8", hasNewTickets && "text-destructive")}
                  >
                    <Headset className="w-4 h-4" />
                    {hasNewTickets && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bounce">
                        {newTicketsCount}
                      </span>
                    )}
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  {hasModule('rh') && (
                    <DropdownMenuItem asChild>
                      <Link to="/rh/signature" className="flex items-center gap-2 cursor-pointer">
                        <PenTool className="w-4 h-4" />
                        Ma signature
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="w-4 h-4" />
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <Link to="/changelog" className="block px-2 py-1.5 text-center">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                      v{APP_VERSION}
                    </span>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Ligne 2 : Onglets principaux avec morphing */}
          <nav className="flex items-center justify-center gap-1 py-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {topTabs.map((tab) => {
              const isActive = tab.id === effectiveTabId;
              const IconComponent = tab.icon;

              return (
                <NavLink
                  key={tab.id}
                  to={tab.href}
                  className="relative shrink-0"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  onPointerDown={() => {
                    // Optimistic uniquement si on change réellement d'onglet principal
                    if (tab.id !== activeTabId) {
                      setOptimisticTopTabId(tab.id);
                    }
                  }}
                >
                  <div
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                      isActive 
                        ? "text-white" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-md hover:scale-105"
                    )}
                  >
                    {/* Indicateur morphing rapide */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 -z-10 rounded-full"
                        style={{ backgroundColor: ACTIVE_COLOR }}
                        transition={morphTransition}
                      />
                    )}
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {/* Badge Support */}
                    {tab.id === 'support' && hasNewTickets && (
                      <span className="ml-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {newTicketsCount}
                      </span>
                    )}
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* Ligne 3 : Sous-onglets contextuels avec pills arrondis */}
          {/* Clé basée sur l'onglet actif pour éviter la persistance de sous-menus entre sections */}
          <AnimatePresence mode="wait">
            {effectiveTabId && subTabs.length > 0 ? (
              <motion.div
                key={`subtabs-${effectiveTabId}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center gap-2 pb-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {subTabs.map((link) => {
                  // Comparer directement avec le pathname courant
                  const isExactMatch = location.pathname === link.href;
                  const isNestedMatch = location.pathname.startsWith(link.href + '/');
                  
                  // Trouver le lien le plus spécifique qui match
                  const matchingLinks = subTabs.filter(l => 
                    location.pathname === l.href || location.pathname.startsWith(l.href + '/')
                  );
                  const mostSpecificMatch = matchingLinks.length > 0 
                    ? matchingLinks.reduce((best, current) => 
                        current.href.length > best.href.length ? current : best
                      , matchingLinks[0])
                    : null;
                  const isLinkActive = mostSpecificMatch?.href === link.href;
                  
                  if (link.isDisabled) {
                    return (
                      <div
                        key={link.href}
                        className="shrink-0 px-4 py-1.5 text-xs font-medium text-muted-foreground/40 cursor-not-allowed rounded-full border border-muted/30"
                      >
                        {link.label}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={link.href}
                      to={link.href}
                      className="shrink-0"
                    >
                      <div
                        className={cn(
                          "px-4 py-1.5 text-xs font-medium rounded-full border transition-all duration-200",
                          isLinkActive
                            ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                            : "text-muted-foreground border-border/50 hover:text-foreground hover:bg-muted hover:border-primary/40 hover:shadow-md hover:scale-105 active:scale-95"
                        )}
                      >
                        {link.label}
                        {link.badge && (
                          <span className="ml-1.5 text-[10px] opacity-60">
                            {link.badge}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </header>
    </>
  );
}
