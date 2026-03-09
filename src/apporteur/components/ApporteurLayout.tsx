/**
 * ApporteurLayout - Layout unifié pour l'espace Apporteur
 * Utilise le nouveau système d'authentification autonome (ApporteurSessionContext)
 */

import { ReactNode, Component, ErrorInfo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApporteurSession } from '@/apporteur/contexts/ApporteurSessionContext';
import { ApporteurAuthProvider } from '@/contexts/ApporteurAuthContext';
import { ApporteurLoginPage } from '@/apporteur/pages/ApporteurLoginPage';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ApporteurTabsProvider } from './browser-tabs/ApporteurTabsContext';
import { ApporteurTabsBar } from './browser-tabs/ApporteurTabsBar';
import { ApporteurTabsContent } from './browser-tabs/ApporteurTabsContent';
import { Button } from '@/components/ui/button';
import { 
  User, 
  LogOut, 
  Bug,
  ChevronDown,
  Building2,
  Home,
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ApporteurLayoutProps {
  children?: ReactNode;
}

// Check if we're in dev/preview mode
const isDevMode = () => {
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('preview') ||
    hostname.includes('lovable')
  );
};

export function ApporteurLayout({ children }: ApporteurLayoutProps) {
  const {
    isAuthenticated,
    isLoading,
    session,
    logout,
  } = useApporteurSession();
  const navigate = useNavigate();

  const devBypass = false; // Disabled: use real auth flow even in dev
  
  const displayUser = devBypass
    ? {
        firstName: 'Mode DEV',
        email: 'dev@preview.local',
        apporteurName: 'Accès sans authentification',
      }
    : session
    ? {
        firstName: session.firstName || session.email?.split('@')[0] || 'Utilisateur',
        email: session.email,
        apporteurName: session.apporteurName,
      }
    : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Login page for unauthenticated users (prod only)
  if (!isAuthenticated && !devBypass) {
    return <ApporteurLoginPage />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/apporteur');
  };

  return (
    <ApporteurAuthProvider>
      <ApporteurTabsProvider>
        <div className={cn("min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col", devBypass && "pt-9")}>
          {/* Dev Mode Banner */}
          {devBypass && (
            <div className="fixed top-0 inset-x-0 z-[60] h-9 border-b border-border bg-accent text-accent-foreground flex items-center justify-center gap-2 px-3 text-xs">
              <Bug className="w-4 h-4" />
              <span className="font-medium">Mode DEV</span>
              <span className="hidden sm:inline">— accès apporteur sans authentification</span>
            </div>
          )}

          {/* Header avec onglets intégrés */}
          <header
            className={cn(
              "sticky z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60",
              devBypass ? "top-9" : "top-0"
            )}
          >
            <div className="container flex h-14 items-center gap-4">
              {/* Onglets de navigation - prennent toute la place */}
              <div className="flex-1">
                <ApporteurTabsBar />
              </div>

              {/* User Menu à droite */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 shrink-0">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline max-w-[100px] truncate text-sm">
                      {displayUser?.firstName || 'Compte'}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{displayUser?.apporteurName}</p>
                    <p className="text-xs text-muted-foreground">{displayUser?.email}</p>
                  </div>
                  {!devBypass && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container">
              <ApporteurTabsContent />
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t bg-muted/30 py-3 mt-auto">
            <div className="container text-center text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} HelpConfort Services - Espace Apporteur</p>
            </div>
          </footer>
        </div>
      </ApporteurTabsProvider>
    </ApporteurAuthProvider>
  );
}

// Feature card component for landing page
function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-card border rounded-2xl p-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
