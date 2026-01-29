/**
 * DiversTabContent (renommé "Outils" dans l'UI) - Contenu de l'onglet Outils
 * 
 * Navigation à deux niveaux :
 * - Niveau 1 (Pill tabs colorés) : Apporteurs, Administratif, Parc
 * - Niveau 2 (Folder tabs) : Sous-onglets spécifiques
 * 
 * Design: Warm Pastel theme avec navigation folder
 */

import { lazy, Suspense, useState } from 'react';
import { 
  FileText, Users2, Loader2, Users, CalendarDays, 
  Radar, Car, FolderOpen, Settings, Eye
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { cn } from '@/lib/utils';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';

// Lazy loaded components
const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const DocGenPage = lazy(() => import('@/pages/rh/DocGenPage'));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));
const VeilleApporteursPage = lazy(() => import('@/pages/VeilleApporteursPage'));
const VehiculesTabContent = lazy(() => import('@/components/unified/tabs/VehiculesTabContent'));

// Types pour les niveaux de navigation
type OutilsMainTab = 'actions' | 'apporteurs' | 'administratif' | 'parc';
type ApporteursSubTab = 'espace' | 'veille';
type AdminSubTab = 'reunions' | 'plannings' | 'documents';

// Configuration des onglets principaux (niveau 1)
const MAIN_TABS: PillTabConfig[] = [
  { id: 'actions', label: 'Actions', icon: Settings, accent: 'blue' },
  { id: 'apporteurs', label: 'Apporteurs', icon: Users, accent: 'purple' },
  { id: 'administratif', label: 'Administratif', icon: FolderOpen, accent: 'orange' },
  { id: 'parc', label: 'Parc', icon: Car, accent: 'green' },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    </div>
  );
}

// Style "folder" pour les sous-onglets
const folderTabClass = `
  relative px-4 py-2 rounded-t-lg border-2 border-b-0 transition-all duration-200 whitespace-nowrap
  bg-muted/40 border-border/50 text-muted-foreground text-sm font-medium
  hover:bg-background/80 hover:text-foreground
  data-[state=active]:bg-background data-[state=active]:border-primary/40 data-[state=active]:text-foreground
  data-[state=active]:z-10 data-[state=active]:-mb-[2px] data-[state=active]:pb-[calc(0.5rem+2px)]
`;

interface FolderTabsProps {
  tabs: { id: string; label: string; icon: React.ElementType }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

function FolderTabs({ tabs, activeTab, onTabChange }: FolderTabsProps) {
  return (
    <div className="mb-0">
      <div className="flex gap-1 items-end">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              data-state={activeTab === tab.id ? 'active' : 'inactive'}
              onClick={() => onTabChange(tab.id)}
              className={folderTabClass}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="border-t-2 border-primary/40 bg-background rounded-tr-xl" />
    </div>
  );
}

// Sous-onglets Apporteurs
function ApporteursSection() {
  const [subTab, setSubTab] = useSessionState<ApporteursSubTab>('outils_apporteurs_sub', 'espace');
  
  const tabs = [
    { id: 'espace', label: 'Espace', icon: Eye },
    { id: 'veille', label: 'Veille', icon: Radar },
  ];

  return (
    <div className="space-y-0">
      <FolderTabs tabs={tabs} activeTab={subTab} onTabChange={(t) => setSubTab(t as ApporteursSubTab)} />
      <div className="bg-background rounded-b-xl rounded-tr-xl border-2 border-t-0 border-primary/40 p-4">
        {subTab === 'espace' && (
          <Suspense fallback={<LoadingFallback />}>
            <MesApporteursTab />
          </Suspense>
        )}
        {subTab === 'veille' && (
          <Suspense fallback={<LoadingFallback />}>
            <VeilleApporteursPage />
          </Suspense>
        )}
      </div>
    </div>
  );
}

// Sous-onglets Administratif
function AdministratifSection() {
  const [subTab, setSubTab] = useSessionState<AdminSubTab>('outils_admin_sub', 'reunions');
  
  const tabs = [
    { id: 'reunions', label: 'Réunions', icon: Users2 },
    { id: 'plannings', label: 'Plannings', icon: CalendarDays },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="space-y-0">
      <FolderTabs tabs={tabs} activeTab={subTab} onTabChange={(t) => setSubTab(t as AdminSubTab)} />
      <div className="bg-background rounded-b-xl rounded-tr-xl border-2 border-t-0 border-primary/40 p-4">
        {subTab === 'reunions' && (
          <Suspense fallback={<LoadingFallback />}>
            <RHMeetingsPage />
          </Suspense>
        )}
        {subTab === 'plannings' && (
          <Suspense fallback={<LoadingFallback />}>
            <PlanningHebdo />
          </Suspense>
        )}
        {subTab === 'documents' && (
          <Suspense fallback={<LoadingFallback />}>
            <DocGenPage />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function DiversTabContent() {
  const [activeMainTab, setActiveMainTab] = useSessionState<OutilsMainTab>('outils_main_tab', 'actions');

  return (
    <div className="py-6 px-2 sm:px-4 space-y-6">
      <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as OutilsMainTab)}>
        <PillTabsList tabs={MAIN_TABS} />

        <TabsContent value="actions" className="mt-6 animate-fade-in">
          <ActionsAMenerTab />
        </TabsContent>

        <TabsContent value="apporteurs" className="mt-6 animate-fade-in">
          <ApporteursSection />
        </TabsContent>

        <TabsContent value="administratif" className="mt-6 animate-fade-in">
          <AdministratifSection />
        </TabsContent>

        <TabsContent value="parc" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <VehiculesTabContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
