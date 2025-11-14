import { Link } from 'react-router-dom';
import { LogOut, Home, HelpCircle, Edit3, Square, Database, LogIn } from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoginDialog } from '@/components/LoginDialog';
import { useState } from 'react';

export function Header() {
  const { blocks, isEditMode, toggleEditMode } = useEditor();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Find FAQ category
  const faqCategory = blocks.find(
    b => b.type === 'category' && b.title.toLowerCase().includes('faq')
  );

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
            <span className="font-semibold text-foreground">GUIDE</span>
          </Link>
          
          {faqCategory && (
            <Link 
              to={`/category/${faqCategory.slug}`}
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
            >
              <HelpCircle className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">FAQ</span>
            </Link>
          )}

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

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
            >
              <Database className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">ADMIN</span>
            </Link>
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
