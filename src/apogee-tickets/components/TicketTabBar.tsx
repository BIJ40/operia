/**
 * Barre d'onglets style navigateur pour la vue Liste
 * Onglet "LISTE" fixe à gauche + optionnel "RETARD" + tickets ouverts à droite
 * Style "folder tab" avec bordure continue vers le contenu
 */

import { X, Loader2, List, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TicketTab } from '../hooks/useTicketTabs';

interface TicketTabBarProps {
  tabs: TicketTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string | null) => void;
  onTabClose: (tabId: string) => void;
  onCloseAll: () => void;
  isSaving?: boolean;
  showLateTab?: boolean;
  isLateTabActive?: boolean;
  onLateTabClick?: () => void;
  lateCount?: number;
}

export function TicketTabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onCloseAll,
  isSaving = false,
  showLateTab = false,
  isLateTabActive = false,
  onLateTabClick,
  lateCount = 0,
}: TicketTabBarProps) {
  const isListeActive = activeTabId === null && !isLateTabActive;
  const isTicketActive = activeTabId !== null && !isLateTabActive;

  return (
    <div className="relative mx-2 pt-2">
      <div className="flex items-end gap-0 relative z-10">
        {/* Onglet LISTE - toujours visible et fixe */}
        <button
          onClick={() => onTabClick(null)}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all shrink-0 rounded-t-xl relative",
            isListeActive
              ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-2 border-b-0 border-sky-400 dark:border-sky-500 mb-[-2px] pb-[calc(0.625rem+2px)]"
              : "bg-slate-100/80 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-transparent mb-[2px]"
          )}
        >
          <List className={cn("h-4 w-4", isListeActive && "text-sky-600 dark:text-sky-400")} />
          LISTE
        </button>

        {/* Onglet RETARD - visible si showLateTab */}
        {showLateTab && (
          <button
            onClick={onLateTabClick}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all shrink-0 rounded-t-xl relative ml-1",
              isLateTabActive
                ? "bg-red-50 dark:bg-red-950/50 text-destructive border-2 border-b-0 border-destructive/50 mb-[-2px] pb-[calc(0.625rem+2px)]"
                : "bg-slate-100/80 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-destructive hover:bg-destructive/5 border border-transparent mb-[2px]"
            )}
          >
            <AlertTriangle className={cn("h-4 w-4", isLateTabActive && "text-destructive")} />
            RETARD
            {lateCount > 0 && (
              <Badge 
                variant="destructive" 
                className={cn(
                  "h-5 min-w-5 px-1.5 text-xs",
                  !isLateTabActive && "animate-pulse"
                )}
              >
                {lateCount}
              </Badge>
            )}
          </button>
        )}
        
        {/* Séparateur vertical */}
        {tabs.length > 0 && (
          <div className="flex items-center mx-3 shrink-0 mb-2">
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
          </div>
        )}
        
        {/* Onglets tickets */}
        <div className="flex items-end gap-1.5 flex-1 min-w-0">
          <div
            className={cn(
              "flex items-end gap-1.5 flex-1 min-w-0",
              "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            )}
          >
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id && !isLateTabActive;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabClick(tab.id)}
                  className={cn(
                    "group flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all shrink-0 rounded-t-xl relative",
                    isActive
                      ? "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-2 border-b-0 border-violet-400 dark:border-violet-500 mb-[-2px] pb-[calc(0.5rem+2px)]"
                      : "bg-slate-100/60 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-700/60 border border-transparent mb-[2px]"
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
                </button>
              );
            })}
          </div>
          
          {/* Indicateur de sauvegarde + fermer tout */}
          <div className="flex items-center gap-1.5 shrink-0 mb-2 ml-1">
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
                className="text-xs text-muted-foreground hover:text-destructive h-6 px-1.5"
                onClick={onCloseAll}
              >
                Tout fermer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
