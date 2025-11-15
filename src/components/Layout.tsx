import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppSidebarApporteur } from '@/components/AppSidebarApporteur';
import { Header } from '@/components/Header';
import { Chatbot } from '@/components/Chatbot';
import { ImageModal } from '@/components/ImageModal';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showSidebar?: boolean;
  sidebarType?: 'apogee' | 'apporteur';
}

export function Layout({ children, showHeader = true, showSidebar = true, sidebarType = 'apogee' }: LayoutProps) {
  const SidebarComponent = sidebarType === 'apporteur' ? AppSidebarApporteur : AppSidebar;
  
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background overflow-x-auto">
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
