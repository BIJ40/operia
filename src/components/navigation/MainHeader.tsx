import { useMemo } from 'react';
import { Home } from 'lucide-react';
import { HEADER_NAV_GROUPS } from '@/config/headerNavigation';
import { HeaderNavDropdown } from './HeaderNavDropdown';
import { MobileNavMenu } from './MobileNavMenu';
import { ProfileMenu } from '@/components/unified/workspace/ProfileMenu';
import type { UnifiedTab } from '@/components/unified/workspace/types';

interface MainHeaderProps {
  activeTab: UnifiedTab;
  setActiveTab: (tab: UnifiedTab) => void;
  visibleTabs: { id: UnifiedTab }[];
  tabButtonClass: string;
}

export function MainHeader({ activeTab, setActiveTab, visibleTabs, tabButtonClass }: MainHeaderProps) {
  const visibleGroups = useMemo(() => {
    const visibleIds = new Set(visibleTabs.map(t => t.id));
    return HEADER_NAV_GROUPS
      .map(group => ({
        ...group,
        children: group.children.filter(child => !child.tab || visibleIds.has(child.tab)),
      }))
      .filter(group => group.children.length > 0);
  }, [visibleTabs]);

  const pillBase = 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer';
  const pillActive = 'bg-primary/10 text-primary';
  const pillInactive = 'text-muted-foreground hover:text-foreground hover:bg-muted';

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 print:hidden">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNavMenu groups={visibleGroups} activeTab={activeTab} onSelect={setActiveTab} />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground font-bold text-sm">HC</span>
              </div>
              <span className="text-base font-bold tracking-tight text-foreground hidden sm:inline">HC Services</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('accueil')}
              className={`${pillBase} ${activeTab === 'accueil' ? pillActive : pillInactive}`}
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </button>

            {visibleGroups.map((group) => (
              <HeaderNavDropdown
                key={group.label}
                group={group}
                isActive={group.children.some(c => c.tab === activeTab)}
                onSelect={setActiveTab}
                pillBase={pillBase}
                pillActive={pillActive}
                pillInactive={pillInactive}
              />
            ))}
          </nav>

          {/* Profile */}
          <div className="shrink-0">
            <ProfileMenu tabButtonClass={tabButtonClass} />
          </div>
        </div>
      </div>
    </header>
  );
}
