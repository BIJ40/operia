import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
import { useStatiaSAVMetrics } from '@/statia/hooks/useStatiaSAVMetrics';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { FolderOpen, FileText, Euro, ShoppingCart, AlertTriangle, Percent, Clock, Wrench } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

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
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const colors = colorMap[kpi.color] || colorMap.blue;
          return (
            <motion.div key={kpi.title} variants={itemVariants}>
              <Card className={`border-l-4 ${colors.border} bg-gradient-to-br ${colors.bg} to-background hover:shadow-lg hover:-translate-y-1 transition-all`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <kpi.icon className={`w-4 h-4 ${colors.text}`} />
                    {kpi.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground/70">{kpi.subtitle}</p>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {formatValue(kpi.value, kpi.format)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Graphique CA Evolution */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg">Évolution CA Mensuel</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mois" className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'CA HT']}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ca" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCA)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Graphique Dossiers vs Devis */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg">Dossiers vs Devis par mois</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mois" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="dossiers" fill="hsl(220, 70%, 50%)" name="Dossiers" radius={[4, 4, 0, 0]} />
                <Bar dataKey="devis" fill="hsl(142, 70%, 45%)" name="Devis" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
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
