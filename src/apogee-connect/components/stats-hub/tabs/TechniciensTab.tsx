import { useTechniciensStatia } from '@/statia/hooks/useTechniciensStatia';
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

export function TechniciensTab() {
  const { openStat } = useStatsHub();
  const data = useTechniciensStatia();

  const kpis = [
    { id: 'tech_nb_actifs', title: 'Techniciens actifs', value: data.nbTechniciens ?? 0, format: 'number' },
    { id: 'tech_ca_total', title: 'CA Total', value: data.caTotal ?? 0, format: 'currency' },
    { id: 'tech_ca_moyen', title: 'CA Moyen/Tech', value: data.nbTechniciens ? (data.caTotal ?? 0) / data.nbTechniciens : 0, format: 'currency' },
  ];

  const widgets = [
    { id: 'widget_heatmap', title: 'Heatmap Activité' },
    { id: 'widget_top_tech', title: 'Classement Techniciens' },
    { id: 'widget_ca_mensuel_tech', title: 'CA Mensuel par Tech' },
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
              miniGraphType="bar"
              sparklineData={[12, 18, 15, 22, 19, 25]}
              color="hsl(142, 70%, 45%)"
              onClick={() => openStat(kpi.id)}
              isLoading={data.isLoading}
            />
          </motion.div>
        ))}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map(widget => (
          <motion.div key={widget.id} variants={itemVariants}>
            <WidgetCard
              title={widget.title}
              color="hsl(142, 70%, 45%)"
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
