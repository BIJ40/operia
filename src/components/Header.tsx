import { Link, useLocation } from 'react-router-dom';
import { LogOut, Home, Edit3, Square, LogIn, Settings, User, Heart, Loader2, BarChart3, Headset, Ticket } from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoginDialog } from '@/components/LoginDialog';
import { ChatbotNotifications } from '@/components/ChatbotNotifications';
import { useSupportNotifications } from '@/hooks/use-support-notifications';
import { useState } from 'react';

export function Header() {
  const location = useLocation();
  const editorContext = useEditor();
  const apporteurContext = useApporteurEditor();
  const { isAuthenticated, isAdmin, isSupport, roleAgence, isLoggingOut, logout } = useAuth();
  const { hasNewTickets, newTicketsCount, assignedToMeCount } = useSupportNotifications();
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
        <header className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 transition-all duration-300 ${
          hasNewTickets ? 'animate-[pulse-red_2s_ease-in-out_infinite] shadow-[0_0_30px_rgba(239,68,68,0.5)]' : ''
        }`}>
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
            >
              <Home className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">ACCUEIL</span>
            </Link>


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
              <Link
                to="/admin/support"
                className={`flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-xl hover:bg-accent hover:scale-[1.02] transition-all duration-300 relative ${
                  hasNewTickets 
                    ? 'border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Headset className={`w-5 h-5 ${hasNewTickets ? 'text-red-500' : 'text-primary'}`} />
                <span className={`font-semibold ${hasNewTickets ? 'text-red-500' : 'text-foreground'}`}>
                  SUPPORT
                </span>
                {hasNewTickets && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                    {newTicketsCount}
                  </span>
                )}
                {assignedToMeCount > 0 && (
                  <span className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {assignedToMeCount}
                  </span>
                )}
              </Link>
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
        <header className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 transition-all duration-300 ${
          isSupport && hasNewTickets ? 'animate-[pulse-red_2s_ease-in-out_infinite] shadow-[0_0_30px_rgba(239,68,68,0.5)]' : ''
        }`}>
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {isSupport && (
                  <>
                    <Link 
                      to="/" 
                      className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
                    >
                      <Home className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">ACCUEIL</span>
                    </Link>
                    <Link
                      to="/support"
                      className={`flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-xl hover:bg-accent hover:scale-[1.02] transition-all duration-300 relative ${
                        hasNewTickets 
                          ? 'border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Headset className={`w-5 h-5 ${hasNewTickets ? 'text-red-500' : 'text-primary'}`} />
                      <span className={`font-semibold ${hasNewTickets ? 'text-red-500' : 'text-foreground'}`}>
                        SUPPORT
                      </span>
                      {hasNewTickets && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                          {newTicketsCount}
                        </span>
                      )}
                      {assignedToMeCount > 0 && (
                        <span className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {assignedToMeCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <ChatbotNotifications />
                  <Link
                    to="/support-tickets"
                    className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
                  >
                    <Ticket className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">TICKETS</span>
                  </Link>
                  <Link
                    to="/favorites"
                    className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
                  >
                    <Heart className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">FAVORIS</span>
                  </Link>
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
