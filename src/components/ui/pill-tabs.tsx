/**
 * PillTabsList - Style unifié pour les sous-onglets
 * Utilise le même style "folder" que les onglets Admin principaux
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
      "flex flex-wrap justify-start gap-1.5 bg-transparent h-auto p-0",
      className
    )}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        
        return (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.15 }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <TabsTrigger 
              value={tab.id}
              className="admin-main-tab"
            >
              <div className="admin-tab-icon">
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