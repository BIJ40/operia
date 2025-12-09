import { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MainHeader } from './MainHeader';
import { PublicLanding } from './PublicLanding';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';
import { UnifiedSearchFloatingBar } from '@/components/unified-search';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';

// Navigation expérimentale
import { USE_EXPERIMENTAL_NAV, EXPERIMENTAL_HUB_ROUTE } from '@/config/experimentalNav';
import { SmartSidebar } from './SmartSidebar';
import { CommandPalette, CommandPaletteButton } from './CommandPalette';

interface MainLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  showHeader?: boolean;
}

export function MainLayout({ 
  children, 
  requireAuth = true,
  showHeader = true 
}: MainLayoutProps) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { isImpersonating } = useImpersonation();
  const [loginOpen, setLoginOpen] = useState(false);
  const location = useLocation();
  
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

  // Show public landing for unauthenticated users when auth is required
  if (requireAuth && !isAuthenticated) {
    return (
      <>
        <PublicLanding onLoginClick={() => setLoginOpen(true)} />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  // ============================================================================
  // NAVIGATION EXPÉRIMENTALE (USE_EXPERIMENTAL_NAV = true)
  // ============================================================================
  if (USE_EXPERIMENTAL_NAV) {
    const isOnHub = location.pathname === EXPERIMENTAL_HUB_ROUTE;
    
    return (
      <AiUnifiedProvider>
        <div className={`min-h-screen w-full flex bg-background ${isImpersonating ? 'pt-10' : ''}`}>
          {/* Smart Sidebar - remplace UnifiedSidebar + IconNavBar */}
          <SmartSidebar />
          
          {/* Zone principale */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header simplifié avec Command Palette */}
            {showHeader && (
              <header className="h-14 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                  {/* Bouton Command Palette */}
                  <CommandPaletteButton />
                </div>
                
                {/* Barre de recherche AI (sauf sur Hub) */}
                {!isOnHub && isAuthenticated && (
                  <div className="flex-1 max-w-xl mx-4">
                    <UnifiedSearchFloatingBar />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {/* Placeholder pour actions header (notifications, profil, etc.) */}
                </div>
              </header>
            )}
            
            {/* Contenu principal */}
            <main id="main-content" className="flex-1 overflow-auto" role="main">
              {children}
            </main>
          </div>
        </div>

        {/* Command Palette globale */}
        <CommandPalette />
        <ImageModal />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </AiUnifiedProvider>
    );
  }

  // ============================================================================
  // NAVIGATION LEGACY (USE_EXPERIMENTAL_NAV = false)
  // ============================================================================
  return (
    <AiUnifiedProvider>
      <div className={`min-h-screen w-full flex flex-col bg-background ${isImpersonating ? 'pt-10' : ''}`}>
        {showHeader && <MainHeader />}
        
        {/* Contenu principal */}
        <main id="main-content" className="flex-1 overflow-auto" role="main">
          {/* Barre de recherche AI - en haut du contenu */}
          {showHeader && isAuthenticated && (
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/30">
              <div className="container mx-auto px-4 py-2">
                <UnifiedSearchFloatingBar />
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      <ImageModal />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </AiUnifiedProvider>
  );
}
