/**
 * Onglets "pills" pour les salariés - style StatsHub
 * Affiche chaque salarié comme un pill avec prénom + initiale nom
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RHCollaborator } from '@/types/rh-suivi';

interface SalariesPillTabsProps {
  collaborators: RHCollaborator[];
  activeCollaboratorId: string | null; // null = vue d'ensemble
  onSelectCollaborator: (id: string | null) => void;
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
}: SalariesPillTabsProps) {
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
      {collaborators.length > 0 && (
        <div className="h-5 w-px bg-border/50 mx-1" />
      )}

      {/* Pills de tous les collaborateurs */}
      {collaborators.map((collab, index) => {
        const { line1, line2 } = formatCollaboratorName(collab);
        const isActive = activeCollaboratorId === collab.id;
        const colorVar = COLLAB_PILL_COLORS[index % COLLAB_PILL_COLORS.length];
        
        return (
          <motion.button
            key={collab.id}
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
        );
      })}
    </div>
  );
}
