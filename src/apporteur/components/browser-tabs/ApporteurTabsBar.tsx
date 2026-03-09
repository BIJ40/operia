/**
 * ApporteurTabsBar - Barre d'onglets pour l'espace Apporteur
 * Thème depan40 : toutes les icônes utilisent le bleu primaire unifié
 */

import { cn } from '@/lib/utils';
import { useApporteurTabs } from './ApporteurTabsContext';

export function ApporteurTabsBar() {
  const { tabs, activeTabId, setActiveTab } = useApporteurTabs();

  // Séparer l'onglet Profil (aligné à droite)
  const mainTabs = tabs.filter(t => t.id !== 'profil');
  const profilTab = tabs.find(t => t.id === 'profil');

  const renderTab = (tab: typeof tabs[0]) => {
    const Icon = tab.icon;
    const isActive = tab.id === activeTabId;

    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
          isActive
            ? "bg-white shadow-md ring-1 ring-primary/10 scale-105"
            : "bg-muted/50 hover:bg-muted hover:scale-102"
        )}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm bg-primary">
          <Icon className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className={cn(
          "hidden sm:inline",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}>
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Onglets principaux */}
      <div className="flex items-center gap-1.5">
        {mainTabs.map(renderTab)}
      </div>

      {/* Séparateur et onglet Profil */}
      {profilTab && (
        <>
          <div className="flex-1" />
          <div className="h-6 w-px bg-border/50" />
          {renderTab(profilTab)}
        </>
      )}
    </div>
  );
}
