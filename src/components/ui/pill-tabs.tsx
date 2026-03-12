/**
 * PillTabsList - Style unifié pour les sous-onglets
 * Utilise le thème "Warm Pastel" avec couleurs vives
 */

import * as React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useDomainAccent, getAccentColors } from '@/contexts/DomainAccentContext';

export interface PillTabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Optionnel: couleur d'accent (blue, purple, green, orange, pink, teal) */
  accent?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal';
  /** Optionnel: désactiver l'onglet */
  disabled?: boolean;
}

// Mapping des couleurs d'accent vers les classes Tailwind
const ACCENT_STYLES: Record<string, { active: string; icon: string }> = {
  blue: {
    active: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-warm-blue/20 data-[state=active]:to-warm-teal/15 data-[state=active]:border-warm-blue/40 data-[state=active]:text-warm-blue',
    icon: 'bg-warm-blue/15 text-warm-blue group-data-[state=active]:bg-warm-blue/25',
  },
  purple: {
    active: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-warm-purple/20 data-[state=active]:to-warm-pink/15 data-[state=active]:border-warm-purple/40 data-[state=active]:text-warm-purple',
    icon: 'bg-warm-purple/15 text-warm-purple group-data-[state=active]:bg-warm-purple/25',
  },
  green: {
    active: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-warm-green/20 data-[state=active]:to-warm-teal/15 data-[state=active]:border-warm-green/40 data-[state=active]:text-warm-green',
    icon: 'bg-warm-green/15 text-warm-green group-data-[state=active]:bg-warm-green/25',
  },
  orange: {
    active: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-warm-orange/20 data-[state=active]:to-accent/15 data-[state=active]:border-warm-orange/40 data-[state=active]:text-warm-orange',
    icon: 'bg-warm-orange/15 text-warm-orange group-data-[state=active]:bg-warm-orange/25',
  },
  pink: {
    active: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-warm-pink/20 data-[state=active]:to-warm-purple/15 data-[state=active]:border-warm-pink/40 data-[state=active]:text-warm-pink',
    icon: 'bg-warm-pink/15 text-warm-pink group-data-[state=active]:bg-warm-pink/25',
  },
  teal: {
    active: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-warm-teal/20 data-[state=active]:to-warm-blue/15 data-[state=active]:border-warm-teal/40 data-[state=active]:text-warm-teal',
    icon: 'bg-warm-teal/15 text-warm-teal group-data-[state=active]:bg-warm-teal/25',
  },
};

// Couleurs cycliques par défaut
const DEFAULT_ACCENTS: Array<'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal'> = [
  'blue', 'purple', 'green', 'orange', 'pink', 'teal'
];

interface PillTabsListProps {
  tabs: PillTabConfig[];
  className?: string;
  variant?: 'pill' | 'switcher';
}

export function PillTabsList({ tabs, className, variant = 'pill' }: PillTabsListProps) {
  if (variant === 'switcher') {
    return (
      <div className="flex justify-center">
        <TabsList className={cn(
          "inline-flex items-center gap-0.5 bg-muted/30 rounded-xl border border-border/60 p-1 h-auto",
          className
        )}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isDisabled = tab.disabled === true;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={isDisabled}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all",
                  "text-muted-foreground bg-transparent border border-transparent",
                  "hover:text-foreground hover:bg-muted/50",
                  "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-border/50 data-[state=active]:text-foreground",
                  isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    );
  }

  return (
    <TabsList className={cn(
      "flex flex-wrap justify-center gap-2 bg-transparent h-auto p-0",
      className
    )}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const accent = tab.accent || DEFAULT_ACCENTS[index % DEFAULT_ACCENTS.length];
        const styles = ACCENT_STYLES[accent];
        const isDisabled = tab.disabled === true;
        
        return (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: isDisabled ? 0.5 : 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.15 }}
            whileHover={isDisabled ? {} : { scale: 1.03, y: -2 }}
            whileTap={isDisabled ? {} : { scale: 0.97 }}
          >
            <TabsTrigger 
              value={tab.id}
              disabled={isDisabled}
              className={cn(
                "group flex items-center gap-2 px-4 py-2.5 rounded-xl",
                "border-2 border-border/50 bg-card/80 backdrop-blur-sm",
                "text-muted-foreground font-medium text-sm",
                "shadow-sm hover:shadow-md hover:border-border",
                "transition-all duration-200",
                styles.active,
                "data-[state=active]:shadow-lg data-[state=active]:font-semibold",
                isDisabled && "opacity-50 cursor-not-allowed hover:shadow-sm hover:border-border/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg",
                "transition-colors duration-200",
                styles.icon,
                isDisabled && "opacity-60"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          </motion.div>
        );
      })}
    </TabsList>
  );
}