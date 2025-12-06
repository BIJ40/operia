import { ReactNode, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { UnifiedSidebar } from './UnifiedSidebar';
import { UnifiedHeader } from './UnifiedHeader';
import { PublicLanding } from './PublicLanding';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider, AiUnifiedBar } from '@/components/ai';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';

interface MainLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  showSidebar?: boolean;
  showHeader?: boolean;
}

export function MainLayout({ 
  children, 
  requireAuth = true,
  showSidebar = true,
  showHeader = true 
}: MainLayoutProps) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { isImpersonating } = useImpersonation();
  const [loginOpen, setLoginOpen] = useState(false);
  
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

  return (
    <AiUnifiedProvider>
      <SidebarProvider>
        <div className={`min-h-screen w-full flex bg-background ${isImpersonating ? 'pt-10' : ''}`}>
          {showSidebar && <UnifiedSidebar />}
          
          <div className="flex-1 flex flex-col min-h-screen min-w-0">
            {showHeader && <UnifiedHeader />}
            
            {/* Barre IA unifiée 2026 - toujours visible */}
            <AiUnifiedBar />
            
            {/* P2 FIX: id pour skip link accessibilité */}
            <main id="main-content" className="flex-1 overflow-auto p-6" role="main">
              {children}
            </main>
          </div>
        </div>

        <ImageModal />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </SidebarProvider>
    </AiUnifiedProvider>
  );
}
