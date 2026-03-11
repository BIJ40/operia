/* eslint-disable react-hooks/rules-of-hooks */
/**
 * MinimalLayout - Layout sans header pour les pages intégrées
 *
 * Utilisé pour les pages de détail qui sont accessibles via URL directe
 * mais doivent s'afficher sans l'ancien header legacy.
 * 
 * Pour les utilisateurs qui arrivent via URL directe, on affiche une
 * bannière de retour vers l'espace unifié.
 */

import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginFormCard } from '@/components/LoginFormCard';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';
import { SidebarChat } from '@/components/chat/SidebarChat';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimalLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  /** Affiche une barre de retour vers l'accueil */
  showBackBar?: boolean;
  /** Onglet de destination pour le bouton retour */
  backTab?: string;
  /** Label personnalisé pour le bouton retour */
  backLabel?: string;
}

export function MinimalLayout({ 
  children, 
  requireAuth = true,
  showBackBar = true,
  backTab = 'accueil',
  backLabel = "Retour à l'espace de travail"
}: MinimalLayoutProps) {
  const { isAuthenticated, isAuthLoading } = useAuthCore();
  const { isImpersonating } = useImpersonation();
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();
  
  // Hooks for tracking
  useStorageQuota();
  useUserPresence();
  useConnectionLogger();

  // Show loading state while auth is initializing
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login form for unauthenticated users when auth is required
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950/10 via-background to-indigo-950/10 p-4">
        <LoginFormCard />
      </div>
    );
  }

  const handleBack = () => {
    navigate(`/?tab=${backTab}`);
  };

  return (
    <AiUnifiedProvider>
      <div className={cn(
        'h-screen w-full flex flex-col overflow-hidden',
        'bg-gradient-to-br from-background via-background to-muted/30',
        isImpersonating ? 'pt-10' : ''
      )}>
        {/* Barre de retour minimaliste */}
        {showBackBar && (
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
            <div className="container max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBack}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{backLabel}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <Home className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Contenu principal */}
        <main id="main-content" className="flex-1 min-h-0 overflow-auto" role="main">
          {children}
        </main>
      </div>

      <ImageModal />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <SidebarChat />
    </AiUnifiedProvider>
  );
}
