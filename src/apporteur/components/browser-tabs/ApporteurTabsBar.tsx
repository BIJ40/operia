/**
 * ApporteurTabsBar - Barre d'onglets pilule colorés pour l'espace Apporteur
 * Style identique au workspace principal (Warm Pastel avec badges gradient)
 */

import { cn } from '@/lib/utils';
import { useApporteurTabs, APPORTEUR_MODULES } from './ApporteurTabsContext';

export function ApporteurTabsBar() {
  const { tabs, activeTabId, setActiveTab } = useApporteurTabs();

  // Séparer l'onglet Profil (aligné à droite)
  const mainTabs = tabs.filter(t => t.id !== 'profil');
  const profilTab = tabs.find(t => t.id === 'profil');

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Onglets principaux */}
      <div className="flex items-center gap-1.5">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const accent = ACCENT_THEMES[TAB_ACCENTS[tab.id] || 'neutral'];
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
                isActive
                  ? "bg-white shadow-md ring-1 ring-black/5 scale-105"
                  : "bg-muted/50 hover:bg-muted hover:scale-102"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center shadow-sm",
                `bg-gradient-to-br ${accent.gradient}`
              )}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className={cn(
                "hidden sm:inline",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Séparateur et onglet Profil */}
      {profilTab && (
        <>
          <div className="flex-1" />
          <div className="h-6 w-px bg-border/50" />
          <button
            onClick={() => setActiveTab(profilTab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
              activeTabId === profilTab.id
                ? "bg-white shadow-md ring-1 ring-black/5 scale-105"
                : "bg-muted/50 hover:bg-muted hover:scale-102"
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center shadow-sm",
              `bg-gradient-to-br ${ACCENT_THEMES[TAB_ACCENTS['profil']].gradient}`
            )}>
              <profilTab.icon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={cn(
              "hidden sm:inline",
              activeTabId === profilTab.id ? "text-foreground" : "text-muted-foreground"
            )}>
              {profilTab.label}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
