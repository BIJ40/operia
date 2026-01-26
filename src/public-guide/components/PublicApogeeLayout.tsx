/**
 * PublicApogeeLayout - Layout avec sidebar et onglets pour le Guide Apogée public
 * Interface navigateur similaire au module Franchiseur
 */

import { ReactNode, useRef, useState, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { PublicGuideTabsProvider } from '../contexts/PublicGuideTabsContext';
import { PublicGuideHeader } from './PublicGuideHeader';
import { PublicGuideFooter } from './PublicGuideFooter';
import { PublicCategorySidebar } from './PublicCategorySidebar';
import { PublicGuideTabsBar } from './PublicGuideTabsBar';
import { PublicGuideTabsContent } from './PublicGuideTabsContent';
import { cn } from '@/lib/utils';

interface PublicApogeeLayoutProps {
  children?: ReactNode;
}

export function PublicApogeeLayout({ children }: PublicApogeeLayoutProps) {
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDoubleClick = useCallback(() => {
    if (sidebarRef.current) {
      if (isCollapsed) {
        sidebarRef.current.expand();
      } else {
        sidebarRef.current.collapse();
      }
    }
  }, [isCollapsed]);

  return (
    <PublicGuideTabsProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex flex-col">
        {/* Header minimaliste */}
        <PublicGuideHeader />

        {/* Corps principal avec sidebar et contenu */}
        <div className="flex-1 flex overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Sidebar des catégories */}
            <ResizablePanel 
              ref={sidebarRef}
              defaultSize={20} 
              minSize={15} 
              maxSize={30} 
              collapsible
              collapsedSize={0}
              onCollapse={() => setIsCollapsed(true)}
              onExpand={() => setIsCollapsed(false)}
              className="hidden md:block"
            >
              <PublicCategorySidebar />
            </ResizablePanel>
            
            <ResizableHandle 
              withHandle 
              onDoubleClick={handleDoubleClick}
              className={cn(
                "hidden md:flex transition-all duration-200",
                isCollapsed 
                  ? "[&>div]:h-20 [&>div]:w-5 [&>div]:translate-x-3 [&>div]:bg-primary/30 [&>div]:hover:bg-primary/50 [&>div]:border [&>div]:border-primary/40 [&>div]:rounded-r-lg [&>div]:shadow-md"
                  : "[&>div]:h-8 [&>div]:w-2 [&>div]:bg-muted-foreground/20 [&>div]:hover:bg-muted-foreground/40 [&>div]:rounded"
              )}
            />
            
            {/* Zone principale avec onglets */}
            <ResizablePanel defaultSize={80}>
              <div className="flex flex-col h-full">
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