import { Link, useLocation } from 'react-router-dom';
import { LogOut, Home, Edit3, Square, LogIn } from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoginDialog } from '@/components/LoginDialog';
import { useState } from 'react';

export function Header() {
  const location = useLocation();
  const editorContext = useEditor();
  const apporteurContext = useApporteurEditor();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Déterminer quel contexte utiliser selon la page
  const isApporteurPage = location.pathname.startsWith('/apporteurs');
  const currentContext = isApporteurPage ? apporteurContext : editorContext;
  const { isEditMode, toggleEditMode } = currentContext;

  const handleEnrichirClick = () => {
    if (!isAdmin) {
      setLoginOpen(true);
    } else if (isEditMode) {
      toggleEditMode();
    } else {
      toggleEditMode();
    }
  };

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link 
            to="/" 
            className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
          >
            <Home className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">ACCUEIL</span>
          </Link>

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

          <div className="ml-auto flex items-center gap-2">
            {!isAuthenticated && (
              <Button
                onClick={() => setLoginOpen(true)}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                title="Connexion administrateur"
              >
                <LogIn className="w-5 h-5" />
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
      
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
