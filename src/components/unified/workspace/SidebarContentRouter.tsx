/**
 * SidebarContentRouter - Renders the correct content based on sidebar view
 */
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { StatsHubProvider } from '@/apogee-connect/components/stats-hub/StatsHubContext';
import type { SidebarView } from './WorkspaceSidebar';

// Lazy loaded content
const StatsTabContent = lazy(() => import('@/components/unified/tabs/StatsTabContent'));
const ActionsAMenerTab = lazy(() =>
  import('@/components/pilotage/ActionsAMenerTab').then((m) => ({ default: m.ActionsAMenerTab })),
);
const AnomaliesDevisDossierView = lazy(() => import('@/apogee-connect/components/AnomaliesDevisDossierView'));
const ResultatTabContent = lazy(() => import('@/components/financial/ResultatTabContent'));
const RentabiliteTabContent = lazy(() => import('@/components/profitability/RentabiliteTabContent'));
const MapsTabContent = lazy(() => import('@/components/unified/tabs/MapsTabContent'));

// Relations / Suivi
const MesApporteursTab = lazy(() =>
  import('@/components/pilotage/MesApporteursTab').then((m) => ({ default: m.MesApporteursTab })),
);
const AgencyApporteurExchanges = lazy(() => import('@/components/agency/AgencyApporteurExchanges'));
const SuiviClientSettingsCard = lazy(() => import('@/components/relations/SuiviClientSettingsCard'));
const SuiviPaiements = lazy(() =>
  import('@/components/admin/views/SuiviClientsAdminView').then((m) => ({ default: m.PaiementsSection })),
);
const SuiviJournal = lazy(() =>
  import('@/components/admin/views/SuiviClientsAdminView').then((m) => ({ default: m.JournalSection })),
);

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

interface Props {
  view: SidebarView;
  agencySlug?: string;
}

export function SidebarContentRouter({ view, agencySlug }: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <div className="container mx-auto max-w-app px-4 py-6">
        {renderView(view, agencySlug)}
      </div>
    </Suspense>
  );
}

function renderView(view: SidebarView, agencySlug?: string) {
  switch (view) {
    // Pilotage > Statistiques — all use StatsHub with different initial tabs
    case 'stats-general':
    case 'stats-apporteurs':
    case 'stats-techniciens':
    case 'stats-univers':
      return (
        <StatsHubProvider>
          <StatsTabContent />
        </StatsHubProvider>
      );
    case 'stats-mapping':
      return <MapsTabContent />;

    // Pilotage > Analytique
    case 'analytique-previsionnel':
      return (
        <StatsHubProvider>
          <StatsTabContent />
        </StatsHubProvider>
      );
    case 'analytique-recouvrement':
      return (
        <StatsHubProvider>
          <StatsTabContent />
        </StatsHubProvider>
      );
    case 'analytique-veille':
      return <ResultatTabContent />;
    case 'analytique-rentabilite':
      return <RentabiliteTabContent />;

    // Pilotage > Opérationnel
    case 'operationnel-actions':
      return <ActionsAMenerTab />;
    case 'operationnel-alertes':
      return <ActionsAMenerTab />; // placeholder — will refine
    case 'operationnel-incoherences':
      return <AnomaliesDevisDossierView />;

    // Suivi > Lien de suivi
    case 'suivi-parametres':
      return <SuiviClientSettingsCard />;
    case 'suivi-paiements':
      return <SuiviPaiements agencySlug={agencySlug} />;
    case 'suivi-journal':
      return <SuiviJournal agencySlug={agencySlug} />;

    // Suivi > Espace apporteurs
    case 'apporteurs-creation':
    case 'apporteurs-gestion':
      return <MesApporteursTab />;
    case 'apporteurs-echanges':
      return <AgencyApporteurExchanges />;

    default:
      return <StatsHubProvider><StatsTabContent /></StatsHubProvider>;
  }
}
