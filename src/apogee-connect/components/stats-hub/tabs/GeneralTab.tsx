import { useMemo } from 'react';
import { useStatiaIndicateurs, useStatiaKpi } from '@/statia/hooks/useStatiaIndicateurs';
import { useStatiaSAVMetrics } from '@/statia/hooks/useStatiaSAVMetrics';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { FolderOpen, FileText, Euro, ShoppingCart, AlertTriangle, Percent, Clock, Wrench, TrendingUp, Users, Target, Receipt } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export function GeneralTab() {
  const { data, isLoading } = useStatiaIndicateurs();
  const { data: savData } = useStatiaSAVMetrics();
  const { data: caTrancheData, isLoading: isTrancheLoading } = useStatiaKpi('ca_par_tranche_horaire');

  // Transformer les données de tranche horaire pour le graphique
  const trancheHoraireChartData = useMemo(() => {
    if (!caTrancheData?.value || typeof caTrancheData.value !== 'object') return [];
    
    const trancheOrder = ['Matin (6h-12h)', 'Midi (12h-14h)', 'Après-midi (14h-18h)', 'Soirée (18h-21h)', 'Hors horaires (21h-6h)', 'Non classé'];
    const value = caTrancheData.value as Record<string, number>;
    
    return trancheOrder
      .filter(tranche => value[tranche] !== undefined && value[tranche] > 0)
      .map(tranche => ({
        name: tranche.replace(/\s*\([^)]*\)/g, ''),
        fullName: tranche,
        ca: Math.round(value[tranche]),
      }));
  }, [caTrancheData]);

  // Palette de couleurs adoucie mais bien différenciée
  const TRANCHE_COLORS = [
    'hsl(210, 65%, 55%)',  // blue doux
    'hsl(155, 50%, 50%)',  // teal doux
    'hsl(280, 50%, 60%)',  // purple doux
    'hsl(35, 75%, 55%)',   // orange doux
    'hsl(345, 55%, 60%)',  // rose doux
    'hsl(195, 55%, 50%)',  // cyan doux
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // Générer données d'évolution CA mensuel
  const monthlyData = generateMonthlyData(data?.caJour ?? 0);

  // 12 KPIs réorganisés
  const kpis = [
    // Ligne 1
    { icon: FolderOpen, title: 'Dossiers', value: data?.dossiersJour ?? 0, format: 'number', color: 'blue' },
    { icon: FileText, title: 'Devis émis', value: data?.devisJour ?? 0, format: 'number', color: 'teal' },
    { icon: Receipt, title: 'Factures', value: Math.round((data?.caJour ?? 0) / (data?.panierMoyen?.panierMoyen || 1)), format: 'number', color: 'green' },
    { icon: Euro, title: 'CA HT', value: data?.caJour ?? 0, format: 'currency', color: 'blue' },
    { icon: ShoppingCart, title: 'Panier', value: data?.panierMoyen?.panierMoyen ?? 0, format: 'currency', color: 'purple' },
    { icon: Target, title: 'Objectif', value: 0, format: 'currency', color: 'orange' },
    // Ligne 2
    { icon: AlertTriangle, title: 'Taux SAV', value: savData?.tauxSavGlobal ?? 0, format: 'percent', color: 'rose' },
    { icon: Percent, title: 'Transfo', value: data?.tauxTransformationDevis?.tauxTransformation ?? 0, format: 'percent', color: 'teal' },
    { icon: Clock, title: 'Délai', value: data?.delaiDossierFacture?.delaiMoyen ?? 0, format: 'days', color: 'cyan' },
    { icon: Wrench, title: 'RT', value: data?.rtJour ?? 0, format: 'number', color: 'purple' },
    { icon: TrendingUp, title: 'Évolution', value: 0, format: 'percent', color: 'green' },
    { icon: Users, title: 'Techniciens', value: 0, format: 'number', color: 'blue' },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      case 'days': return `${Math.round(value)}j`;
      default: return String(value);
    }
  };

  // Palette de couleurs adoucie pour les tiles
  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: 'border-l-[hsl(210,60%,55%)]', bg: 'from-[hsl(210,60%,55%)]/8', text: 'text-[hsl(210,60%,55%)]' },
    teal: { border: 'border-l-[hsl(175,50%,45%)]', bg: 'from-[hsl(175,50%,45%)]/8', text: 'text-[hsl(175,50%,45%)]' },
    green: { border: 'border-l-[hsl(155,50%,45%)]', bg: 'from-[hsl(155,50%,45%)]/8', text: 'text-[hsl(155,50%,45%)]' },
    purple: { border: 'border-l-[hsl(270,50%,55%)]', bg: 'from-[hsl(270,50%,55%)]/8', text: 'text-[hsl(270,50%,55%)]' },
    orange: { border: 'border-l-[hsl(35,70%,50%)]', bg: 'from-[hsl(35,70%,50%)]/8', text: 'text-[hsl(35,70%,50%)]' },
    rose: { border: 'border-l-[hsl(345,55%,55%)]', bg: 'from-[hsl(345,55%,55%)]/8', text: 'text-[hsl(345,55%,55%)]' },
    cyan: { border: 'border-l-[hsl(195,55%,50%)]', bg: 'from-[hsl(195,55%,50%)]/8', text: 'text-[hsl(195,55%,50%)]' },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Grille 12 KPIs : 2 lignes de 6 */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {kpis.map((kpi, index) => {
          const colors = colorMap[kpi.color] || colorMap.blue;
          return (
            <motion.div key={kpi.title} variants={itemVariants}>
              <Card className={`border-l-3 ${colors.border} bg-gradient-to-br ${colors.bg} to-background hover:shadow-sm transition-all h-full rounded-xl`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <kpi.icon className={`w-3.5 h-3.5 ${colors.text}`} />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                      {kpi.title}
                    </span>
                  </div>
                  <p className={`text-base sm:text-lg font-bold ${colors.text} truncate`}>
                    {formatValue(kpi.value, kpi.format)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 2 graphiques côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dossiers vs Devis */}
        <motion.div variants={itemVariants}>
          <Card className="p-4 h-full rounded-xl">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-medium">Dossiers vs Devis par mois</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar 
                    dataKey="dossiers" 
                    fill="hsl(210, 60%, 55%)" 
                    name="Dossiers" 
                    radius={[3, 3, 0, 0]} 
                    animationDuration={1500} 
                  />
                  <Bar 
                    dataKey="devis" 
                    fill="hsl(155, 50%, 50%)" 
                    name="Devis" 
                    radius={[3, 3, 0, 0]} 
                    animationDuration={1500} 
                    animationBegin={200} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* CA par tranche horaire */}
        <motion.div variants={itemVariants}>
          <Card className="p-4 h-full rounded-xl">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-medium">CA par tranche horaire</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {trancheHoraireChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart 
                    data={trancheHoraireChartData} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={65} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'CA HT']}
                      labelFormatter={(label) => trancheHoraireChartData.find(d => d.name === label)?.fullName || label}
                    />
                    <Bar 
                      dataKey="ca" 
                      radius={[0, 4, 4, 0]}
                      animationDuration={1500}
                    >
                      {trancheHoraireChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={TRANCHE_COLORS[index % TRANCHE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée disponible
                </div>
              )}
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
