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

  return (
    <div className="flex items-center gap-0 bg-muted/50 border-b overflow-x-auto">
      {/* Onglet LISTE - toujours visible et fixe */}
      <button
        onClick={() => onTabClick(null)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 shrink-0",
          isListeActive
            ? "bg-background border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <List className="h-4 w-4" />
        LISTE
      </button>
      
      {/* Séparateur vertical */}
      {tabs.length > 0 && (
        <div className="h-6 w-px bg-border mx-1 shrink-0" />
      )}
      
      {/* Onglets tickets */}
      <div className="flex items-center gap-0 flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={cn(
              "group flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 shrink-0",
              activeTabId === tab.id
                ? "bg-background border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <span className="font-mono text-xs">{tab.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className={cn(
                "ml-0.5 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors",
                "opacity-0 group-hover:opacity-100 focus:opacity-100",
                activeTabId === tab.id && "opacity-60"
              )}
              title="Fermer"
            >
              <X className="h-3 w-3" />
            </button>
          </button>
        ))}
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