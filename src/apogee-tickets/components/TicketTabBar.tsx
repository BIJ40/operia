/**
 * Barre d'onglets style navigateur pour la vue Liste
 * Onglet "LISTE" fixe à gauche + tickets ouverts à droite
 * Style "folder tab" avec bordure continue vers le contenu
 */

import { X, Loader2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TicketTab } from '../hooks/useTicketTabs';

interface TicketTabBarProps {
  tabs: TicketTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string | null) => void;
  onTabClose: (tabId: string) => void;
  onCloseAll: () => void;
  isSaving?: boolean;
}

export function TicketTabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onCloseAll,
  isSaving = false,
}: TicketTabBarProps) {
  const isListeActive = activeTabId === null;

  // Determine border color based on active state
  const activeBorderColor = isListeActive ? 'border-sky-400 dark:border-sky-500' : 'border-violet-400 dark:border-violet-500';

  return (
    <div className="flex items-end gap-0 pl-2 pt-2 pr-2 relative overflow-hidden">
      {/* Bordure horizontale du bas - z-0 pour passer DERRIÈRE les onglets */}
      <div className={cn(
        "absolute bottom-0 left-2 right-2 h-[2px] z-0",
        isListeActive ? "bg-sky-400 dark:bg-sky-500" : "bg-violet-400 dark:bg-violet-500"
      )} />
      
      {/* Onglet LISTE - toujours visible et fixe */}
      <button
        onClick={() => onTabClick(null)}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all shrink-0 rounded-t-xl relative z-10",
          isListeActive
            ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-2 border-b-0 border-sky-400 dark:border-sky-500"
            : "bg-slate-100/80 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80"
        )}
      >
        <List className={cn("h-4 w-4", isListeActive && "text-sky-600 dark:text-sky-400")} />
        LISTE
        {/* Masque la ligne de fond sous l'onglet actif */}
        {isListeActive && (
          <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-sky-50 dark:bg-sky-950/50" />
        )}
      </button>
      
      {/* Séparateur vertical */}
      {tabs.length > 0 && (
        <div className="flex items-center mx-3 shrink-0 mb-1">
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
        </div>
      )}
      
      {/* Onglets tickets + indicateurs */}
      <div className="flex items-end gap-1 flex-1 min-w-0">
        <div className="flex items-end gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={cn(
                  "group flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all shrink-0 rounded-t-xl relative z-10",
                  isActive
                    ? "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-2 border-b-0 border-violet-400 dark:border-violet-500"
                    : "bg-slate-100/60 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-700/60"
                )}
              >
                <span className={cn(
                  "font-mono text-xs",
                  isActive && "text-violet-700 dark:text-violet-300 font-semibold"
                )}>
                  {tab.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className={cn(
                    "p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors",
                    "opacity-0 group-hover:opacity-100 focus:opacity-100",
                    isActive && "opacity-70"
                  )}
                  title="Fermer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {/* Masque la ligne de fond sous l'onglet actif */}
                {isActive && (
                  <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-violet-50 dark:bg-violet-950/50" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Indicateur de sauvegarde + fermer tout - maintenant dans le flux */}
        <div className="flex items-center gap-2 shrink-0 mb-1 ml-2">
          {isSaving ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          ) : tabs.length > 0 ? (
            <span className="text-xs text-green-600">✓</span>
          ) : null}
          
          {tabs.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive h-6 px-2"
              onClick={onCloseAll}
            >
              Tout fermer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}