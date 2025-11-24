import { Link, useLocation } from 'react-router-dom';
import { LogOut, Home, Edit3, Square, LogIn, Settings, User, Heart, Loader2 } from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoginDialog } from '@/components/LoginDialog';
import { ChatbotNotifications } from '@/components/ChatbotNotifications';
import { SupportNotifications } from '@/components/SupportNotifications';
import { useState } from 'react';

export function Header() {
  const location = useLocation();
  const editorContext = useEditor();
  const apporteurContext = useApporteurEditor();
  const { isAuthenticated, isAdmin, isSupport, roleAgence, isLoggingOut, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Déterminer quel contexte utiliser selon la page
  const isApporteurPage = location.pathname.startsWith('/apporteurs');
  const currentContext = isApporteurPage ? apporteurContext : editorContext;
  const { isEditMode, toggleEditMode } = currentContext;

  const handleEditerClick = () => {
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
      {/* Overlay de déconnexion */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
          <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-2xl animate-scale-in flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">Déconnexion en cours...</h3>
              <p className="text-sm text-muted-foreground">À bientôt !</p>
            </div>
          </div>
        </div>
      )}

      {isAdmin ? (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
            >
              <Home className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">ACCUEIL</span>
            </Link>

            <Link 
              to="/apogee" 
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
            >
              <span className="font-semibold text-foreground">APOGEE</span>
            </Link>

            <Link 
              to="/apporteurs" 
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
            >
              <span className="font-semibold text-foreground">APPORTEURS</span>
            </Link>

            {roleAgence !== 'assistant(e)' && (
              <Link 
                to="/helpconfort" 
                className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
              >
                <span className="font-semibold text-foreground">HELPCONFORT</span>
              </Link>
            )}

            <Button
              onClick={handleEditerClick}
              variant="ghost"
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
            >
              {isEditMode ? (
                <>
                  <Square className="w-5 h-5 text-destructive" />
                  <span className="font-semibold text-foreground">STOP</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">EDITER</span>
                </>
              )}
            </Button>

            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
            >
              <Settings className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">ADMIN</span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <ChatbotNotifications />
              <SupportNotifications />
              {isSupport && (
                <Link
                  to="/support"
                  className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-primary/30 rounded-xl hover:bg-accent hover:border-primary hover:scale-[1.02] transition-all duration-300"
                >
                  <Settings className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">SUPPORT</span>
                </Link>
              )}
              <Link
                to="/profile"
                className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
              >
                <User className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">PROFIL</span>
              </Link>
              <Button
                onClick={logout}
                variant="ghost"
                className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
              >
                <LogOut className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold text-foreground">QUITTER</span>
              </Button>
            </div>
          </div>
        </header>
      ) : (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-2 flex items-center justify-end gap-2">
            {isAuthenticated ? (
              <>
                {isSupport && (
                  <Link
                    to="/support"
                    className="text-primary hover:text-primary hover:scale-110 transition-all duration-300 shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] p-2 rounded-md"
                    title="Support client"
                  >
                    <Settings className="w-5 h-5" />
                  </Link>
                )}
                <Link
                  to="/favorites"
                  className="text-primary hover:text-primary hover:scale-110 transition-all duration-300 shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] p-2 rounded-md"
                  title="Mes favoris"
                >
                  <Heart className="w-5 h-5" />
                </Link>
                <Link
                  to="/profile"
                  className="text-primary hover:text-primary hover:scale-110 transition-all duration-300 shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] p-2 rounded-md"
                  title="Mon profil"
                >
                  <User className="w-5 h-5" />
                </Link>
                <Button
                  onClick={logout}
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:text-primary hover:scale-110 transition-all duration-300 shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                  title="Déconnexion"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setLoginOpen(true)}
                variant="ghost"
                size="icon"
                className="text-primary hover:text-primary hover:scale-110 transition-all duration-300 shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                title="Connexion administrateur"
              >
                <LogIn className="w-5 h-5" />
              </Button>
            )}
          </div>
        </header>
      )}

      
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
