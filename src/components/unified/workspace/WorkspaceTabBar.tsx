/**
 * WorkspaceTabBar - Static tab bar (fixed order, no drag-and-drop)
 */
import { Home } from 'lucide-react';
import { TabsList } from '@/components/ui/tabs';
import { ACCENT_THEMES, type AccentThemeKey } from '@/lib/accentThemes';
import { ProfileMenu } from './ProfileMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissionsV2Safe } from '@/contexts/PermissionsContextV2';
import type { TabConfig, UnifiedTab } from './types';
import { cn } from '@/lib/utils';

// Couleurs par onglet
const TAB_ACCENTS: Record<UnifiedTab, AccentThemeKey> = {
  accueil: 'blue',
  pilotage: 'pink',
  commercial: 'orange',
  organisation: 'green',
  relations: 'purple',
  documents: 'red',
  support: 'cyan',
  ticketing: 'amber',
  admin: 'purple',
};

interface WorkspaceTabBarProps {
  tabs: TabConfig[];
  activeTab: UnifiedTab;
  tabButtonClass: string;
  isTabAccessible: (tab: TabConfig) => boolean;
  isTabVisuallyDisabled: (tab: TabConfig) => boolean;
  setActiveTab: (tab: UnifiedTab) => void;
}

export function WorkspaceTabBar({
  tabs,
  activeTab,
  tabButtonClass,
  isTabAccessible,
  isTabVisuallyDisabled,
  setActiveTab,
}: WorkspaceTabBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm print:hidden">
      <div className="container mx-auto max-w-app px-4 pt-3 pb-0">
        <div className="flex items-end justify-between gap-4">
          <TabsList className="h-auto p-0 bg-transparent flex flex-nowrap gap-1 items-end justify-start flex-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const accent = ACCENT_THEMES[TAB_ACCENTS[tab.id]];
              const accessible = isTabAccessible(tab);
              const disabled = isTabVisuallyDisabled(tab);

              return (
                <button
                  key={tab.id}
                  onClick={() => accessible ? setActiveTab(tab.id) : undefined}
                  disabled={disabled}
                  data-state={activeTab === tab.id ? 'active' : 'inactive'}
                  className={cn(
                    tabButtonClass,
                    disabled && 'opacity-40 cursor-not-allowed hover:!scale-100 hover:!translate-y-0 hover:!shadow-none hover:!bg-muted/40'
                  )}
                  aria-disabled={disabled}
                  title={disabled ? 'Module non disponible' : undefined}
                >
                  <div className={`flex items-center gap-2 ${disabled ? 'opacity-40' : ''}`}>
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tab.id === 'accueil' ? 'from-helpconfort-blue to-helpconfort-blue/70' : accent.gradient} flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 shrink-0`}>
                      <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </TabsList>

          <ProfileMenu tabButtonClass={tabButtonClass} />
        </div>
      </div>
      <div className="container mx-auto max-w-app px-4">
        <div className="border-t-2 border-primary/50 bg-background"></div>
      </div>
    </div>
  );
}
