import { useStatiaSAVMetrics } from '@/statia/hooks/useStatiaSAVMetrics';
import { KpiCard } from '../KpiCard';
import { WidgetCard } from '../WidgetCard';
import { useStatsHub } from '../StatsHubContext';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function SAVTab() {
  const { openStat } = useStatsHub();
  const { data, isLoading } = useStatiaSAVMetrics();

  const kpis = [
    { id: 'sav_taux_global', title: 'Taux SAV Global', value: data?.tauxSavGlobal ?? 0, format: 'percent', miniType: 'gauge' as const },
    { id: 'sav_nb_dossiers', title: 'Nb dossiers SAV', value: data?.nbSavGlobal ?? 0, format: 'number', miniType: 'sparkline' as const },
    { id: 'sav_cout_estime', title: 'Coût SAV estimé', value: data?.coutSavEstime ?? 0, format: 'currency', miniType: 'bar' as const },
    { id: 'sav_ca_impacte', title: 'CA impacté', value: data?.caSav ?? 0, format: 'currency', miniType: 'bar' as const },
  ];

  const widgets = [
    { id: 'widget_sav_liste', title: 'Liste des dossiers SAV' },
    { id: 'widget_sav_univers', title: 'SAV par Univers' },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      default: return String(value);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <motion.div key={kpi.id} variants={itemVariants}>
            <KpiCard
              title={kpi.title}
              value={formatValue(kpi.value, kpi.format)}
              miniGraphType={kpi.miniType}
              sparklineData={[5, 8, 6, 10, 7, 12]}
              gaugeValue={kpi.format === 'percent' ? kpi.value : undefined}
              color="hsl(0, 70%, 50%)"
              onClick={() => openStat(kpi.id)}
              isLoading={isLoading}
            />
          </motion.div>
        ))}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {widgets.map(widget => (
          <motion.div key={widget.id} variants={itemVariants}>
            <WidgetCard
              title={widget.title}
              color="hsl(0, 70%, 50%)"
              onClick={() => openStat(widget.id)}
            >
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                Cliquer pour voir le détail
              </div>
            </WidgetCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
