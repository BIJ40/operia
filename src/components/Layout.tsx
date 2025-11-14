import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';
import { Chatbot } from '@/components/Chatbot';
import { ImageModal } from '@/components/ImageModal';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showSearchBar?: boolean;
}

export function Layout({ children, showHeader = true, showSearchBar = false }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
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
