/**
 * FranchiseurTabContent - Contenu de l'onglet "Franchiseur"
 * Intègre le système d'onglets navigateur du module Réseau Franchiseur
 */

import { 
  BrowserTabsProvider, 
  BrowserTabsBar, 
  BrowserTabsContent 
} from '@/franchiseur/components/browser-tabs';

export default function FranchiseurTabContent() {
  return (
    <BrowserTabsProvider>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <BrowserTabsBar />
        <BrowserTabsContent />
      </div>
    </BrowserTabsProvider>
  );
}
