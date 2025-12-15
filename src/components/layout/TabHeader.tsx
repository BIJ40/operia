/**
 * TabHeader - Header à 3 lignes avec morphing Framer Motion
 * 
 * Ligne 1: Logo + Search (Ctrl+K) + Actions user
 * Ligne 2: Onglets principaux avec indicateur morphing
 * Ligne 3: Sous-onglets contextuels avec animation slide
 */

import { useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, User, Settings, Headset, Loader2, Home,
  Building2, Briefcase, Kanban, GraduationCap, Network,
  LucideIcon, Circle
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
import operiaLogo from '@/assets/operia-logo.png';
import { RHNotificationBadge } from '@/components/rh/RHNotificationBadge';
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

// Déterminer l'onglet actif selon la route
const getActiveTabId = (pathname: string): string | null => {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/hc-agency')) return 'mon-agence';
  if (pathname.startsWith('/rh')) return 'rh';
  if (pathname.startsWith('/academy') || pathname.startsWith('/guides')) return 'academy';
  if (pathname.startsWith('/projects')) return 'tickets';
  if (pathname.startsWith('/hc-reseau') || pathname.startsWith('/franchiseur')) return 'franchiseur';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/support')) return 'support';
  return null;
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

  // Onglet actif basé sur la route
  const activeTabId = getActiveTabId(location.pathname);
  const activeTab = topTabs.find(t => t.id === activeTabId);

  // Filtre un lien selon les permissions
  const canAccessLink = (link: MegaMenuLink): boolean => {
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
      const isModuleActive = typeof moduleConfig === 'boolean' 
        ? moduleConfig 
        : moduleConfig?.enabled;
      
      if (!isModuleActive) return false;
      
      const optionEnabled = typeof moduleConfig === 'object' 
        ? moduleConfig.options?.[option] === true 
        : true;
      
      if (link.section === 'salarie' && option === 'coffre') {
        if (optionEnabled) return true;
        if (userLevel >= GLOBAL_ROLES.franchisee_admin && isSalariedManager) return true;
        return false;
      }
      
      if (!optionEnabled) return false;
    }
    return true;
  };

  // Sous-onglets de l'onglet actif
  const subTabs = useMemo(() => {
    if (!activeTab?.section?.links) return [];
    return activeTab.section.links.filter(canAccessLink);
  }, [activeTab, userLevel, canAccessSupportConsoleUI, enabledModules, isSalariedManager]);

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
        <div className="mx-auto max-w-[1600px] px-4">
          {/* Ligne 1 : Logo + Search + Actions */}
          <div className="flex items-center h-14 gap-4">
            {/* Logo - plus grand */}
            <Link to="/" className="flex items-center shrink-0">
              <img 
                src={operiaLogo} 
                alt="OPERIA" 
                className="h-14 w-auto"
              />
            </Link>

            {/* Search pill centré */}
            <div className="flex-1 flex justify-center">
              <UnifiedSearchFloatingBar />
            </div>

            {/* Actions droite */}
            <div className="flex items-center gap-1 shrink-0">
              <RHNotificationBadge />

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
                  <DropdownMenuItem asChild>
                    <Link to="/widgets" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      Gérer mes widgets
                    </Link>
                  </DropdownMenuItem>
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
              const isActive = tab.id === activeTabId;
              const IconComponent = tab.icon;

              return (
                <NavLink
                  key={tab.id}
                  to={tab.href}
                  className="relative shrink-0"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      isActive ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
          <AnimatePresence mode="wait">
            {subTabs.length > 0 && (
              <motion.div
                key={activeTabId}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-center justify-center gap-2 pb-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {subTabs.map((link, index) => {
                  const isLinkActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
                  
                  if (link.isDisabled) {
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 0.4, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="shrink-0 px-4 py-1.5 text-xs font-medium text-muted-foreground/40 cursor-not-allowed rounded-full border border-muted/30"
                      >
                        {link.label}
                      </motion.div>
                    );
                  }

                  return (
                    <NavLink
                      key={link.href}
                      to={link.href}
                      className="shrink-0"
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03, type: 'spring', stiffness: 500, damping: 30 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "px-4 py-1.5 text-xs font-medium rounded-full border transition-colors",
                          isLinkActive
                            ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                            : "text-muted-foreground border-border/50 hover:text-foreground hover:bg-muted/50 hover:border-border"
                        )}
                      >
                        {link.label}
                        {link.badge && (
                          <span className="ml-1.5 text-[10px] opacity-60">
                            {link.badge}
                          </span>
                        )}
                      </motion.div>
                    </NavLink>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </>
  );
}
