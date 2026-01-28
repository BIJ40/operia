/**
 * InternalApogeeLayout - Layout avec sidebar et onglets pour le Guide Apogée interne
 * Interface navigateur similaire à /guide-apogee (version publique)
 */

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { InternalGuideTabsProvider } from './InternalGuideTabsContext';
import { InternalGuideSidebar } from './InternalGuideSidebar';
import { InternalGuideTabsBar } from './InternalGuideTabsBar';
import { InternalGuideTabsContent } from './InternalGuideTabsContent';

export function InternalApogeeLayout() {
  return (
    <InternalGuideTabsProvider>
      <div className="h-[calc(100vh-160px)] min-h-[500px] flex flex-col border rounded-lg overflow-hidden bg-background">
        {/* Corps principal avec sidebar et contenu */}
        <div className="flex-1 flex overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Sidebar des catégories */}
            <ResizablePanel 
              defaultSize={22} 
              minSize={15} 
              maxSize={35} 
              collapsible
              className="hidden md:block"
            >
              <InternalGuideSidebar />
            </ResizablePanel>
            
            <ResizableHandle withHandle className="hidden md:flex" />
            
            {/* Zone principale avec onglets */}
            <ResizablePanel defaultSize={78}>
              <div className="flex flex-col h-full">
                <InternalGuideTabsBar />
                <InternalGuideTabsContent />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </InternalGuideTabsProvider>
  );
}
