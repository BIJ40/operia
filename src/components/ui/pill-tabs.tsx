/**
 * PillTabsList - Style unifié pour les sous-onglets en pills
 * Chaque pill a une couleur pastel différente avec animations
 */

import * as React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface PillTabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface PillTabsListProps {
  tabs: PillTabConfig[];
  className?: string;
}

// Palette de couleurs utilisant les tokens du design system
const PILL_COLOR_PALETTE = [
  { name: 'blue', cssVar: '--warm-blue' },
  { name: 'orange', cssVar: '--warm-orange' },
  { name: 'purple', cssVar: '--warm-purple' },
  { name: 'green', cssVar: '--warm-green' },
  { name: 'pink', cssVar: '--warm-pink' },
  { name: 'teal', cssVar: '--warm-teal' },
];

export function PillTabsList({ tabs, className }: PillTabsListProps) {
  return (
    <TabsList className={cn(
      "flex flex-wrap justify-center gap-2 bg-transparent h-auto p-2",
      className
    )}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const color = PILL_COLOR_PALETTE[index % PILL_COLOR_PALETTE.length];
        
        return (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <TabsTrigger 
              value={tab.id}
              className="group pill-tab-trigger"
              style={{
                '--pill-color': `var(${color.cssVar})`,
              } as React.CSSProperties}
            >
              <Icon className="w-4 h-4 transition-transform duration-200 group-hover:rotate-6" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          </motion.div>
        );
      })}
    </TabsList>
  );
}