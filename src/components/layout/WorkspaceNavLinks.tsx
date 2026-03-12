/**
 * WorkspaceNavLinks — Barre de navigation compacte pour les sous-pages
 * Affiche les mêmes onglets que le WorkspaceTabBar mais sous forme de liens
 */

import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, BarChart3, ShoppingCart, Users, Headphones, Shield, FolderOpen,
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { filterWorkspaceTabs } from '@/lib/filterNavigationByPermissions';
import { ACCENT_THEMES, type AccentThemeKey } from '@/lib/accentThemes';
import { ProfileMenu } from '@/components/unified/workspace/ProfileMenu';
import type { TabConfig, UnifiedTab } from '@/components/unified/workspace/types';

const TAB_ACCENTS: Record<UnifiedTab, AccentThemeKey> = {
  accueil: 'blue',
  pilotage: 'pink',
  commercial: 'orange',
  organisation: 'green',
  documents: 'red',
  support: 'cyan',
  admin: 'purple',
};

const ALL_TABS: TabConfig[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'pilotage', label: 'Pilotage', icon: BarChart3, requiresOption: { module: 'pilotage.statistiques' }, altModules: ['pilotage.agence'] },
  { id: 'commercial', label: 'Commercial', icon: ShoppingCart, requiresOption: { module: 'prospection' }, altModules: ['pilotage.agence', 'commercial.realisations'] },
  { id: 'organisation', label: 'Organisation', icon: Users, requiresOption: { module: 'organisation.salaries' }, altModules: ['organisation.parc', 'organisation.apporteurs', 'organisation.plannings', 'organisation.reunions', 'pilotage.agence'] },
  { id: 'documents', label: 'Documents', icon: FolderOpen, requiresOption: { module: 'mediatheque.documents' } },
  { id: 'support', label: 'Support', icon: Headphones },
  { id: 'admin', label: 'Admin', icon: Shield, requiresOption: { module: 'admin_plateforme' } },
];

interface WorkspaceNavLinksProps {
  /** Onglet actif à mettre en surbrillance */
  activeTab?: string;
}

export function WorkspaceNavLinks({ activeTab }: WorkspaceNavLinksProps) {
  const navigate = useNavigate();
  const { globalRole, hasModule, hasModuleOption } = usePermissions();
  const effectiveAuth = useEffectiveAuth();
  
  const effectiveIsPlatformAdmin = effectiveAuth.globalRole === 'superadmin' || effectiveAuth.globalRole === 'platform_admin';
  const realIsPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';

  const permCheckers = useMemo(() => ({
    hasModule: hasModule as (key: any) => boolean,
    hasModuleOption: hasModuleOption as (key: any, opt: string) => boolean,
    isPlatformAdmin: effectiveIsPlatformAdmin,
  }), [hasModule, hasModuleOption, effectiveIsPlatformAdmin]);

  const visibleTabs = useMemo(
    () => filterWorkspaceTabs(ALL_TABS, permCheckers, realIsPlatformAdmin),
    [permCheckers, realIsPlatformAdmin]
  );

  const handleClick = (tabId: UnifiedTab) => {
    if (tabId === 'accueil') {
      navigate('/');
    } else {
      navigate(`/?tab=${tabId}`);
    }
  };

  const tabButtonClass = `
    relative px-4 py-3 rounded-t-xl border-2 border-b-0 transition-all duration-300 whitespace-nowrap shrink-0 min-w-0 cursor-pointer
    bg-muted/40 border-border/50 text-muted-foreground 
    hover:bg-primary/10 hover:border-primary/40
    hover:scale-105 hover:-translate-y-0.5 hover:shadow-md
  `;

  const activeButtonClass = `
    relative px-4 py-3 rounded-t-xl border-2 border-b-0 transition-all duration-300 whitespace-nowrap shrink-0 min-w-0 cursor-pointer
    bg-background border-primary/50
    z-20 -mb-[2px] pb-[calc(0.75rem+2px)] scale-[1.02]
  `;

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm print:hidden">
      <div className="container mx-auto max-w-7xl px-4 pt-3 pb-0">
        <div className="flex items-end justify-between gap-4">
          <div className="h-auto p-0 bg-transparent flex flex-nowrap gap-1 items-end justify-start flex-1 overflow-x-auto scrollbar-hide">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const accent = ACCENT_THEMES[TAB_ACCENTS[tab.id]];
              const isActive = tab.id === activeTab;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleClick(tab.id)}
                  className={isActive ? activeButtonClass : tabButtonClass}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${
                      tab.id === 'accueil' 
                        ? 'from-helpconfort-blue to-helpconfort-blue/70' 
                        : accent.gradient
                    } flex items-center justify-center shadow-sm transition-transform shrink-0`}>
                      <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <ProfileMenu tabButtonClass={tabButtonClass} />
        </div>
      </div>
      <div className="container mx-auto max-w-7xl px-4">
        <div className="border-t-2 border-primary/50 bg-background"></div>
      </div>
    </div>
  );
}
