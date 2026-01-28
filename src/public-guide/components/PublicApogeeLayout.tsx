/**
 * PublicApogeeLayout - Layout avec sidebar et onglets pour le Guide Apogée public
 * Version Warm Pastel avec fond gradient
 */

import { ReactNode } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { PublicGuideTabsProvider } from '../contexts/PublicGuideTabsContext';
import { PublicGuideHeader } from './PublicGuideHeader';
import { PublicGuideFooter } from './PublicGuideFooter';
import { PublicCategorySidebar } from './PublicCategorySidebar';
import { PublicGuideTabsBar } from './PublicGuideTabsBar';
import { PublicGuideTabsContent } from './PublicGuideTabsContent';

interface PublicApogeeLayoutProps {
  children?: ReactNode;
}

export function PublicApogeeLayout({ children }: PublicApogeeLayoutProps) {
  return (
    <PublicGuideTabsProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
        {/* Header minimaliste */}
        <PublicGuideHeader />

        {/* Corps principal avec sidebar et contenu */}
        <div className="flex-1 flex overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Sidebar des catégories */}
            <ResizablePanel 
              defaultSize={22} 
              minSize={15} 
              maxSize={30} 
              collapsible
              className="hidden md:block"
            >
              <PublicCategorySidebar />
            </ResizablePanel>
            
            <ResizableHandle withHandle className="hidden md:flex bg-border/50 hover:bg-border transition-colors" />
            
            {/* Zone principale avec onglets */}
            <ResizablePanel defaultSize={78}>
              <div className="flex flex-col h-full bg-background/50">
                <PublicGuideTabsBar />
                <PublicGuideTabsContent />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Footer */}
        <PublicGuideFooter />
      </div>
    </PublicGuideTabsProvider>
  );
}
