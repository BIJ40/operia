import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsHubProvider, useStatsHub } from '../components/stats-hub/StatsHubContext';
import { StatModal } from '../components/stats-hub/StatModal';
import { KpiCard } from '../components/stats-hub/KpiCard';
import { WidgetCard } from '../components/stats-hub/WidgetCard';
import { getStatsForTab, TABS_CONFIG, TabId } from '../components/stats-hub/types';
import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
import { useTechniciensStatia } from '@/statia/hooks/useTechniciensStatia';
import { useApporteursStatia } from '@/statia/hooks/useApporteursStatia';
import { useStatiaSAVMetrics } from '@/statia/hooks/useStatiaSAVMetrics';
import { useUniversStatia } from '@/statia/hooks/useUniversStatia';
import { formatCurrency } from '@/lib/formatters';
import { LayoutDashboard, Building2, Users, Layers, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  general: <LayoutDashboard className="h-4 w-4" />,
  apporteurs: <Building2 className="h-4 w-4" />,
  techniciens: <Users className="h-4 w-4" />,
  univers: <Layers className="h-4 w-4" />,
  sav: <AlertTriangle className="h-4 w-4" />,
};

function StatsHubContent() {
  const { activeTab, setActiveTab, openStat } = useStatsHub();
  
  // Load all data
  const { data: generalData, isLoading: generalLoading } = useStatiaIndicateurs();
  const techData = useTechniciensStatia();
  const { data: appData, isLoading: appLoading } = useApporteursStatia();
  const { data: savData, isLoading: savLoading } = useStatiaSAVMetrics();
  const { data: universData, isLoading: universLoading } = useUniversStatia();

  // Helper to get value for a stat
  const getStatValue = (statId: string): string => {
    switch (statId) {
      case 'dossiers_recus': return String(generalData?.dossiersJour ?? '–');
      case 'dossiers_moyenne': return '–'; // Calculated differently
      case 'devis_emis': return String(generalData?.devisJour ?? '–');
      case 'ca_mensuel': return generalData?.caJour ? formatCurrency(generalData.caJour) : '–';
      case 'ca_ytd': return '–'; // Not in current structure
      case 'encours_global': return '–'; // Not in current structure
      case 'taux_sav': return `${(generalData?.tauxSAVGlobal ?? 0).toFixed(1)}%`;
      case 'panier_moyen': return generalData?.panierMoyen ? formatCurrency(generalData.panierMoyen.panierMoyen) : '–';
      case 'apporteurs_du_global': return appData?.duGlobal ? formatCurrency(appData.duGlobal) : '–';
      case 'apporteurs_nb_actifs': return String(appData?.apporteursActifs ?? 0);
      case 'tech_nb_actifs': return String(techData.nbTechniciens ?? 0);
      case 'tech_ca_total': return formatCurrency(techData.caTotal ?? 0);
      case 'sav_taux_global': return `${(savData?.tauxSavGlobal ?? 0).toFixed(1)}%`;
      case 'sav_nb_dossiers': return String(savData?.nbSavGlobal ?? 0);
      default: return '–';
    }
  };

  const getSparklineData = (statId: string): number[] => {
    // Generate sample sparkline data
    return [10, 15, 12, 18, 14, 20, 16, 22];
  };

  const getGaugeValue = (statId: string): number => {
    if (statId.includes('taux_sav') || statId === 'sav_taux_global') return savData?.tauxSavGlobal ?? 0;
    if (statId.includes('taux_transfo')) return 65;
    return 50;
  };

  const renderTab = (tabId: TabId) => {
    const stats = getStatsForTab(tabId);
    const kpis = stats.filter(s => !s.isWidget);
    const widgets = stats.filter(s => s.isWidget);
    const isLoading = tabId === 'general' ? generalLoading : 
                      tabId === 'techniciens' ? techData.isLoading :
                      tabId === 'apporteurs' ? appLoading :
                      tabId === 'sav' ? savLoading : universLoading;

    return (
      <div className="space-y-6">
        {/* KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.slice(0, 8).map(stat => (
            <KpiCard
              key={stat.id}
              title={stat.title}
              subtitle={stat.subtitle}
              value={getStatValue(stat.id)}
              miniGraphType={stat.miniGraphType}
              sparklineData={getSparklineData(stat.id)}
              gaugeValue={getGaugeValue(stat.id)}
              color={TABS_CONFIG.find(t => t.id === tabId)?.color}
              onClick={() => openStat(stat.id)}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* More KPIs if any */}
        {kpis.length > 8 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.slice(8).map(stat => (
              <KpiCard
                key={stat.id}
                title={stat.title}
                subtitle={stat.subtitle}
                value={getStatValue(stat.id)}
                miniGraphType={stat.miniGraphType}
                sparklineData={getSparklineData(stat.id)}
                gaugeValue={getGaugeValue(stat.id)}
                color={TABS_CONFIG.find(t => t.id === tabId)?.color}
                onClick={() => openStat(stat.id)}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}

        {/* Widgets Grid */}
        {widgets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.map(stat => (
              <WidgetCard
                key={stat.id}
                title={stat.title}
                color={TABS_CONFIG.find(t => t.id === tabId)?.color}
                onClick={() => openStat(stat.id)}
              >
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Cliquer pour voir le détail
                </div>
              </WidgetCard>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Hub Statistiques"
        backTo={ROUTES.pilotage.index}
        backLabel="Mon Agence"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          {TABS_CONFIG.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              {TAB_ICONS[tab.id]}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS_CONFIG.map(tab => (
          <TabsContent key={tab.id} value={tab.id}>
            {renderTab(tab.id)}
          </TabsContent>
        ))}
      </Tabs>

      <StatModal />

      {/* Keyboard hint */}
      <div className="text-center text-xs text-muted-foreground">
        Touches 1-5 pour changer d'onglet • Cliquer sur une tuile pour les détails
      </div>
    </div>
  );
}

export default function StatsHub() {
  return (
    <StatsHubProvider>
      <StatsHubContent />
    </StatsHubProvider>
  );
}
