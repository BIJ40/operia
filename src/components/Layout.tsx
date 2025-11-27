import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppSidebarApporteur } from '@/components/AppSidebarApporteur';
import { AppSidebarHelpConfort } from '@/components/AppSidebarHelpConfort';
import { AppSidebarAdmin } from '@/components/AppSidebarAdmin';
import { AppSidebarActionsAMener } from '@/components/AppSidebarActionsAMener';
import { Header } from '@/components/Header';
import { Chatbot } from '@/components/Chatbot';
import { ImageModal } from '@/components/ImageModal';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';
import { useAdminConnectionNotifications } from '@/hooks/use-admin-connection-notifications';
import { useImpersonation } from '@/contexts/ImpersonationContext';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showSidebar?: boolean;
  sidebarType?: 'apogee' | 'apporteur' | 'helpconfort' | 'admin' | 'actions';
}

export function Layout({ children, showHeader = true, showSidebar = true, sidebarType = 'apogee' }: LayoutProps) {
  useStorageQuota(); // Surveillance automatique du localStorage
  useUserPresence(); // Tracking de la présence utilisateur
  useConnectionLogger(); // Log des connexions/déconnexions
  // useAdminConnectionNotifications(); // Notifications temps réel pour les admins - DÉSACTIVÉ
  
  const { isImpersonating } = useImpersonation();
  
  const SidebarComponent = sidebarType === 'apporteur' 
    ? AppSidebarApporteur 
    : sidebarType === 'helpconfort'
    ? AppSidebarHelpConfort
    : sidebarType === 'admin'
    ? AppSidebarAdmin
    : sidebarType === 'actions'
    ? AppSidebarActionsAMener
    : AppSidebar;
  
  return (
    <SidebarProvider>
      <div className={`min-h-screen w-full flex bg-background overflow-x-auto ${isImpersonating ? 'pt-10' : ''}`}>
        {showSidebar && <SidebarComponent />}
        
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          {showHeader && <Header />}

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>

      <ImageModal />
      <Chatbot />
    </SidebarProvider>
  );
}
