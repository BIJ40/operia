import { useMemo } from 'react';
import { Home } from 'lucide-react';
import { HEADER_NAV_GROUPS } from '@/config/headerNavigation';
import { HeaderNavDropdown } from './HeaderNavDropdown';
import { MobileNavMenu } from './MobileNavMenu';
import { ProfileMenu } from '@/components/unified/workspace/ProfileMenu';
import type { UnifiedTab } from '@/components/unified/workspace/types';
import { useModuleLabels } from '@/hooks/useModuleLabels';

interface MainHeaderProps {
  activeTab: UnifiedTab;
  setActiveTab: (tab: UnifiedTab) => void;
  visibleTabs: { id: UnifiedTab }[];
  tabButtonClass: string;
}

export function MainHeader({ activeTab, setActiveTab, visibleTabs, tabButtonClass }: MainHeaderProps) {
  const { getLabel } = useModuleLabels();

  const visibleGroups = useMemo(() => {
    const visibleIds = new Set(visibleTabs.map(t => t.id));
    return HEADER_NAV_GROUPS
      .map(group => ({
        ...group,
        // Resolve group label from registry (key = group.tab, e.g. 'pilotage', 'organisation')
        label: getLabel(group.tab, group.label),
        children: group.children
          .filter(child => !child.tab || visibleIds.has(child.tab))
          .map(child => ({
            ...child,
            label: child.scope ? getLabel(child.scope, child.label) : child.label,
          })),
      }))
      .filter(group => group.children.length > 0);
  }, [visibleTabs, getLabel]);

  const pillBase = 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer';
  const pillInactive = 'text-muted-foreground hover:text-foreground hover:bg-muted';

  const ACCENT_ACTIVE: Record<string, string> = {
    blue: 'bg-warm-blue/10 text-warm-blue',
    orange: 'bg-warm-orange/10 text-warm-orange',
    green: 'bg-warm-green/10 text-warm-green',
    purple: 'bg-warm-purple/10 text-warm-purple',
    pink: 'bg-warm-pink/10 text-warm-pink',
    teal: 'bg-warm-teal/10 text-warm-teal',
    red: 'bg-warm-red/10 text-warm-red',
  };

  const ACCENT_DROPDOWN: Record<string, { bg: string; border: string; text: string; hoverBg: string; hoverBorder: string }> = {
    blue: { bg: 'bg-warm-blue/10', border: 'border-warm-blue/15', text: 'text-warm-blue', hoverBg: 'group-hover:bg-warm-blue/15', hoverBorder: 'group-hover:border-warm-blue/30' },
    orange: { bg: 'bg-warm-orange/10', border: 'border-warm-orange/15', text: 'text-warm-orange', hoverBg: 'group-hover:bg-warm-orange/15', hoverBorder: 'group-hover:border-warm-orange/30' },
    green: { bg: 'bg-warm-green/10', border: 'border-warm-green/15', text: 'text-warm-green', hoverBg: 'group-hover:bg-warm-green/15', hoverBorder: 'group-hover:border-warm-green/30' },
    purple: { bg: 'bg-warm-purple/10', border: 'border-warm-purple/15', text: 'text-warm-purple', hoverBg: 'group-hover:bg-warm-purple/15', hoverBorder: 'group-hover:border-warm-purple/30' },
    pink: { bg: 'bg-warm-pink/10', border: 'border-warm-pink/15', text: 'text-warm-pink', hoverBg: 'group-hover:bg-warm-pink/15', hoverBorder: 'group-hover:border-warm-pink/30' },
    teal: { bg: 'bg-warm-teal/10', border: 'border-warm-teal/15', text: 'text-warm-teal', hoverBg: 'group-hover:bg-warm-teal/15', hoverBorder: 'group-hover:border-warm-teal/30' },
    red: { bg: 'bg-warm-red/10', border: 'border-warm-red/15', text: 'text-warm-red', hoverBg: 'group-hover:bg-warm-red/15', hoverBorder: 'group-hover:border-warm-red/30' },
  };

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
              className={`${pillBase} ${activeTab === 'accueil' ? ACCENT_ACTIVE['blue'] : pillInactive}`}
            >
              <Home className="w-4 h-4" />
              <span>{getLabel('accueil', 'Accueil')}</span>
            </button>

            {visibleGroups.map((group) => (
              <HeaderNavDropdown
                key={group.label}
                group={group}
                isActive={group.children.some(c => c.tab === activeTab)}
                onSelect={setActiveTab}
                pillBase={pillBase}
                pillActive={ACCENT_ACTIVE[group.accent || 'blue']}
                pillInactive={pillInactive}
                accentDropdown={ACCENT_DROPDOWN[group.accent || 'blue']}
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
