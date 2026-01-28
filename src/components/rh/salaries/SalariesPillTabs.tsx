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

// Palette de couleurs du thème pour les pills collaborateurs
const COLLAB_PILL_COLORS = [
  '--warm-blue',
  '--warm-orange',
  '--warm-purple',
  '--warm-green',
  '--warm-pink',
  '--warm-teal',
];

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
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "salaries-pill-tab",
          activeCollaboratorId === null && "salaries-pill-tab-active"
        )}
        style={{
          '--pill-color': 'var(--warm-teal)',
        } as React.CSSProperties}
      >
        <Users className="h-3.5 w-3.5" />
        <span>Tous</span>
      </motion.button>

      {/* Séparateur */}
      {openCollaborators.length > 0 && (
        <div className="h-5 w-px bg-border/50 mx-1" />
      )}

      {/* Pills collaborateurs ouverts */}
      {openCollaborators.map((collab, index) => {
        const { line1, line2 } = formatCollaboratorName(collab);
        const isActive = activeCollaboratorId === collab.id;
        const colorVar = COLLAB_PILL_COLORS[index % COLLAB_PILL_COLORS.length];
        
        return (
          <motion.div
            key={collab.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative group"
          >
            <motion.button
              onClick={() => onSelectCollaborator(collab.id)}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "salaries-pill-tab salaries-pill-tab-collab",
                isActive && "salaries-pill-tab-active"
              )}
              style={{
                '--pill-color': `var(${colorVar})`,
              } as React.CSSProperties}
            >
              <span className="font-medium leading-tight">{line1}</span>
              <span className={cn(
                "text-[10px] leading-tight",
                isActive ? "text-white/80" : "text-muted-foreground"
              )}>
                {line2}
              </span>
            </motion.button>
            
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
