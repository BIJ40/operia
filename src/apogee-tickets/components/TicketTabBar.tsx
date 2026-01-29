/**
 * Barre d'onglets style navigateur pour la vue Liste
 * Onglet "LISTE" fixe à gauche + tickets ouverts à droite
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

  // Couleur d'accent pour l'onglet actif
  const getActiveColor = () => {
    if (isListeActive) return 'sky';
    return 'violet'; // Couleur pour les tickets
  };

  const activeColor = getActiveColor();

  return (
    <div className="flex items-center gap-0 bg-gradient-to-r from-slate-50/80 via-slate-100/50 to-slate-50/80 dark:from-slate-800/40 dark:via-slate-800/60 dark:to-slate-800/40 overflow-x-auto px-2 pt-2">
      {/* Onglet LISTE - toujours visible et fixe */}
      <button
        onClick={() => onTabClick(null)}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all shrink-0 rounded-t-xl relative",
          isListeActive
            ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-md border-2 border-b-0 border-sky-300 dark:border-sky-600"
            : "bg-slate-100/80 dark:bg-slate-700/50 border-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80"
        )}
      >
        <List className={cn("h-4 w-4", isListeActive && "text-sky-500")} />
        LISTE
        {/* Prolongement de la bordure vers le bas */}
        {isListeActive && (
          <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-white dark:bg-slate-900" />
        )}
      </button>
      
      {/* Séparateur vertical accentué */}
      {tabs.length > 0 && (
        <div className="flex items-center mx-3 shrink-0">
          <div className="h-8 w-0.5 bg-gradient-to-b from-violet-200 via-violet-300 to-violet-200 dark:from-violet-700 dark:via-violet-600 dark:to-violet-700 rounded-full" />
        </div>
      )}
      
      {/* Onglets tickets */}
      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={cn(
                "group flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all shrink-0 rounded-t-xl relative",
                isActive
                  ? "bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-md border-2 border-b-0 border-violet-300 dark:border-violet-600"
                  : "bg-slate-100/60 dark:bg-slate-700/40 border-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-700/60"
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
              {/* Prolongement de la bordure vers le bas */}
              {isActive && (
                <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-white dark:bg-slate-900" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Indicateur de sauvegarde + fermer tout */}
      <div className="flex items-center gap-2 ml-auto px-3 shrink-0">
        {isSaving ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sauvegarde...
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
  );
}