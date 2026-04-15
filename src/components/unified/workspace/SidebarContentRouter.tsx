/**
 * SidebarContentRouter - Each sidebar item = one dedicated page component
 * No more tab systems — direct rendering
 */
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { LocalErrorBoundary } from '@/components/system/LocalErrorBoundary';
import { PricingPlans } from '@/components/pricing/PricingPlans';
import { PeriodSelector } from '@/apogee-connect/components/filters/PeriodSelector';
import { PeriodDisplay } from '@/apogee-connect/components/filters/PeriodDisplay';
import type { SidebarView } from './WorkspaceSidebar';

// Lazy: Accueil
const DashboardContent = lazy(() => import('@/pages/DashboardStatic'));

// Lazy: Stats — each tab is now a standalone page
const GeneralTab = lazy(() => import('@/apogee-connect/components/stats-hub/tabs/GeneralTab').then(m => ({ default: m.GeneralTab })));
const ApporteursStatsTab = lazy(() => import('@/apogee-connect/components/stats-hub/tabs/ApporteursTab').then(m => ({ default: m.ApporteursTab })));
const TechniciensTab = lazy(() => import('@/apogee-connect/components/stats-hub/tabs/TechniciensTab').then(m => ({ default: m.TechniciensTab })));
const UniversTab = lazy(() => import('@/apogee-connect/components/stats-hub/tabs/UniversTab').then(m => ({ default: m.UniversTab })));
const SAVTab = lazy(() => import('@/apogee-connect/components/stats-hub/tabs/SAVTab').then(m => ({ default: m.SAVTab })));
const PrevisionnelTab = lazy(() => import('@/apogee-connect/components/stats-hub/tabs/PrevisionnelTab').then(m => ({ default: m.PrevisionnelTab })));
const FinancierTab = lazy(() => import('@/apogee-connect/components/stats-hub/tabs/FinancierTab').then(m => ({ default: m.FinancierTab })));
const TresorerieTab = lazy(() => import('@/apogee-connect/components/stats-hub/tabs/TresorerieTab').then(m => ({ default: m.TresorerieTab })));

// Lazy: Maps (garde ses onglets internes pour l'instant)
const MapsTabContent = lazy(() => import('@/components/unified/tabs/MapsTabContent'));

// Lazy: Analytique
const ResultatTabContent = lazy(() => import('@/components/financial/ResultatTabContent'));
const RentabiliteTabContent = lazy(() => import('@/components/profitability/RentabiliteTabContent'));

// Lazy: Opérationnel
const ActionsAMenerTab = lazy(() =>
  import('@/components/pilotage/ActionsAMenerTab').then((m) => ({ default: m.ActionsAMenerTab })),
);
const AnomaliesDevisDossierView = lazy(() => import('@/apogee-connect/components/AnomaliesDevisDossierView'));

// Lazy: Suivi client
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

// Lazy: Admin
const AdminTabContent = lazy(() => import('@/components/unified/tabs/AdminTabContent'));

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Header with period selector for stats pages */
function StatsPageHeader({ title, showPeriod = true }: { title: string; showPeriod?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {showPeriod && (
        <div className="flex items-center gap-3">
          <PeriodDisplay />
          <PeriodSelector />
        </div>
      )}
    </div>
  );
}

interface Props {
  view: SidebarView;
  agencySlug?: string;
  isN0User?: boolean;
}

export function SidebarContentRouter({ view, agencySlug, isN0User }: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <div className="container mx-auto max-w-app px-4 py-6">
        <LocalErrorBoundary componentName={view}>
          {renderView(view, agencySlug, isN0User)}
        </LocalErrorBoundary>
      </div>
    </Suspense>
  );
}

function renderView(view: SidebarView, agencySlug?: string, _isN0User?: boolean) {
  switch (view) {
    case 'accueil':
      return (
        <>
          <DashboardContent />
          <PricingPlans />
        </>
      );

    // ── Pilotage > Statistiques ──
    case 'stats-general':
      return (<><StatsPageHeader title="Statistiques — Général" /><GeneralTab /></>);
    case 'stats-apporteurs':
      return (<><StatsPageHeader title="Statistiques — Apporteurs" /><ApporteursStatsTab /></>);
    case 'stats-techniciens':
      return (<><StatsPageHeader title="Statistiques — Techniciens" /><TechniciensTab /></>);
    case 'stats-univers':
      return (<><StatsPageHeader title="Statistiques — Univers" /><UniversTab /></>);
    case 'stats-mapping':
      return (<><StatsPageHeader title="Mapping" showPeriod={false} /><MapsTabContent /></>);

    // ── Pilotage > Analytique ──
    case 'analytique-previsionnel':
      return (<><StatsPageHeader title="Prévisionnel" showPeriod={false} /><PrevisionnelTab /></>);
    case 'analytique-recouvrement':
      return (<><StatsPageHeader title="Recouvrement" /><FinancierTab /></>);
    case 'analytique-veille':
      return (<><StatsPageHeader title="Veille Clientèle" /><ResultatTabContent /></>);
    case 'analytique-rentabilite':
      return (<><StatsPageHeader title="Rentabilité dossier" /><RentabiliteTabContent /></>);

    // ── Pilotage > Opérationnel ──
    case 'operationnel-actions':
      return (<><StatsPageHeader title="Actions à mener" showPeriod={false} /><ActionsAMenerTab /></>);
    case 'operationnel-alertes':
      return (<><StatsPageHeader title="Alertes" showPeriod={false} /><ActionsAMenerTab /></>);
    case 'operationnel-incoherences':
      return (<><StatsPageHeader title="Incohérences" showPeriod={false} /><AnomaliesDevisDossierView /></>);

    // ── Suivi > Lien de suivi ──
    case 'suivi-parametres':
      return <SuiviClientSettingsCard />;
    case 'suivi-paiements':
      return <SuiviPaiements agencySlug={agencySlug} />;
    case 'suivi-journal':
      return <SuiviJournal agencySlug={agencySlug} />;

    // ── Suivi > Espace apporteurs ──
    case 'apporteurs-creation':
    case 'apporteurs-gestion':
      return <MesApporteursTab />;
    case 'apporteurs-echanges':
      return <AgencyApporteurExchanges />;

    // ── Admin ──
    case 'admin':
      return <AdminTabContent />;

    default:
      return <DashboardContent />;
  }
}
