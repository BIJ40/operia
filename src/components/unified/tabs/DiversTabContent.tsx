/**
 * DiversTabContent (renommé "Outils" dans l'UI) - Contenu de l'onglet Outils
 * 
 * Navigation à deux niveaux :
 * - Niveau 1 (Pill tabs colorés) : Apporteurs, Administratif, Parc
 * - Niveau 2 (Folder tabs) : Sous-onglets spécifiques (ordre fixe)
 */

import { lazy, Suspense, useMemo } from 'react';
import { 
  FileText, Users2, Loader2, Users, CalendarDays, 
  Car, FolderOpen, Settings, Eye, Activity, Target, AlertTriangle, MapPin
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { cn } from '@/lib/utils';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';

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

const AnomaliesDevisDossierView = lazy(() => import('@/apogee-connect/components/AnomaliesDevisDossierView'));
const ZonesDeplacementTab = lazy(() => import('@/components/organisation/ZonesDeplacementTab'));

// Types pour les niveaux de navigation
type OutilsMainTab = 'actions' | 'apporteurs' | 'administratif' | 'parc' | 'performance' | 'prospection' | 'anomalies';
type ApporteursSubTab = 'espace';
type AdminSubTab = 'reunions' | 'plannings' | 'documents' | 'zones';

// Configuration des onglets principaux (niveau 1)
// Configuration des onglets principaux avec module requis
// Note: MAIN_TABS_CONFIG moved inside DiversTabContent to use useModuleLabels hook
// A: 'Apporteurs' (organisation.apporteurs), 'Parc' (organisation.parc), 'Commercial' (prospection) → resolver
// B: 'Actions', 'Administratif', 'Performance', 'Devis acceptés', 'Incohérences' → structural/sub-feature labels

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
  disabled?: boolean;
}

interface StaticFolderTabsProps {
  tabs: FolderTabConfig[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

function StaticFolderTabs({ tabs, activeTab, onTabChange }: StaticFolderTabsProps) {
  const accentColors: Record<string, string> = {
    blue: 'hsl(var(--warm-blue))',
    purple: 'hsl(var(--warm-purple))',
    green: 'hsl(var(--warm-green))',
    orange: 'hsl(var(--warm-orange))',
    pink: 'hsl(var(--warm-pink))',
    teal: 'hsl(var(--warm-teal))',
  };

  const colorKeys = Object.keys(accentColors);

  return (
    <div className="flex gap-1 bg-transparent h-auto p-0 mb-0">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const accentColor = accentColors[colorKeys[index % colorKeys.length]];

        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "flex items-center gap-2 px-5 py-3",
              "rounded-t-2xl border-2 border-b-0",
              "font-medium text-sm transition-all duration-200",
              "relative -mb-[2px] z-10",
              tab.disabled && "opacity-40 cursor-not-allowed",
              !tab.disabled && isActive
                ? "bg-background text-foreground shadow-md"
                : !tab.disabled
                  ? "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "bg-muted/30 border-transparent text-muted-foreground"
            )}
            style={{
              borderColor: isActive && !tab.disabled ? accentColor : undefined,
              boxShadow: isActive && !tab.disabled ? `0 -2px 8px -2px ${accentColor}40` : undefined,
            }}
          >
            <span
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-lg",
                isActive && !tab.disabled ? "text-white" : "text-muted-foreground"
              )}
              style={{
                backgroundColor: isActive && !tab.disabled ? accentColor : 'transparent',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Sous-onglets Apporteurs
const APPORTEURS_TABS: FolderTabConfig[] = [
  { id: 'espace', label: 'Espace', icon: Eye },
];
const DEFAULT_APPORTEURS_ORDER = ['espace'];

function ApporteursSection() {
  const [subTab, setSubTab] = useSessionState<ApporteursSubTab>('outils_apporteurs_sub', 'espace');

  return (
    <div className="space-y-0">
      <StaticFolderTabs 
        tabs={APPORTEURS_TABS} 
        activeTab={subTab} 
        onTabChange={(t) => setSubTab(t as ApporteursSubTab)}
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

// Note: ADMIN_TABS_CONFIG moved inside AdministratifSection to use useModuleLabels hook

function AdministratifSection() {
  const { hasModule } = usePermissions();
  const { getShortLabel } = useModuleLabels();

  const adminTabsConfig: (FolderTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'reunions', label: getShortLabel('organisation.reunions', 'Réunions'), icon: Users2, requiresModule: 'organisation.reunions' },
    { id: 'plannings', label: getShortLabel('organisation.plannings', 'Plannings'), icon: CalendarDays, requiresModule: 'organisation.plannings' },
    { id: 'documents', label: getShortLabel('mediatheque.documents', 'Documents'), icon: FileText, requiresModule: 'mediatheque.documents' },
    { id: 'zones', label: getShortLabel('organisation.zones', 'Zones'), icon: MapPin, requiresModule: 'organisation.zones' },
  ], [getShortLabel]);

  const visibleAdminTabs = useMemo(() => {
    return adminTabsConfig.map(tab => {
      if (!tab.requiresModule) return tab;
      return { ...tab, disabled: !hasModule(tab.requiresModule) };
    });
  }, [hasModule, adminTabsConfig]);

  const defaultTab = (visibleAdminTabs.find(t => !t.disabled)?.id as AdminSubTab) ?? 'reunions';
  const [subTab, setSubTab] = useSessionState<AdminSubTab>('outils_admin_sub', defaultTab);
  
  // Ensure active tab is still enabled
  const effectiveSubTab = (visibleAdminTabs.find(t => t.id === subTab && !t.disabled)) ? subTab : defaultTab;

  if (visibleAdminTabs.every(t => t.disabled)) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Aucun outil administratif activé.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <StaticFolderTabs 
        tabs={visibleAdminTabs} 
        activeTab={effectiveSubTab} 
        onTabChange={(t) => setSubTab(t as AdminSubTab)}
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
        {effectiveSubTab === 'zones' && (
          <Suspense fallback={<LoadingFallback />}>
            <ZonesDeplacementTab />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function DiversTabContent() {
  const [activeMainTab, setActiveMainTab] = useSessionState<OutilsMainTab>('outils_main_tab', 'actions');
  const { hasModule } = usePermissions();
  const { getShortLabel } = useModuleLabels();

  const mainTabsConfig: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'actions', label: 'Actions', icon: Settings, accent: 'blue' },
    { id: 'apporteurs', label: getShortLabel('organisation.apporteurs', 'Apporteurs'), icon: Users, accent: 'purple', requiresModule: 'organisation.apporteurs' },
    { id: 'administratif', label: 'Administratif', icon: FolderOpen, accent: 'orange', requiresModule: 'pilotage.agence' },
    { id: 'parc', label: getShortLabel('organisation.parc', 'Parc'), icon: Car, accent: 'green', requiresModule: 'organisation.parc' },
    { id: 'performance', label: 'Performance', icon: Activity, accent: 'pink', requiresModule: 'pilotage.agence' },
    { id: 'prospection', label: getShortLabel('prospection', 'Commercial'), icon: Target, accent: 'orange', requiresModule: 'prospection' },
    
    { id: 'anomalies', label: 'Incohérences', icon: AlertTriangle, accent: 'pink', requiresModule: 'pilotage.agence' },
  ], [getShortLabel]);

  const visibleTabs = useMemo(() => {
    return mainTabsConfig.map(tab => {
      if (!tab.requiresModule) return tab;
      return { ...tab, disabled: !hasModule(tab.requiresModule) };
    });
  }, [hasModule, mainTabsConfig]);

  return (
    <div className="container mx-auto max-w-7xl py-6 px-2 sm:px-4 space-y-6">
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


        <TabsContent value="anomalies" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <AnomaliesDevisDossierView />
          </Suspense>
        </TabsContent>

      </Tabs>
    </div>
  );
}
