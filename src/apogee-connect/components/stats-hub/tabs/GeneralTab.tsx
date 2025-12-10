import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
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

export function GeneralTab() {
  const { openStat } = useStatsHub();
  const { data, isLoading } = useStatiaIndicateurs();
  const { data: savData } = useStatiaSAVMetrics();

  const kpis = [
    { id: 'dossiers_recus', title: 'Dossiers reçus', value: data?.dossiersJour ?? 0, format: 'number', miniType: 'sparkline' as const },
    { id: 'devis_emis', title: 'Devis émis', value: data?.devisJour ?? 0, format: 'number', miniType: 'sparkline' as const },
    { id: 'ca_mensuel', title: 'CA Mensuel', value: data?.caJour ?? 0, format: 'currency', miniType: 'sparkline' as const },
    { id: 'panier_moyen', title: 'Panier moyen', value: data?.panierMoyen?.panierMoyen ?? 0, format: 'currency', miniType: 'bar' as const },
    { id: 'taux_sav', title: 'Taux SAV', value: savData?.tauxSavGlobal ?? 0, format: 'percent', miniType: 'gauge' as const },
    { id: 'taux_transfo', title: 'Taux transfo', subtitle: 'Devis', value: data?.tauxTransformationDevis?.tauxTransformation ?? 0, format: 'percent', miniType: 'gauge' as const },
    { id: 'delai_facture', title: 'Délai moyen', subtitle: 'Dossier → Facture', value: data?.delaiDossierFacture?.delaiMoyen ?? 0, format: 'days', miniType: 'bar' as const },
    { id: 'rt_jour', title: 'RT du jour', value: data?.rtJour ?? 0, format: 'number', miniType: 'sparkline' as const },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      case 'days': return `${Math.round(value)} j`;
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
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <motion.div key={kpi.id} variants={itemVariants}>
            <KpiCard
              title={kpi.title}
              subtitle={kpi.subtitle}
              value={formatValue(kpi.value, kpi.format)}
              miniGraphType={kpi.miniType}
              sparklineData={[10, 15, 12, 18, 14, 20, 16, 22]}
              gaugeValue={kpi.format === 'percent' ? kpi.value : undefined}
              color="hsl(var(--primary))"
              onClick={() => openStat(kpi.id)}
              isLoading={isLoading}
            />
          </motion.div>
        ))}
      </div>

      {/* Widget: CA Evolution */}
      <motion.div variants={itemVariants}>
        <WidgetCard
          title="Évolution CA Mensuel"
          color="hsl(var(--primary))"
          onClick={() => openStat('widget_ca_mensuel')}
        >
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            📈 Cliquer pour voir l'évolution
          </div>
        </WidgetCard>
      </motion.div>
    </motion.div>
  );
}
