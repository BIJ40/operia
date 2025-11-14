import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';
import { Chatbot } from '@/components/Chatbot';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showSearchBar?: boolean;
}

export function Layout({ children, showHeader = true, showSearchBar = false }: LayoutProps) {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          {showHeader && <Header onOpenLogin={() => setLoginOpen(true)} />}

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <ImageModal />
      <Chatbot />
    </SidebarProvider>
  );
}
