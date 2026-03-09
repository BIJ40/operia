/**
 * ApporteurLayout - Layout unifié pour l'espace Apporteur
 * Utilise le nouveau système d'authentification autonome (ApporteurSessionContext)
 */

import { ReactNode, Component, ErrorInfo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApporteurSession } from '@/apporteur/contexts/ApporteurSessionContext';
import { ApporteurAuthProvider } from '@/contexts/ApporteurAuthContext';
import { ApporteurLoginPage } from '@/apporteur/pages/ApporteurLoginPage';
import { ApporteurTabsProvider } from './browser-tabs/ApporteurTabsContext';
import { ApporteurTabsBar } from './browser-tabs/ApporteurTabsBar';
import { ApporteurTabsContent } from './browser-tabs/ApporteurTabsContent';
import { Button } from '@/components/ui/button';
import { 
  User, 
  LogOut, 
  Bug,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
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

// ── Local Error Boundary for Apporteur content ──────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ApporteurErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ApporteurLayout] Runtime error caught:', error);
    console.error('[ApporteurLayout] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Erreur dans l'espace Apporteur
            </h2>
            <p className="text-sm text-muted-foreground">
              Une erreur est survenue lors du chargement.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 bg-muted rounded-lg text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-1 break-all">
                  {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
                </p>
              </div>
            )}
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              variant="default"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recharger
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main Layout ─────────────────────────────────────────────

export function ApporteurLayout({ children }: ApporteurLayoutProps) {
  const {
    isAuthenticated,
    isLoading,
    session,
    logout,
  } = useApporteurSession();
  const navigate = useNavigate();

  const displayUser = session
    ? {
        firstName: session.firstName || session.email?.split('@')[0] || 'Utilisateur',
        email: session.email,
        apporteurName: session.apporteurName,
      }
    : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="apporteur-theme min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Login page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="apporteur-theme">
        <ApporteurLoginPage />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/apporteur');
  };

  return (
    <ApporteurErrorBoundary>
      <ApporteurAuthProvider>
        <ApporteurTabsProvider>
          <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
            {/* Header avec onglets intégrés */}
            <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Déconnexion
                    </DropdownMenuItem>
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
    </ApporteurErrorBoundary>
  );
}
