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
  // Filter groups based on visible tabs
  const visibleGroups = useMemo(() => {
    const visibleIds = new Set(visibleTabs.map(t => t.id));
    return HEADER_NAV_GROUPS
      .map(group => ({
        ...group,
        children: group.children.filter(child => !child.tab || visibleIds.has(child.tab)),
      }))
      .filter(group => group.children.length > 0);
  }, [visibleTabs]);

  return (
    <header className="sticky top-0 z-50 h-16 bg-background/95 backdrop-blur-md border-b border-border shadow-sm print:hidden">
      <div className="container mx-auto max-w-7xl h-full px-4 flex items-center gap-4">
        {/* Mobile hamburger */}
        <MobileNavMenu groups={visibleGroups} activeTab={activeTab} onSelect={setActiveTab} />

        {/* Logo / Home */}
        <button
          type="button"
          onClick={() => setActiveTab('accueil')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-150 shrink-0
            ${activeTab === 'accueil' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-sm font-bold tracking-tight hidden sm:inline">Accueil</span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0">
          {visibleGroups.map((group) => (
            <HeaderNavDropdown
              key={group.label}
              group={group}
              isActive={group.children.some(c => c.tab === activeTab)}
              onSelect={setActiveTab}
            />
          ))}
        </nav>

        {/* Profile */}
        <div className="ml-auto shrink-0">
          <ProfileMenu tabButtonClass={tabButtonClass} />
        </div>
      </div>
    </header>
  );
}
