/**
 * FranchiseurView - Vue dédiée pour les utilisateurs Franchiseur (N3+)
 * Interface complètement séparée avec ses propres onglets
 * 
 * Onglets: Accueil / Periode / Agences / Redevances / Statistiques / Divers / Guides / Ticketing / Aide
 */

import { lazy, Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Home, GitCompare, Building2, Coins, BarChart3,
  MoreHorizontal, BookOpen, Ticket, HelpCircle, Loader2
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { FranchiseurProvider } from '@/franchiseur/contexts/FranchiseurContext';
import { NetworkFiltersProvider } from '@/franchiseur/contexts/NetworkFiltersContext';
import { AiUnifiedProvider } from '@/components/ai';
import { ProfileMenu } from '@/components/unified/workspace/ProfileMenu';
import { cn } from '@/lib/utils';

import { ImageModal } from '@/components/ImageModal';
import { ACCENT_THEMES, type AccentThemeKey } from '@/lib/accentThemes';

// Lazy loaded franchiseur pages
const FranchiseurHome = lazy(() => import('@/franchiseur/pages/FranchiseurHome'));
const FranchiseurComparison = lazy(() => import('@/franchiseur/pages/FranchiseurComparison'));
const FranchiseurAgencies = lazy(() => import('@/franchiseur/pages/FranchiseurAgencies'));
const FranchiseurRoyalties = lazy(() => import('@/franchiseur/pages/FranchiseurRoyalties'));
const FranchiseurStats = lazy(() => import('@/franchiseur/pages/FranchiseurStats'));
const DiversTabContent = lazy(() => import('@/components/unified/tabs/DiversTabContent'));
const GuidesTabContent = lazy(() => import('@/components/unified/tabs/GuidesTabContent'));
const SupportHubTabContent = lazy(() => import('@/components/unified/tabs/AideTabContent'));

type FranchiseurTab = 
  | 'accueil' 
  | 'periode' 
  | 'agences' 
  | 'redevances' 
  | 'statistiques' 
  | 'divers' 
  | 'guides'
  | 'support';

interface TabConfig {
  id: FranchiseurTab;
  label: string;
  icon: React.ElementType;
}

// Ordre fixe des onglets (hors Accueil qui est toujours premier)
const FIXED_TAB_ORDER: FranchiseurTab[] = ['periode', 'agences', 'redevances', 'statistiques', 'divers', 'guides', 'support'];

const ALL_TABS: TabConfig[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'periode', label: 'Période', icon: GitCompare },
  { id: 'agences', label: 'Agences', icon: Building2 },
  { id: 'redevances', label: 'Redevances', icon: Coins },
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'divers', label: 'Divers', icon: MoreHorizontal },
  { id: 'guides', label: 'Guides', icon: BookOpen },
  { id: 'support', label: 'Support', icon: HelpCircle },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function FranchiseurViewContent({ embedded = false }: { embedded?: boolean }) {
  const { isImpersonating } = useImpersonation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Use a different URL param when embedded inside AdminHub to avoid conflict with parent's ?tab=
  const urlParamKey = embedded ? 'fTab' : 'tab';
  
  // Support URL ?tab=XXX (standalone) or ?fTab=XXX (embedded) pour navigation directe
  const urlTab = searchParams.get(urlParamKey) as FranchiseurTab | null;
  const [activeTab, setActiveTabState] = useSessionState<FranchiseurTab>('franchiseur_view_tab', urlTab || 'accueil');
  
  // Synchroniser l'URL quand l'onglet change
  const setActiveTab = useCallback((tab: FranchiseurTab) => {
    setActiveTabState(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'accueil') {
      newParams.delete(urlParamKey);
    } else {
      newParams.set(urlParamKey, tab);
    }
    setSearchParams(newParams, { replace: true });
  }, [setActiveTabState, setSearchParams, searchParams, urlParamKey]);
  
  // Sync depuis URL au mount
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [urlTab]);
  
  // Onglets dans l'ordre fixe (Accueil toujours premier)
  const sortedTabs = useMemo(() => {
    const accueilTab = ALL_TABS.find(t => t.id === 'accueil')!;
    const otherTabs = ALL_TABS.filter(t => t.id !== 'accueil');
    const sorted = [...otherTabs].sort((a, b) => {
      return FIXED_TAB_ORDER.indexOf(a.id) - FIXED_TAB_ORDER.indexOf(b.id);
    });
    return [accueilTab, ...sorted];
  }, []);
  
  // Mettre à jour le titre de la page selon l'onglet actif
  useEffect(() => {
    const activeTabConfig = sortedTabs.find(t => t.id === activeTab);
    const tabLabel = activeTabConfig?.label || 'Accueil';
    document.title = `${tabLabel} - Réseau HelpConfort`;
  }, [activeTab, sortedTabs]);
  
  // Palette pastel tokenisée (même identité visuelle que les tuiles)
  const tabAccent: Record<FranchiseurTab, AccentThemeKey> = {
    accueil: 'blue',
    periode: 'purple',
    agences: 'green',
    redevances: 'orange',
    statistiques: 'pink',
    divers: 'neutral',
    guides: 'teal',
    support: 'cyan',
  };
  
  const tabButtonClass = (_tabId: FranchiseurTab, isActive: boolean) => `
    relative px-3 py-2.5 rounded-t-2xl border-2 border-b-0 transition-all duration-300 whitespace-nowrap shrink-0 min-w-0
    ${isActive 
      ? 'bg-background border-primary/50 border-b-background z-20 -mb-[2px] scale-[1.02] shadow-sm' 
      : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-background hover:border-primary/40 hover:scale-105 hover:-translate-y-0.5 hover:shadow-sm'
    }
  `;
  
  // Calculer le padding top selon les bandeaux actifs
  const topPadding = isImpersonating ? 'pt-10' : '';
  
  return (
    <div className={`min-h-screen bg-background ${topPadding}`}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FranchiseurTab)} className="flex flex-col h-screen">
        {/* Tab bar fixe en haut */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl px-4 pt-3 pb-0">
            <div className="flex items-end justify-between gap-4">
              <TabsList className="h-auto p-0 bg-transparent flex flex-nowrap gap-1 items-end justify-start flex-1 overflow-x-auto scrollbar-hide">
                {sortedTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const accent = ACCENT_THEMES[tabAccent[tab.id]];
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      data-state={isActive ? 'active' : 'inactive'}
                      className={tabButtonClass(tab.id, isActive)}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 shrink-0`}>
                          <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                        <span className="text-xs font-bold tracking-tight truncate max-w-[80px]">{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </TabsList>

              <ProfileMenu tabButtonClass={`
                relative px-3 py-2.5 rounded-t-2xl border-2 border-b-0 transition-all duration-300 whitespace-nowrap shrink-0 min-w-0
                bg-muted/40 border-border/50 text-muted-foreground hover:bg-background hover:border-primary/40 hover:scale-105 hover:-translate-y-0.5 hover:shadow-sm
              `} />
            </div>
          </div>
          {/* Ligne de bordure qui se connecte aux onglets */}
          <div className="container mx-auto max-w-7xl px-4">
            <div className="border-t-2 border-primary/50 bg-background"></div>
          </div>
        </div>
        
        {/* Contenu des onglets */}
        <main id="main-content" className="flex-1 overflow-auto" role="main">
          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="accueil" className="mt-0 h-full">
              <FranchiseurHome />
            </TabsContent>
            
            <TabsContent value="periode" className="mt-0">
              <FranchiseurComparison />
            </TabsContent>
            
            <TabsContent value="agences" className="mt-0">
              <FranchiseurAgencies />
            </TabsContent>
            
            <TabsContent value="redevances" className="mt-0">
              <FranchiseurRoyalties />
            </TabsContent>
            
            <TabsContent value="statistiques" className="mt-0">
              <FranchiseurStats />
            </TabsContent>
            
            <TabsContent value="divers" className="mt-0">
              <DiversTabContent />
            </TabsContent>
            
            <TabsContent value="guides" className="mt-0">
              <GuidesTabContent />
            </TabsContent>
            
            <TabsContent value="support" className="mt-0">
              <SupportHubTabContent />
            </TabsContent>
          </Suspense>
        </main>
      </Tabs>
      
      <ImageModal />
      
    </div>
  );
}

export default function FranchiseurView({ embedded = false }: { embedded?: boolean }) {
  return (
    <FranchiseurProvider>
      <NetworkFiltersProvider>
        <AiUnifiedProvider>
          <TooltipProvider delayDuration={0}>
            <FranchiseurViewContent embedded={embedded} />
          </TooltipProvider>
        </AiUnifiedProvider>
      </NetworkFiltersProvider>
    </FranchiseurProvider>
  );
}
