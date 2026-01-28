/**
 * Onglets "pills" pour les salariés - style StatsHub
 * Affiche chaque salarié comme un pill avec prénom + initiale nom
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { RHCollaborator } from '@/types/rh-suivi';

interface SalariesPillTabsProps {
  collaborators: RHCollaborator[];
  activeCollaboratorId: string | null; // null = vue d'ensemble
  onSelectCollaborator: (id: string | null) => void;
  openTabs: string[]; // IDs des collaborateurs avec onglets ouverts
  onCloseTab: (id: string) => void;
}

function formatCollaboratorName(c: RHCollaborator): { line1: string; line2: string } {
  const firstName = c.first_name || '';
  const lastInitial = c.last_name?.charAt(0)?.toUpperCase() || '';
  return {
    line1: firstName,
    line2: lastInitial ? `${lastInitial}.` : '',
  };
}

export function SalariesPillTabs({
  collaborators,
  activeCollaboratorId,
  onSelectCollaborator,
  openTabs,
  onCloseTab,
}: SalariesPillTabsProps) {
  // Filtrer les collaborateurs qui ont un onglet ouvert
  const openCollaborators = collaborators.filter(c => openTabs.includes(c.id));

  return (
    <div className="flex items-center gap-1.5 p-2 overflow-x-auto scrollbar-hide bg-muted/30 border-b">
      {/* Pill Vue d'ensemble */}
      <motion.button
        onClick={() => onSelectCollaborator(null)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
          "border shadow-sm min-w-fit",
          activeCollaboratorId === null
            ? "bg-gradient-to-r from-warm-teal/80 to-warm-blue/70 text-white border-transparent shadow-md"
            : "bg-card hover:bg-muted/50 text-muted-foreground border-border/40"
        )}
      >
        <Users className="h-3.5 w-3.5" />
        <span>Tous</span>
      </motion.button>

      {/* Séparateur */}
      {openCollaborators.length > 0 && (
        <div className="h-5 w-px bg-border/50 mx-1" />
      )}

      {/* Pills collaborateurs ouverts */}
      {openCollaborators.map((collab) => {
        const { line1, line2 } = formatCollaboratorName(collab);
        const isActive = activeCollaboratorId === collab.id;
        
        return (
          <motion.div
            key={collab.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative group"
          >
            <button
              onClick={() => onSelectCollaborator(collab.id)}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-1 rounded-xl text-xs transition-all",
                "border shadow-sm min-w-[52px]",
                isActive
                  ? "bg-gradient-to-br from-primary/90 to-primary/70 text-primary-foreground border-transparent shadow-md"
                  : "bg-card hover:bg-muted/50 text-foreground border-border/40"
              )}
            >
              <span className="font-medium leading-tight">{line1}</span>
              <span className={cn(
                "text-[10px] leading-tight",
                isActive ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {line2}
              </span>
            </button>
            
            {/* Bouton fermer */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(collab.id);
              }}
              className={cn(
                "absolute -top-1 -right-1 h-4 w-4 rounded-full p-0",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "bg-destructive/80 hover:bg-destructive text-destructive-foreground"
              )}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}
