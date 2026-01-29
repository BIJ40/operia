/**
 * ApporteurTabsBar - Barre d'onglets browser-like pour l'espace Apporteur
 * Style Warm Pastel cohérent avec le reste du site
 */

import { cn } from '@/lib/utils';
import { useApporteurTabs, APPORTEUR_MODULES } from './ApporteurTabsContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export function ApporteurTabsBar() {
  const { tabs, activeTabId, setActiveTab } = useApporteurTabs();

  // Séparer l'onglet Profil (aligné à droite)
  const mainTabs = tabs.filter(t => t.id !== 'profil');
  const profilTab = tabs.find(t => t.id === 'profil');

  return (
    <div className="flex items-end border-b bg-muted/30">
      <ScrollArea className="flex-1">
        <div className="flex items-end px-2 pt-2">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group flex items-center gap-2 px-4 py-2.5 rounded-t-xl cursor-pointer select-none',
                  'border-2 border-b-0 transition-all duration-200 min-w-[100px]',
                  'font-medium text-sm',
                  isActive
                    ? 'bg-background border-border text-foreground shadow-sm -mb-[2px] z-10'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Onglet Profil aligné à droite */}
      {profilTab && (
        <div className="px-2 pt-2 border-l border-border/50">
          <button
            onClick={() => setActiveTab(profilTab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl cursor-pointer select-none',
              'border-2 border-b-0 transition-all duration-200',
              'font-medium text-sm',
              activeTabId === profilTab.id
                ? 'bg-background border-border text-foreground shadow-sm -mb-[2px] z-10'
                : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <profilTab.icon className="h-4 w-4 shrink-0" />
            <span>{profilTab.label}</span>
          </button>
        </div>
      )}
    </div>
  );
}
