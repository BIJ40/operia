/**
 * Chips rapides pour filtres période/univers
 * Affichés sous la barre de recherche ouverte
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUICK_PERIOD_CHIPS, QUICK_UNIVERS_CHIPS } from './nlDictionaries';

interface QuickChipsProps {
  currentQuery: string;
  onChipClick: (appendText: string) => void;
  className?: string;
}

export function QuickChips({ currentQuery, onChipClick, className }: QuickChipsProps) {
  const hasQuery = currentQuery.trim().length > 0;
  
  // Détecter si période/univers déjà dans la query
  const queryLower = currentQuery.toLowerCase();
  const hasPeriod = [
    'ce mois', 'cette année', 'mois dernier', 'année dernière', 
    '12 derniers', 'janvier', 'février', 'mars', 'avril', 'mai', 
    'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ].some(p => queryLower.includes(p));
  
  const hasUnivers = [
    'électricité', 'electricite', 'plomberie', 'serrurerie', 'vitrerie'
  ].some(u => queryLower.includes(u));

  return (
    <div className={cn("flex flex-wrap items-center gap-2 px-2 py-1.5", className)}>
      {/* Périodes */}
      {!hasPeriod && (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          {QUICK_PERIOD_CHIPS.map((chip) => (
            <Badge
              key={chip.id}
              variant="outline"
              className={cn(
                "cursor-pointer text-xs px-2 py-0.5 transition-colors",
                "hover:bg-helpconfort-blue/10 hover:border-helpconfort-blue/40 hover:text-helpconfort-blue"
              )}
              onClick={() => onChipClick(chip.label.toLowerCase())}
            >
              {chip.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Séparateur */}
      {!hasPeriod && !hasUnivers && (
        <span className="text-muted-foreground/40">|</span>
      )}

      {/* Univers */}
      {!hasUnivers && (
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
          {QUICK_UNIVERS_CHIPS.map((chip) => (
            <Badge
              key={chip.id}
              variant="outline"
              className={cn(
                "cursor-pointer text-xs px-2 py-0.5 transition-colors",
                "hover:bg-helpconfort-orange/10 hover:border-helpconfort-orange/40 hover:text-helpconfort-orange"
              )}
              onClick={() => onChipClick(`en ${chip.label.toLowerCase()}`)}
            >
              {chip.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Exemples de questions
interface ExampleQueriesProps {
  onExampleClick: (query: string) => void;
  className?: string;
}

export function ExampleQueries({ onExampleClick, className }: ExampleQueriesProps) {
  const examples = [
    'Top 3 apporteurs cette année',
    'CA moyen d\'un électricien',
    'Combien de dossiers ce mois',
    'Taux de SAV',
  ];

  return (
    <div className={cn("text-xs text-muted-foreground space-y-1", className)}>
      <span>Exemples :</span>
      <div className="flex flex-wrap gap-1.5">
        {examples.map((ex, idx) => (
          <button
            key={idx}
            onClick={() => onExampleClick(ex)}
            className={cn(
              "italic hover:text-foreground transition-colors",
              "hover:underline underline-offset-2"
            )}
          >
            "{ex}"
          </button>
        ))}
      </div>
    </div>
  );
}
