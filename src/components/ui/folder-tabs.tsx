/**
 * FolderTabsList - Style Folder pour les sous-onglets Admin
 * Onglets qui se connectent visuellement au conteneur de contenu
 */

import * as React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface FolderTabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface FolderTabsListProps {
  tabs: FolderTabConfig[];
  activeTab: string;
  className?: string;
}

export function FolderTabsList({ tabs, activeTab, className }: FolderTabsListProps) {
  return (
    <TabsList className={cn(
      "flex gap-1 bg-transparent h-auto p-0 mb-0",
      className
    )}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.15 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <TabsTrigger 
              value={tab.id}
              className={cn(
                "flex items-center gap-2 px-5 py-3",
                "rounded-t-2xl border-2 border-b-0",
                "font-medium text-sm transition-all duration-200",
                "relative -mb-[2px] z-10",
                isActive 
                  ? "bg-background border-border text-foreground shadow-sm" 
                  : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          </motion.div>
        );
      })}
    </TabsList>
  );
}

interface FolderContentContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function FolderContentContainer({ children, className }: FolderContentContainerProps) {
  return (
    <div className={cn(
      "rounded-2xl rounded-tl-none border-2 border-border bg-background p-4 sm:p-6 shadow-sm",
      className
    )}>
      {children}
    </div>
  );
}
