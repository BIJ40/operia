import { Link, useLocation } from 'react-router-dom';
import { LogOut, Edit3, Square } from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoHelpconfort from '@/assets/logo-helpconfort-banner.jpg';

interface HeaderProps {
  onOpenLogin?: () => void;
}

export function Header({ onOpenLogin }: HeaderProps) {
  const { isEditMode, toggleEditMode } = useEditor();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();

  const handleEnrichirClick = () => {
    if (!isAdmin) {
      onOpenLogin?.();
    } else if (isEditMode) {
      toggleEditMode();
    } else {
      toggleEditMode();
    }
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      {/* Logo Bandeau */}
      <div className="w-full bg-white border-b">
        <div className="container mx-auto px-4 py-2">
          <img 
            src={logoHelpconfort} 
            alt="Help Confort" 
            className="h-20 w-auto mx-auto object-contain"
            draggable={false}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <Link 
          to="/" 
          className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg hover:shadow-md transition-all ${
            isActive('/') && location.pathname === '/' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
          }`}
        >
          <span className="font-semibold">ACCUEIL</span>
        </Link>
        
        <Link 
          to="/guide-apogee"
          className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg hover:shadow-md transition-all ${
            isActive('/guide-apogee') ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
          }`}
        >
          <span className="font-semibold">GUIDE APOGÉE</span>
        </Link>

        <Link 
          to="/apporteurs-nationaux"
          className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg hover:shadow-md transition-all ${
            isActive('/apporteurs-nationaux') ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
          }`}
        >
          <span className="font-semibold">APPORTEURS NATIONAUX</span>
        </Link>

        <Link 
          to="/informations-utiles"
          className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg hover:shadow-md transition-all ${
            isActive('/informations-utiles') ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
          }`}
        >
          <span className="font-semibold">INFORMATIONS UTILES</span>
        </Link>

        <div className="ml-auto flex items-center gap-4">
          {isAdmin && (
            <Button
              onClick={handleEnrichirClick}
              variant="ghost"
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
            >
              {isEditMode ? (
                <>
                  <Square className="w-5 h-5 text-destructive" />
                  <span className="font-semibold text-foreground">STOP</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">ENRICHIR</span>
                </>
              )}
            </Button>
          )}

          {isAuthenticated && (
            <Button
              onClick={logout}
              variant="ghost"
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-foreground">QUITTER</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
