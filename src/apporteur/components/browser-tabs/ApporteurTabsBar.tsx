/**
 * ApporteurTabsBar - Barre d'onglets pilule colorés pour l'espace Apporteur
 * Style identique au workspace principal (Warm Pastel avec badges gradient)
 */

import { cn } from '@/lib/utils';
import { useApporteurTabs, APPORTEUR_MODULES } from './ApporteurTabsContext';
import { ACCENT_THEMES, type AccentThemeKey } from '@/lib/accentThemes';

// Mapping des accents par onglet
const TAB_ACCENTS: Record<string, AccentThemeKey> = {
  accueil: 'blue',
  dossiers: 'purple',
  demandes: 'pink',
  divers: 'orange',
  profil: 'green',
};

export function ApporteurTabsBar() {
  const { tabs, activeTabId, setActiveTab } = useApporteurTabs();

  // Séparer l'onglet Profil (aligné à droite)
  const mainTabs = tabs.filter(t => t.id !== 'profil');
  const profilTab = tabs.find(t => t.id === 'profil');

  const tabButtonClass = `
    relative px-3 py-2.5 rounded-t-xl border-2 border-b-0 transition-all duration-300 whitespace-nowrap shrink-0 min-w-0
    data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/50 data-[state=inactive]:text-muted-foreground 
    data-[state=inactive]:hover:bg-primary/10 data-[state=inactive]:hover:border-primary/40
    data-[state=inactive]:hover:scale-105 data-[state=inactive]:hover:-translate-y-0.5 data-[state=inactive]:hover:shadow-md
    data-[state=active]:bg-background data-[state=active]:border-primary/50
    data-[state=active]:z-20 data-[state=active]:-mb-[2px] data-[state=active]:pb-[calc(0.625rem+2px)] data-[state=active]:scale-[1.02]
    cursor-pointer select-none
  `;

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 pt-3 pb-0">
        <div className="flex items-end justify-between gap-4">
          {/* Onglets principaux */}
          <div className="flex flex-nowrap gap-1 items-end flex-1 overflow-x-auto scrollbar-hide">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const accent = ACCENT_THEMES[TAB_ACCENTS[tab.id] || 'neutral'];
              const isActive = tab.id === activeTabId;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-state={isActive ? 'active' : 'inactive'}
                  className={tabButtonClass}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 shrink-0",
                      `bg-gradient-to-br ${accent.gradient}`
                    )}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold tracking-tight truncate max-w-[80px]">
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Onglet Profil aligné à droite */}
          {profilTab && (
            <div className="flex items-end gap-2 shrink-0">
              <div className="h-6 w-px bg-border/50 mb-2" />
              <button
                onClick={() => setActiveTab(profilTab.id)}
                data-state={activeTabId === profilTab.id ? 'active' : 'inactive'}
                className={tabButtonClass}
              >
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 shrink-0",
                    `bg-gradient-to-br ${ACCENT_THEMES[TAB_ACCENTS['profil']].gradient}`
                  )}>
                    <profilTab.icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold tracking-tight">
                    {profilTab.label}
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
        
        {/* Bordure de séparation (les onglets actifs la chevauchent) */}
        <div className="h-[2px] bg-primary/20" />
      </div>
    </div>
  );
}
