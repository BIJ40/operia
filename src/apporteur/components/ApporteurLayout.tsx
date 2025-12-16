/**
 * ApporteurLayout - Layout principal pour l'espace Apporteur
 * Isolé du système interne HelpConfort
 */

import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { ApporteurLoginDialog } from './ApporteurLoginDialog';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Home, 
  FolderOpen, 
  FileText, 
  PlusCircle, 
  User, 
  LogOut, 
  Menu,
  X,
  Building2,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApporteurLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { path: '/apporteur/dashboard', label: 'Tableau de bord', icon: Home },
  { path: '/apporteur/dossiers', label: 'Mes dossiers', icon: FolderOpen },
  { path: '/apporteur/demandes', label: 'Demandes', icon: FileText },
  { path: '/apporteur/nouvelle-demande', label: 'Nouvelle demande', icon: PlusCircle },
];

export function ApporteurLayout({ children }: ApporteurLayoutProps) {
  const { isApporteurAuthenticated, isApporteurLoading, apporteurUser, logout } = useApporteurAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Loading state
  if (isApporteurLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Landing page for unauthenticated apporteurs
  if (!isApporteurAuthenticated) {
    return (
      <>
        <ApporteurLanding onLoginClick={() => setLoginOpen(true)} />
        <ApporteurLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/apporteur');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/apporteur/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">
              <span className="text-primary">Help</span>
              <span className="text-accent">!</span>
              <span className="text-primary">Confort</span>
              <span className="text-muted-foreground ml-2 text-sm font-normal">Espace Apporteur</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline max-w-[150px] truncate">
                    {apporteurUser?.firstName || apporteurUser?.email || 'Mon compte'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{apporteurUser?.apporteurName}</p>
                  <p className="text-xs text-muted-foreground">{apporteurUser?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card">
            <nav className="container py-2 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-4 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} HelpConfort Services - Espace Apporteur</p>
        </div>
      </footer>
    </div>
  );
}

// Landing page pour apporteurs non connectés
function ApporteurLanding({ onLoginClick }: { onLoginClick: () => void }) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-primary to-primary-dark">
        <div className="container mx-auto px-4 py-3">
          <p className="text-center text-primary-foreground text-lg font-medium">
            Espace Partenaires Apporteurs d'Affaires
          </p>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mx-auto mb-8">
            <Building2 className="w-10 h-10 text-white" />
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
              className="gap-2 bg-primary hover:bg-primary/90 shadow-xl"
            >
              <User className="w-5 h-5" />
              Me connecter
            </Button>
            <Button 
              variant="outline"
              size="lg"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
          <FeatureCard
            icon={FolderOpen}
            title="Suivi des dossiers"
            description="Consultez l'avancement de tous vos dossiers en cours."
          />
          <FeatureCard
            icon={PlusCircle}
            title="Demandes rapides"
            description="Créez une demande d'intervention en quelques clics."
          />
          <FeatureCard
            icon={FileText}
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
    <div className="bg-card border rounded-xl p-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
