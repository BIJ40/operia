import { Link, useLocation } from 'react-router-dom';
import { LogOut, User, Settings, Headset, Loader2, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupportNotifications } from '@/hooks/use-support-notifications';
import logoHelpconfort from '@/assets/logo_helpogee.png';

const pageTitles: Record<string, string> = {
  '/': 'Tableau de bord',
  // HELP Academy
  '/apogee': 'Guide Apogée',
  '/apporteurs': 'Guide Apporteurs',
  '/helpconfort': 'Base Documentaire',
  '/documents': 'Documents',
  // Pilotage
  '/mes-indicateurs': 'Mes Indicateurs',
  '/mes-indicateurs/apporteurs': 'Indicateurs Apporteurs',
  '/mes-indicateurs/univers': 'Indicateurs Univers',
  '/mes-indicateurs/techniciens': 'Indicateurs Techniciens',
  '/mes-indicateurs/sav': 'Indicateurs SAV',
  '/actions-a-mener': 'Actions à Mener',
  '/diffusion': 'Mode Diffusion',
  // Support
  '/mes-demandes': 'Mes Demandes',
  '/support': 'Support',
  '/support-tickets': 'Mes Tickets',
  // Franchiseur
  '/tete-de-reseau': 'Dashboard Réseau',
  '/tete-de-reseau/agences': 'Agences du Réseau',
  '/tete-de-reseau/stats': 'Statistiques Réseau',
  '/tete-de-reseau/comparatifs': 'Comparatifs',
  '/tete-de-reseau/redevances': 'Redevances',
  '/tete-de-reseau/parametres': 'Paramètres Réseau',
  // Admin
  '/admin': 'Administration',
  '/admin/support': 'Gestion Tickets',
  '/admin/users': 'Gestion Utilisateurs',
  '/admin/users-list': 'Liste Utilisateurs',
  '/admin/role-permissions': 'Rôles & Permissions',
  '/admin/agencies': 'Gestion Agences',
  '/admin/backup': 'Sauvegardes',
  '/admin/documents': 'Documents Admin',
  '/admin/user-activity': 'Activité Utilisateurs',
  '/admin/storage-quota': 'Quota Stockage',
  '/admin/cache-backup': 'Cache & Backup',
  // User
  '/profile': 'Mon Profil',
  '/favorites': 'Mes Favoris',
};

export function UnifiedHeader() {
  const location = useLocation();
  const { isAdmin, isSupport, isLoggingOut, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const { hasNewTickets, newTicketsCount } = useSupportNotifications();

  // Get dynamic page title
  const getPageTitle = () => {
    // Check exact match first
    if (pageTitles[location.pathname]) {
      return pageTitles[location.pathname];
    }
    // Check for prefix matches
    for (const [path, title] of Object.entries(pageTitles)) {
      if (location.pathname.startsWith(path) && path !== '/') {
        return title;
      }
    }
    return 'HC Services';
  };

  return (
    <>
      {/* Logout overlay */}
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

      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 h-16">
        <div className="h-full px-4 flex items-center gap-4">
          {/* Sidebar toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo (clickable to home) */}
          <Link to="/" className="shrink-0 hidden sm:block">
            <img 
              src={logoHelpconfort} 
              alt="HelpConfort" 
              className="h-10 object-contain hover:opacity-80 transition-opacity"
            />
          </Link>

          {/* Page title - centered */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {getPageTitle()}
            </h1>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Support button for support staff */}
            {(isSupport || isAdmin) && (
              <Link to="/admin/support">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`relative ${hasNewTickets ? 'text-destructive' : ''}`}
                >
                  <Headset className="w-5 h-5" />
                  {hasNewTickets && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                      {newTicketsCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Mon profil
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
          </div>
        </div>
      </header>
    </>
  );
}
