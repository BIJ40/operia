/**
 * ApporteurLayout - Layout unifié pour l'espace Apporteur
 * Utilise le système d'onglets browser-like comme le reste du site
 */

import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { ApporteurLoginDialog } from './ApporteurLoginDialog';
import { ApporteurTabsProvider } from './browser-tabs/ApporteurTabsContext';
import { ApporteurTabsBar } from './browser-tabs/ApporteurTabsBar';
import { ApporteurTabsContent } from './browser-tabs/ApporteurTabsContent';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  User, 
  LogOut, 
  Building2,
  Bug,
  ChevronDown,
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

export function ApporteurLayout({ children }: ApporteurLayoutProps) {
  const {
    isApporteurAuthenticated,
    isApporteurLoading,
    apporteurUser,
    user,
    logout,
  } = useApporteurAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();

  const isDevMode = () => {
    const hostname = window.location.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('preview') ||
      hostname.includes('lovable')
    );
  };

  const devBypass = isDevMode() && !isApporteurAuthenticated;
  const displayUser = devBypass
    ? {
        firstName: 'Mode DEV',
        email: user?.email ?? null,
        apporteurName: 'Accès sans authentification',
      }
    : apporteurUser;

  // Loading state
  if (isApporteurLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Landing page for unauthenticated apporteurs (prod)
  if (!isApporteurAuthenticated && !devBypass) {
    return (
      <>
        <ApporteurLanding onLoginClick={() => setLoginOpen(true)} />
        <ApporteurLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  const handleLogout = async () => {
    if (devBypass) {
      setLoginOpen(true);
      return;
    }
    await logout();
    navigate('/apporteur');
  };

  return (
    <ApporteurTabsProvider>
      <div className={cn("min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col", devBypass && "pt-9")}>
        {/* Dev Mode Banner */}
        {devBypass && (
          <div className="fixed top-0 inset-x-0 z-[60] h-9 border-b border-border bg-accent text-accent-foreground flex items-center justify-center gap-2 px-3 text-xs">
            <Bug className="w-4 h-4" />
            <span className="font-medium">Mode DEV</span>
            <span className="hidden sm:inline">— accès apporteur sans authentification</span>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 ml-2"
              onClick={() => setLoginOpen(true)}
            >
              Se connecter
            </Button>
          </div>
        )}

        {/* Header minimal */}
        <header
          className={cn(
            "sticky z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60",
            devBypass ? "top-9" : "top-0"
          )}
        >
          <div className="container flex h-14 items-center justify-between">
            {/* Logo */}
            <Link to="/apporteur" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg hidden sm:inline">
                <span className="text-primary">Help</span>
                <span className="text-accent">!</span>
                <span className="text-primary">Confort</span>
                <span className="text-muted-foreground ml-2 text-sm font-normal">Espace Apporteur</span>
              </span>
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline max-w-[150px] truncate">
                    {displayUser?.firstName || displayUser?.email || 'Mon compte'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
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

        {/* Tabs Bar */}
        <ApporteurTabsBar />

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

        {devBypass && (
          <ApporteurLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        )}
      </div>
    </ApporteurTabsProvider>
  );
}

// Landing page pour apporteurs non connectés
function ApporteurLanding({ onLoginClick }: { onLoginClick: () => void }) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-primary to-primary/80">
        <div className="container mx-auto px-4 py-3">
          <p className="text-center text-primary-foreground text-lg font-medium">
            Espace Partenaires Apporteurs d'Affaires
          </p>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-8">
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-6">
            <span className="text-primary">Help</span>
            <span className="text-accent">!</span>
            <span className="text-primary">Confort</span>
            <span className="block text-2xl md:text-3xl mt-2 font-semibold text-muted-foreground">
              Espace Apporteur
            </span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Suivez vos dossiers, créez des demandes d'intervention et accédez à vos statistiques en temps réel.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onLoginClick}
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 shadow-xl rounded-xl"
            >
              <User className="w-5 h-5" />
              Me connecter
            </Button>
            <Button 
              variant="outline"
              size="lg"
              onClick={() => navigate('/')}
              className="gap-2 rounded-xl"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
          <FeatureCard
            icon={Building2}
            title="Suivi des dossiers"
            description="Consultez l'avancement de tous vos dossiers en cours."
          />
          <FeatureCard
            icon={User}
            title="Demandes rapides"
            description="Créez une demande d'intervention en quelques clics."
          />
          <FeatureCard
            icon={Home}
            title="Documents"
            description="Accédez aux devis et factures de vos dossiers."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6 mt-auto">
        <div className="container text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HelpConfort Services. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

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
