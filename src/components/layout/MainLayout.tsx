import { ReactNode, useState } from 'react';
import { MainHeader } from './MainHeader';
import { PublicLanding } from './PublicLanding';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';
import { RHLoginNotificationPopup } from '@/components/rh/RHLoginNotificationPopup';
import { DeadlineAlertPopup } from '@/components/alerts/DeadlineAlertPopup';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';

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
      <div className={`min-h-screen w-full flex flex-col bg-background ${isImpersonating ? 'pt-10' : ''}`}>
        {showHeader && <MainHeader />}
        
        {/* Contenu principal */}
        <main id="main-content" className="flex-1 overflow-auto" role="main">
          {children}
        </main>
      </div>

      <ImageModal />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <RHLoginNotificationPopup />
      <DeadlineAlertPopup />
    </AiUnifiedProvider>
  );
}
