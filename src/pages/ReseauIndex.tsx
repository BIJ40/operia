import { 
  BrowserTabsProvider, 
  BrowserTabsBar, 
  BrowserTabsContent 
} from '@/franchiseur/components/browser-tabs';

export default function ReseauIndex() {
  return (
    <BrowserTabsProvider>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <BrowserTabsBar />
        <BrowserTabsContent />
      </div>
    </BrowserTabsProvider>
  );
}
