/**
 * MainHeader - Header horizontal principal avec méga-menus
 * Remplace le sidebar pour une navigation centralisée
 */

import { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LogOut, User, Settings, Headset, Loader2,
  Menu, X, ChevronDown, Home, Circle,
  Building2, Briefcase, Kanban, Brain, GraduationCap, Network,
  LucideIcon
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
import { MegaMenu } from './MegaMenu';
import { MobileNav } from './MobileNav';
import { MEGA_MENU_CONFIG, SUPPORT_MENU } from '@/config/megaMenuConfig';
import { getRoleCapabilities } from '@/config/roleMatrix';
import logoHelpconfortServices from '@/assets/help-confort-services-logo.png';
import { RHNotificationBadge } from '@/components/rh/RHNotificationBadge';
import { isModuleEnabled, ModuleKey } from '@/types/modules';
import { UnifiedSearchFloatingBar } from '@/components/unified-search';


// Map d'icônes pour les sections
const SECTION_ICONS: Record<string, LucideIcon> = {
  'Building2': Building2,
  'Briefcase': Briefcase,
  'Kanban': Kanban,
  'Brain': Brain,
  'GraduationCap': GraduationCap,
  'Network': Network,
  'Settings': Settings,
  'Headset': Headset,
};

// Helper pour obtenir une icône par son nom
const getIcon = (name: string): LucideIcon => {
  return SECTION_ICONS[name] || Circle;
};

export function MainHeader() {
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
  } = useAuth();
  const { hasNewTickets, newTicketsCount } = useSupportNotifications();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const caps = getRoleCapabilities(globalRole);

  // Filtrer les sections de menu selon les permissions
  const filteredMenus = MEGA_MENU_CONFIG.filter(section => {
    // Vérifier le module requis
    if (section.moduleKey && !hasModule(section.moduleKey as ModuleKey)) {
      return false;
    }
    // Vérifier l'accessKey
    if (section.accessKey && !caps[section.accessKey]) {
      return false;
    }
    return true;
  });

  // Vérifier l'accès au support
  const showSupport = caps.canAccessSupport;

  // Timer pour fermer le menu avec un délai (permet de passer de la catégorie au menu)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMenuEnter = (menuId: string) => {
    // Annuler le timer de fermeture si on entre dans un menu
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setActiveMenu(menuId);
  };

  const handleMenuLeave = () => {
    // Délai avant de fermer le menu pour permettre le passage entre trigger et menu
    closeTimer.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
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
        <div className="container px-4">
          <div className="flex">
            {/* Logo sur 2 lignes */}
            <div className="flex flex-col items-center justify-center mr-6 shrink-0 py-2">
              <img 
                src={logoHelpconfortServices} 
                alt="HelpConfort Services" 
                className="h-20 w-auto"
              />
              <Link 
                to="/changelog" 
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground -mt-1 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                v{APP_VERSION}
              </Link>
            </div>

            {/* Colonne droite : Menu + Recherche */}
            <div className="flex-1 flex flex-col">
              {/* Ligne 1 : Navigation + Actions */}
              <div className="flex items-center h-14">
                {/* Navigation principale - Desktop */}
                <nav className="hidden lg:flex items-center flex-1 gap-1">
                  {/* Accueil */}
                  <Link
                    to="/"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      location.pathname === '/' 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Home className="w-4 h-4" />
                    <span>Accueil</span>
                  </Link>

                  {/* Menus avec méga-menus */}
                  {filteredMenus.map((section) => {
                    const IconComponent = getIcon(section.icon);
                    const isActive = activeMenu === section.id;
                    const isCurrentSection = section.links.some(link => 
                      location.pathname === link.href || location.pathname.startsWith(link.href + '/')
                    );

                    return (
                      <div
                        key={section.id}
                        className="relative"
                        onMouseEnter={() => handleMenuEnter(section.id)}
                        onMouseLeave={handleMenuLeave}
                      >
                        <button
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            isCurrentSection
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span>{section.title}</span>
                          <ChevronDown className={cn(
                            "w-3 h-3 transition-transform",
                            isActive && "rotate-180"
                          )} />
                        </button>

                        {/* Méga-menu */}
                        {isActive && (
                          <MegaMenu 
                            section={section} 
                            onClose={() => setActiveMenu(null)} 
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Support */}
                  {showSupport && (
                    <div
                      className="relative"
                      onMouseEnter={() => handleMenuEnter('support')}
                      onMouseLeave={handleMenuLeave}
                    >
                      <button
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors relative",
                          location.pathname.startsWith('/support')
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Headset className="w-4 h-4" />
                        <span>Support</span>
                        <ChevronDown className={cn(
                          "w-3 h-3 transition-transform",
                          activeMenu === 'support' && "rotate-180"
                        )} />
                        {hasNewTickets && (
                          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {newTicketsCount}
                          </span>
                        )}
                      </button>

                      {activeMenu === 'support' && (
                        <MegaMenu 
                          section={SUPPORT_MENU} 
                          onClose={() => setActiveMenu(null)} 
                        />
                      )}
                    </div>
                  )}
                </nav>

                {/* Actions droite */}
                <div className="flex items-center gap-1 ml-auto">
                  {/* RH Notifications - seule cloche */}
                  <RHNotificationBadge />

                  {/* Console support pour agents */}
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

                  {/* Menu utilisateur */}
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
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Menu hamburger mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Ligne 2 : Barre de recherche IA */}
              <div className="hidden lg:flex items-center pb-2">
                <UnifiedSearchFloatingBar />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation mobile */}
        {mobileMenuOpen && (
          <MobileNav 
            sections={filteredMenus}
            supportSection={showSupport ? SUPPORT_MENU : undefined}
            onClose={() => setMobileMenuOpen(false)}
          />
        )}
      </header>
    </>
  );
}
