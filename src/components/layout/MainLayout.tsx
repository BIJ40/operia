import { ReactNode, useState } from 'react';
import { TabHeader } from './TabHeader';
import { LoginFormCard } from '@/components/LoginFormCard';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';
import { SidebarChat } from '@/components/chat/SidebarChat';
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

  // Show login form for unauthenticated users when auth is required
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950/10 via-background to-indigo-950/10 p-4">
        <LoginFormCard />
      </div>
    );
  }

  return (
    <AiUnifiedProvider>
      <div className={`min-h-screen w-full flex flex-col bg-background ${isImpersonating ? 'pt-10' : ''}`}>
        {/* Header unifié - TabHeader uniquement */}
        {showHeader && <TabHeader />}
        
        {/* Contenu principal */}
        <main id="main-content" className="flex-1 overflow-auto" role="main">
          {children}
        </main>
      </div>

      <ImageModal />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <SidebarChat />
    </AiUnifiedProvider>
  );
}

