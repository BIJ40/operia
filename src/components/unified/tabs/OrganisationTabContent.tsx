/**
 * OrganisationTabContent - Onglet "Organisation"
 * Sous-onglets : Collaborateurs, Apporteurs, Plannings, Réunions, Parc, Conformité
 */

import { lazy, Suspense, useMemo } from 'react';
import { Users, Handshake, CalendarDays, Users2, Car, FileText, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { MfaGuard } from '@/components/auth/MfaGuard';
import { ModuleKey } from '@/types/modules';

const RHSuiviContent = lazy(() => import('@/components/rh/RHSuiviContent').then(m => ({ default: m.RHSuiviContent })));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));
const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const VehiculesTabContent = lazy(() => import('@/components/unified/tabs/VehiculesTabContent'));
const AgencyAdminDocuments = lazy(() => import('@/components/outils/AgencyAdminDocuments').then(m => ({ default: m.AgencyAdminDocuments })));

type OrganisationSubTab = 'collaborateurs' | 'apporteurs' | 'plannings' | 'reunions' | 'parc' | 'conformite';

const ALL_ORGANISATION_TABS: (PillTabConfig & { requiresModule?: ModuleKey })[] = [
  { id: 'collaborateurs', label: 'Collaborateurs', icon: Users, accent: 'blue', requiresModule: 'rh' },
  { id: 'apporteurs', label: 'Apporteurs', icon: Handshake, accent: 'purple', requiresModule: 'divers_apporteurs' },
  { id: 'plannings', label: 'Plannings', icon: CalendarDays, accent: 'green', requiresModule: 'divers_plannings' },
  { id: 'reunions', label: 'Réunions', icon: Users2, accent: 'orange', requiresModule: 'divers_reunions' },
  { id: 'parc', label: 'Parc', icon: Car, accent: 'pink', requiresModule: 'parc' },
  { id: 'conformite', label: 'Conformité', icon: FileText, accent: 'teal', requiresModule: 'agence' },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function OrganisationTabContent() {
  const { hasModule } = useEffectiveModules();

  const visibleTabs = useMemo(() => {
    return ALL_ORGANISATION_TABS.filter(tab => {
      if (!tab.requiresModule) return true;
      return hasModule(tab.requiresModule);
    });
  }, [hasModule]);

  const defaultTab = visibleTabs[0]?.id as OrganisationSubTab ?? 'collaborateurs';
  const [activeTab, setActiveTab] = useSessionState<OrganisationSubTab>('organisation_sub_tab', defaultTab);
  const effectiveTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : defaultTab;

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as OrganisationSubTab)}>
        <PillTabsList tabs={visibleTabs} />

        <TabsContent value="collaborateurs" className="mt-4">
          <MfaGuard>
            <Suspense fallback={<LoadingFallback />}>
              <RHSuiviContent />
            </Suspense>
          </MfaGuard>
        </TabsContent>

        <TabsContent value="apporteurs" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <MesApporteursTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="plannings" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <PlanningHebdo />
          </Suspense>
        </TabsContent>

        <TabsContent value="reunions" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <RHMeetingsPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="parc" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <VehiculesTabContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="conformite" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <AgencyAdminDocuments />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
