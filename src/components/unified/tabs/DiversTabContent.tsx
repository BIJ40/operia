/**
 * DiversTabContent (renommé "Outils" dans l'UI) - Contenu de l'onglet Outils
 * 
 * Navigation à deux niveaux :
 * - Niveau 1 (Pill tabs colorés) : Apporteurs, Administratif, Parc
 * - Niveau 2 (Folder tabs) : Sous-onglets spécifiques avec drag-and-drop
 * 
 * Design: Warm Pastel theme avec navigation folder
 */

import { lazy, Suspense, useCallback, useMemo } from 'react';
import { 
  FileText, Users2, Loader2, Users, CalendarDays, 
  Car, FolderOpen, Settings, Eye, Activity, Target, FileCheck, AlertTriangle
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { cn } from '@/lib/utils';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';
import { DraggableTab } from '@/components/unified/DraggableTab';

// Lazy loaded components
const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const AgencyAdminDocuments = lazy(() => import('@/components/outils/AgencyAdminDocuments').then(m => ({ default: m.AgencyAdminDocuments })));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));
// VeilleApporteursPage retiré — veille intégrée dans les fiches individuelles du module Commercial
const VehiculesTabContent = lazy(() => import('@/components/unified/tabs/VehiculesTabContent'));
const PerformanceDashboard = lazy(() => 
  import('@/components/performance/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard }))
);
const ProspectionTabContent = lazy(() => import('@/prospection/pages/ProspectionTabContent'));
const DevisAcceptesView = lazy(() => import('@/apogee-connect/components/DevisAcceptesView'));
const AnomaliesDevisDossierView = lazy(() => import('@/apogee-connect/components/AnomaliesDevisDossierView'));


// Types pour les niveaux de navigation
type OutilsMainTab = 'actions' | 'apporteurs' | 'administratif' | 'parc' | 'performance' | 'prospection' | 'devis-acceptes' | 'anomalies';
type ApporteursSubTab = 'espace';
type AdminSubTab = 'reunions' | 'plannings' | 'documents';

// Configuration des onglets principaux (niveau 1)
// Configuration des onglets principaux avec module requis
const MAIN_TABS_CONFIG: (PillTabConfig & { requiresModule?: ModuleKey })[] = [
  { id: 'actions', label: 'Actions', icon: Settings, accent: 'blue' }, // toujours visible
  { id: 'apporteurs', label: 'Apporteurs', icon: Users, accent: 'purple', requiresModule: 'organisation.apporteurs' },
  { id: 'administratif', label: 'Administratif', icon: FolderOpen, accent: 'orange', requiresModule: 'pilotage.agence' },
  { id: 'parc', label: 'Parc', icon: Car, accent: 'green', requiresModule: 'organisation.parc' },
  { id: 'performance', label: 'Performance', icon: Activity, accent: 'pink', requiresModule: 'pilotage.agence' },
  { id: 'prospection', label: 'Commercial', icon: Target, accent: 'orange', requiresModule: 'prospection' },
  { id: 'devis-acceptes', label: 'Devis acceptés', icon: FileCheck, accent: 'teal', requiresModule: 'pilotage.agence' },
  { id: 'anomalies', label: 'Incohérences', icon: AlertTriangle, accent: 'pink', requiresModule: 'pilotage.agence' },
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

interface FolderTabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface DraggableFolderTabsProps {
  tabs: FolderTabConfig[];
  tabOrder: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onReorder: (newOrder: string[]) => void;
  storageKey: string;
}

function DraggableFolderTabs({ 
  tabs, 
  tabOrder, 
  activeTab, 
  onTabChange, 
  onReorder 
}: DraggableFolderTabsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tabOrder.indexOf(active.id as string);
      const newIndex = tabOrder.indexOf(over.id as string);
      onReorder(arrayMove(tabOrder, oldIndex, newIndex));
    }
  };

  // Trier les tabs selon l'ordre
  const sortedTabs = [...tabs].sort((a, b) => 
    tabOrder.indexOf(a.id) - tabOrder.indexOf(b.id)
  );

  // Palette de couleurs
  const accentColors: Record<string, string> = {
    blue: 'hsl(var(--warm-blue))',
    purple: 'hsl(var(--warm-purple))',
    green: 'hsl(var(--warm-green))',
    orange: 'hsl(var(--warm-orange))',
    pink: 'hsl(var(--warm-pink))',
    teal: 'hsl(var(--warm-teal))',
  };

  // Mapper les indices aux couleurs
  const tabColorMap: Record<string, string> = {};
  sortedTabs.forEach((tab, index) => {
    const colorKeys = Object.keys(accentColors);
    tabColorMap[tab.id] = accentColors[colorKeys[index % colorKeys.length]];
  });

  const activeColor = tabColorMap[activeTab];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tabOrder} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-1 bg-transparent h-auto p-0 mb-0">
          {sortedTabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const colorKeys = Object.keys(accentColors);
            const accentColor = accentColors[colorKeys[index % colorKeys.length]];
            
            return (
              <DraggableTab
                key={tab.id}
                id={tab.id}
                isActive={isActive}
                isDraggable={true}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3",
                  "rounded-t-2xl border-2 border-b-0",
                  "font-medium text-sm transition-all duration-200",
                  "relative -mb-[2px] z-10",
                  isActive 
                    ? "bg-background text-foreground shadow-md" 
                    : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                style={{
                  borderColor: isActive ? accentColor : undefined,
                  boxShadow: isActive ? `0 -2px 8px -2px ${accentColor}40` : undefined,
                }}
              >
                <span 
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-lg",
                    isActive ? "text-white" : "text-muted-foreground"
                  )}
                  style={{
                    backgroundColor: isActive ? accentColor : 'transparent',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>{tab.label}</span>
              </DraggableTab>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Sous-onglets Apporteurs
const APPORTEURS_TABS: FolderTabConfig[] = [
  { id: 'espace', label: 'Espace', icon: Eye },
];
const DEFAULT_APPORTEURS_ORDER = ['espace'];

function ApporteursSection() {
  const [subTab, setSubTab] = useSessionState<ApporteursSubTab>('outils_apporteurs_sub', 'espace');
  const [tabOrder, setTabOrder] = useSessionState<string[]>('outils_apporteurs_order', DEFAULT_APPORTEURS_ORDER);

  const handleReorder = useCallback((newOrder: string[]) => {
    setTabOrder(newOrder);
  }, [setTabOrder]);

  return (
    <div className="space-y-0">
      <DraggableFolderTabs 
        tabs={APPORTEURS_TABS} 
        tabOrder={tabOrder}
        activeTab={subTab} 
        onTabChange={(t) => setSubTab(t as ApporteursSubTab)}
        onReorder={handleReorder}
        storageKey="outils_apporteurs_order"
      />
      <div className="rounded-2xl rounded-tl-none border-2 border-border bg-background p-4 sm:p-6 shadow-sm">
        {subTab === 'espace' && (
          <Suspense fallback={<LoadingFallback />}>
            <MesApporteursTab />
          </Suspense>
        )}
      </div>
    </div>
  );
}

// Sous-onglets Administratif avec module requis
const ADMIN_TABS_CONFIG: (FolderTabConfig & { requiresModule?: ModuleKey })[] = [
  { id: 'reunions', label: 'Réunions', icon: Users2, requiresModule: 'organisation.reunions' },
  { id: 'plannings', label: 'Plannings', icon: CalendarDays, requiresModule: 'organisation.plannings' },
  { id: 'documents', label: 'Documents', icon: FileText, requiresModule: 'mediatheque.documents' },
];

function AdministratifSection() {
  const { hasModule } = usePermissions();
  
  const visibleAdminTabs = useMemo(() => {
    return ADMIN_TABS_CONFIG.filter(tab => {
      if (!tab.requiresModule) return true;
      return hasModule(tab.requiresModule);
    });
  }, [hasModule]);

  const defaultTab = visibleAdminTabs[0]?.id as AdminSubTab ?? 'reunions';
  const [subTab, setSubTab] = useSessionState<AdminSubTab>('outils_admin_sub', defaultTab);
  const defaultOrder = visibleAdminTabs.map(t => t.id);
  const [tabOrder, setTabOrder] = useSessionState<string[]>('outils_admin_order', defaultOrder);
  
  // Ensure active tab is still visible
  const effectiveSubTab = visibleAdminTabs.some(t => t.id === subTab) ? subTab : defaultTab;

  const handleReorder = useCallback((newOrder: string[]) => {
    setTabOrder(newOrder);
  }, [setTabOrder]);

  if (visibleAdminTabs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Aucun outil administratif activé.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <DraggableFolderTabs 
        tabs={visibleAdminTabs} 
        tabOrder={tabOrder}
        activeTab={effectiveSubTab} 
        onTabChange={(t) => setSubTab(t as AdminSubTab)}
        onReorder={handleReorder}
        storageKey="outils_admin_order"
      />
      <div className="rounded-2xl rounded-tl-none border-2 border-border bg-background p-4 sm:p-6 shadow-sm">
        {effectiveSubTab === 'reunions' && (
          <Suspense fallback={<LoadingFallback />}>
            <RHMeetingsPage />
          </Suspense>
        )}
        {effectiveSubTab === 'plannings' && (
          <Suspense fallback={<LoadingFallback />}>
            <PlanningHebdo />
          </Suspense>
        )}
        {effectiveSubTab === 'documents' && (
          <Suspense fallback={<LoadingFallback />}>
            <AgencyAdminDocuments />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function DiversTabContent() {
  const [activeMainTab, setActiveMainTab] = useSessionState<OutilsMainTab>('outils_main_tab', 'actions');
  const { hasModule } = usePermissions();

  const visibleTabs = useMemo(() => {
    return MAIN_TABS_CONFIG.filter(tab => {
      if (!tab.requiresModule) return true;
      return hasModule(tab.requiresModule);
    });
  }, [hasModule]);

  return (
    <div className="py-6 px-2 sm:px-4 space-y-6">
      <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as OutilsMainTab)}>
        <PillTabsList tabs={visibleTabs} />

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

        <TabsContent value="performance" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <PerformanceDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="prospection" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <ProspectionTabContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="devis-acceptes" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <DevisAcceptesView />
          </Suspense>
        </TabsContent>

        <TabsContent value="anomalies" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <AnomaliesDevisDossierView />
          </Suspense>
        </TabsContent>

      </Tabs>
    </div>
  );
}
