/**
 * OrganisationTabContent - Onglet "Organisation"
 * Sous-onglets : Collaborateurs, Apporteurs, Plannings, Réunions, Parc, Conformité
 */

import { lazy, Suspense, useMemo } from 'react';
import { Users, Handshake, CalendarDays, Users2, Car, FileText, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { usePermissions } from '@/contexts/PermissionsContext';
import { MfaGuard } from '@/components/auth/MfaGuard';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

const RHSuiviContent = lazy(() => import('@/components/rh/RHSuiviContent').then(m => ({ default: m.RHSuiviContent })));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));
const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const VehiculesTabContent = lazy(() => import('@/components/unified/tabs/VehiculesTabContent'));
const AgencyAdminDocuments = lazy(() => import('@/components/outils/AgencyAdminDocuments').then(m => ({ default: m.AgencyAdminDocuments })));

type OrganisationSubTab = 'collaborateurs' | 'apporteurs' | 'plannings' | 'reunions' | 'parc' | 'conformite';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function OrganisationTabContent() {
  const { hasModule, isDeployedModule } = usePermissions();
  const { getShortLabel } = useModuleLabels();
  const { mode: navMode } = useNavigationMode();

  const allTabs: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'collaborateurs', label: getShortLabel('organisation.salaries', 'Salariés'), icon: Users, accent: 'blue', requiresModule: 'organisation.salaries' },
    { id: 'apporteurs', label: getShortLabel('organisation.apporteurs', 'Apporteurs'), icon: Handshake, accent: 'purple', requiresModule: 'organisation.apporteurs' },
    { id: 'plannings', label: getShortLabel('organisation.plannings', 'Plannings'), icon: CalendarDays, accent: 'green', requiresModule: 'organisation.plannings' },
    { id: 'reunions', label: getShortLabel('organisation.reunions', 'Réunions'), icon: Users2, accent: 'orange', requiresModule: 'organisation.reunions' },
    { id: 'parc', label: getShortLabel('organisation.parc', 'Parc'), icon: Car, accent: 'pink', requiresModule: 'organisation.parc' },
    // B: "Documents légaux" is a structural label, not a module name — gated by pilotage.agence
    { id: 'conformite', label: 'Documents légaux', icon: FileText, accent: 'teal', requiresModule: 'pilotage.agence' },
  ], [getShortLabel]);

  const visibleTabs = useMemo(() => {
    return allTabs
      .filter(tab => {
        if (tab.requiresModule && !isDeployedModule(tab.requiresModule)) return false;
        return true;
      })
      .map(tab => {
        if (!tab.requiresModule) return tab;
        return { ...tab, disabled: !hasModule(tab.requiresModule) };
      });
  }, [hasModule, isDeployedModule, allTabs]);

  const defaultTab = (visibleTabs.find(t => !t.disabled)?.id as OrganisationSubTab) ?? 'collaborateurs';
  const [activeTab, setActiveTab] = useSessionState<OrganisationSubTab>('organisation_sub_tab', defaultTab);
  const effectiveTab = (visibleTabs.find(t => t.id === activeTab && !t.disabled)) ? activeTab : defaultTab;

  return (
    <DomainAccentProvider accent="green">
    <div className={navMode === 'header' ? 'pt-1 px-2 sm:px-4 space-y-3' : 'py-6 px-2 sm:px-4 space-y-4'}>
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as OrganisationSubTab)}>
        {navMode === 'tabs' && <PillTabsList tabs={visibleTabs} />}

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
    </DomainAccentProvider>
  );
}
