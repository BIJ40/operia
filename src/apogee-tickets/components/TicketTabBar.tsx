/**
 * Barre d'onglets pour les tickets ouverts dans la vue Liste
 * Affiche les numéros de tickets et permet de naviguer/fermer
 */

import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TicketTab } from '../hooks/useTicketTabs';

interface TicketTabBarProps {
  tabs: TicketTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
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
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-lg border mb-2 overflow-x-auto">
      {/* Status indicator */}
      <div className="flex items-center gap-1 mr-2 px-2 py-1 text-xs text-muted-foreground shrink-0">
        {isSaving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Sauvegarde...</span>
          </>
        ) : (
          <span className="text-green-600">✓ Sauvegardé</span>
        )}
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={cn(
              "group flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              "hover:bg-background/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeTabId === tab.id
                ? "bg-background shadow-sm border border-border text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="font-mono">{tab.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className={cn(
                "ml-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors",
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
      
      {/* Close all button */}
      {tabs.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs text-muted-foreground hover:text-destructive h-7"
          onClick={onCloseAll}
        >
          Tout fermer
        </Button>
      )}
    </div>
  );
}
