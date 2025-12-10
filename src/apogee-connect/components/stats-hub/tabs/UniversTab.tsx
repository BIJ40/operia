import { useUniversStatia } from '@/statia/hooks/useUniversStatia';
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

export function UniversTab() {
  const { openStat } = useStatsHub();
  const { data, isLoading } = useUniversStatia();

  // Top 4 univers par CA
  const topUnivers = data?.stats
    ?.sort((a, b) => b.caHT - a.caHT)
    .slice(0, 4) ?? [];

  const widgets = [
    { id: 'widget_repartition_univers', title: 'Répartition par Univers' },
    { id: 'widget_evolution_univers', title: 'Évolution Univers' },
    { id: 'widget_matrix_univers', title: 'Matrice Univers/Apporteurs' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* KPIs - Top univers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topUnivers.map((univers, idx) => (
          <motion.div key={univers.univers || idx} variants={itemVariants}>
            <KpiCard
              title={univers.univers || 'Non catégorisé'}
              value={formatCurrency(univers.caHT)}
              miniGraphType="bar"
              sparklineData={[univers.caHT / 1000]}
              color="hsl(280, 70%, 50%)"
              onClick={() => openStat('widget_repartition_univers')}
              isLoading={isLoading}
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
              color="hsl(280, 70%, 50%)"
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
