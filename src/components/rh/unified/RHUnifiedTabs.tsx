import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TAB_CONFIG, RHTabId } from './RHUnifiedTableColumns';
import { 
  User, 
  UserCircle, 
  Shield, 
  Award, 
  Car, 
  Key, 
  FolderOpen 
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  User,
  UserCircle,
  Shield,
  Award,
  Car,
  Key,
  FolderOpen,
};

interface RHUnifiedTabsProps {
  activeTab: RHTabId;
  onTabChange: (tab: RHTabId) => void;
  alertCounts?: Partial<Record<RHTabId, number>>;
}

export function RHUnifiedTabs({ activeTab, onTabChange, alertCounts = {} }: RHUnifiedTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as RHTabId)} className="w-full">
      <TabsList className="flex h-10 w-full justify-start gap-0.5 bg-muted/40 p-1 rounded-lg">
        {TAB_CONFIG.map((tab) => {
          const IconComponent = ICON_MAP[tab.icon];
          const alertCount = alertCounts[tab.id] || 0;
          
          return (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className={cn(
                "relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md",
                "transition-all duration-200",
                "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                "data-[state=active]:text-primary",
                "hover:bg-background/50",
                "min-w-0"
              )}
            >
              {IconComponent && (
                <IconComponent className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground"
                )} />
              )}
              
              <span className="truncate">{tab.label}</span>
              
              {/* Badge d'alerte */}
              {alertCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold animate-pulse"
                >
                  {alertCount > 9 ? '9+' : alertCount}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
