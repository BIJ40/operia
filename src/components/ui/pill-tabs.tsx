/**
 * PillTabsList - Style unifié pour les sous-onglets en pills
 * Réutilisable sur toutes les pages avec onglets internes
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

export function PillTabsList({ tabs, className }: PillTabsListProps) {
  return (
    <TabsList className={cn(
      "flex flex-wrap justify-center gap-2 bg-transparent h-auto p-2",
      className
    )}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        return (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <TabsTrigger 
              value={tab.id} 
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                bg-background border border-border rounded-xl shadow-sm
                transition-all duration-300 ease-out
                hover:scale-105 hover:shadow-md hover:border-primary/30 hover:bg-primary/5
                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground 
                data-[state=active]:border-primary data-[state=active]:shadow-lg 
                data-[state=active]:scale-105"
            >
              <Icon className="w-4 h-4 transition-transform duration-200" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          </motion.div>
        );
      })}
    </TabsList>
  );
}
