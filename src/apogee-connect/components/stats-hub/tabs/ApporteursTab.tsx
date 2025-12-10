import { useApporteursStatia } from '@/statia/hooks/useApporteursStatia';
import { KpiCard } from '../KpiCard';
import { WidgetCard } from '../WidgetCard';
import { useStatsHub } from '../StatsHubContext';
import { formatCurrency } from '@/lib/formatters';
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

export function ApporteursTab() {
  const { openStat } = useStatsHub();
  const { data, isLoading } = useApporteursStatia();

  const kpis = [
    { id: 'apporteurs_nb_actifs', title: 'Apporteurs actifs', value: data?.apporteursActifs ?? 0, format: 'number' },
    { id: 'apporteurs_du_global', title: 'Dû global TTC', value: data?.duGlobal ?? 0, format: 'currency' },
    { id: 'apporteurs_ca_total', title: 'CA apporteurs', value: data?.caTotal ?? 0, format: 'currency' },
  ];

  const widgets = [
    { id: 'widget_top_apporteurs', title: 'Top 5 Apporteurs CA' },
    { id: 'widget_flop_apporteurs', title: 'Flop 5 Apporteurs CA' },
    { id: 'widget_top_encours', title: 'Top En-cours' },
    { id: 'widget_segmentation', title: 'Segmentation Apporteurs' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map(kpi => (
          <motion.div key={kpi.id} variants={itemVariants}>
            <KpiCard
              title={kpi.title}
              value={kpi.format === 'currency' ? formatCurrency(kpi.value) : String(kpi.value)}
              miniGraphType="sparkline"
              sparklineData={[8, 12, 10, 15, 13, 18, 16]}
              color="hsl(220, 70%, 50%)"
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
              color="hsl(220, 70%, 50%)"
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
