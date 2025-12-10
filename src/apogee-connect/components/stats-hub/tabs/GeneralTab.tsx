import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
import { useStatiaSAVMetrics } from '@/statia/hooks/useStatiaSAVMetrics';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { FolderOpen, FileText, Euro, ShoppingCart, AlertTriangle, Percent, Clock, Wrench } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { AnimatedAreaChart } from '../AnimatedAreaChart';
import { RingProgressKpi, DonutKpiChart } from '../charts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function GeneralTab() {
  const { filters } = useFilters();
  const { data, isLoading } = useStatiaIndicateurs();
  const { data: savData } = useStatiaSAVMetrics();

  const periodLabel = filters.periodLabel || 'ce mois';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  // Générer données d'évolution CA mensuel
  const monthlyData = generateMonthlyData(data?.caJour ?? 0);

  const kpis = [
    { icon: FolderOpen, title: 'Dossiers reçus', subtitle: periodLabel, value: data?.dossiersJour ?? 0, format: 'number', color: 'blue' },
    { icon: FileText, title: 'Devis émis', subtitle: periodLabel, value: data?.devisJour ?? 0, format: 'number', color: 'green' },
    { icon: Euro, title: 'CA Période', subtitle: `HT - ${periodLabel}`, value: data?.caJour ?? 0, format: 'currency', color: 'blue' },
    { icon: ShoppingCart, title: 'Panier moyen', subtitle: periodLabel, value: data?.panierMoyen?.panierMoyen ?? 0, format: 'currency', color: 'purple' },
    { icon: AlertTriangle, title: 'Taux SAV', subtitle: periodLabel, value: savData?.tauxSavGlobal ?? 0, format: 'percent', color: 'orange' },
    { icon: Percent, title: 'Taux transfo', subtitle: periodLabel, value: data?.tauxTransformationDevis?.tauxTransformation ?? 0, format: 'percent', color: 'green' },
    { icon: Clock, title: 'Délai moyen', subtitle: 'Dossier → Facture', value: data?.delaiDossierFacture?.delaiMoyen ?? 0, format: 'days', color: 'blue' },
    { icon: Wrench, title: 'RT', subtitle: periodLabel, value: data?.rtJour ?? 0, format: 'number', color: 'purple' },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      case 'days': return `${Math.round(value)} j`;
      default: return String(value);
    }
  };

  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: 'border-l-helpconfort-blue', bg: 'from-helpconfort-blue/10', text: 'text-helpconfort-blue' },
    green: { border: 'border-l-green-500', bg: 'from-green-500/10', text: 'text-green-600' },
    purple: { border: 'border-l-purple-500', bg: 'from-purple-500/10', text: 'text-purple-600' },
    orange: { border: 'border-l-orange-500', bg: 'from-orange-500/10', text: 'text-orange-600' },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Section visuelle avec rings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="p-4 flex items-center justify-center h-full">
            <RingProgressKpi
              value={savData?.tauxSavGlobal ?? 0}
              maxValue={10}
              label="Taux SAV"
              subtitle={periodLabel}
              color="hsl(35, 90%, 55%)"
              size={120}
              formatValue={(v) => `${v.toFixed(1)}%`}
            />
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 flex items-center justify-center h-full">
            <RingProgressKpi
              value={data?.tauxTransformationDevis?.tauxTransformation ?? 0}
              maxValue={100}
              label="Taux transfo"
              subtitle="Devis → Factures"
              color="hsl(142, 70%, 45%)"
              size={120}
              formatValue={(v) => `${v.toFixed(0)}%`}
            />
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 flex items-center justify-center h-full">
            <RingProgressKpi
              value={data?.delaiDossierFacture?.delaiMoyen ?? 0}
              maxValue={45}
              label="Délai moyen"
              subtitle="Jours"
              color="hsl(220, 70%, 50%)"
              size={120}
              formatValue={(v) => `${Math.round(v)}j`}
            />
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 flex items-center justify-center h-full">
            <RingProgressKpi
              value={data?.panierMoyen?.panierMoyen ?? 0}
              maxValue={3000}
              label="Panier moyen"
              subtitle="HT"
              color="hsl(280, 70%, 50%)"
              size={120}
              formatValue={(v) => formatCurrency(v)}
            />
          </Card>
        </motion.div>
      </div>

      {/* KPIs + Histogram side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KPIs Grid - compact */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {kpis.map(kpi => {
            const colors = colorMap[kpi.color] || colorMap.blue;
            return (
              <motion.div key={kpi.title} variants={itemVariants}>
                <Card className={`border-l-4 ${colors.border} bg-gradient-to-br ${colors.bg} to-background hover:shadow-md hover:-translate-y-0.5 transition-all h-full`}>
                  <CardHeader className="p-2 pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <kpi.icon className={`w-3 h-3 ${colors.text}`} />
                      {kpi.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    <p className={`text-lg font-bold ${colors.text}`}>
                      {formatValue(kpi.value, kpi.format)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Dossiers vs Devis - compact */}
        <motion.div variants={itemVariants}>
          <Card className="p-3 h-full">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm">Dossiers vs Devis par mois</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="dossiers" fill="hsl(220, 70%, 50%)" name="Dossiers" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="devis" fill="hsl(142, 70%, 45%)" name="Devis" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Génère des données mensuelles de démonstration basées sur la valeur actuelle
function generateMonthlyData(currentCA: number) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentMonth = new Date().getMonth();
  
  return months.slice(0, currentMonth + 1).map((mois, index) => {
    const variance = 0.7 + Math.random() * 0.6;
    const ca = Math.round(currentCA * variance);
    return {
      mois,
      ca,
      dossiers: Math.round(20 + Math.random() * 30),
      devis: Math.round(15 + Math.random() * 25),
    };
  });
}
