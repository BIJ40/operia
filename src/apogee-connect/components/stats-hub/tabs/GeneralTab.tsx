import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStatiaSAVMetrics } from '@/statia/hooks/useStatiaSAVMetrics';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
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

/**
 * Hook dédié pour les KPIs de l'onglet Général - 100% StatIA
 */
function useGeneralTabKpis() {
  const { filters } = useFilters();
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.slug || '';
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ['general-tab-kpis', agencySlug, filters.dateRange],
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!agencySlug) throw new Error('Agency manquant');

      const statiaParams = { dateRange: filters.dateRange };

      // Calculer la période M-1 pour l'évolution
      const currentStart = filters.dateRange.start;
      const currentEnd = filters.dateRange.end;
      
      // Période M-1 : décaler d'un mois
      const prevStart = new Date(currentStart);
      prevStart.setMonth(prevStart.getMonth() - 1);
      const prevEnd = new Date(currentEnd);
      prevEnd.setMonth(prevEnd.getMonth() - 1);
      
      const prevStatiaParams = { dateRange: { start: prevStart, end: prevEnd } };

      const [
        caGlobal,
        nbDossiers,
        nbDevis,
        montantDevis,
        panierMoyen,
        tauxTransfo,
        dureeDossier,
        nbInterventions,
        caTrancheHoraire,
        topTechs,
        caGlobalPrev,
      ] = await Promise.all([
        getMetricForAgency('ca_global_ht', agencySlug, statiaParams, services),
        getMetricForAgency('nb_dossiers_crees', agencySlug, statiaParams, services),
        getMetricForAgency('nombre_devis', agencySlug, statiaParams, services),
        getMetricForAgency('montant_devis', agencySlug, statiaParams, services),
        getMetricForAgency('panier_moyen', agencySlug, statiaParams, services),
        getMetricForAgency('taux_transformation_devis_nombre', agencySlug, statiaParams, services),
        getMetricForAgency('duree_moyenne_dossier', agencySlug, statiaParams, services),
        getMetricForAgency('nb_interventions_periode', agencySlug, statiaParams, services),
        getMetricForAgency('ca_par_tranche_horaire', agencySlug, statiaParams, services),
        getMetricForAgency('top_techniciens_ca', agencySlug, statiaParams, services),
        // CA du mois précédent pour l'évolution
        getMetricForAgency('ca_global_ht', agencySlug, prevStatiaParams, services),
      ]);

      // Extraire nombre factures depuis breakdown CA
      const nbFactures = (caGlobal?.breakdown as any)?.factureCount ?? 0;
      
      // Extraire nombre RT depuis breakdown interventions
      const interventionsBreakdown = nbInterventions?.breakdown as any || {};
      const rtCount = interventionsBreakdown?.byType?.rt 
        ?? interventionsBreakdown?.byType?.['releve technique']
        ?? interventionsBreakdown?.byType?.['RT']
        ?? interventionsBreakdown?.rtCount
        ?? interventionsBreakdown?.rt
        ?? 0;
      
      // Extraire nombre techniciens actifs
      const topTechBreakdown = topTechs?.breakdown as any;
      const nbTechsActifs = topTechBreakdown?.ranking?.length ?? 0;

      // Calcul évolution CA : (CA_M - CA_M-1) / CA_M-1 * 100
      const caM = Number(caGlobal?.value) || 0;
      const caPrev = Number(caGlobalPrev?.value) || 0;
      const evolutionCA = caPrev > 0 ? ((caM - caPrev) / caPrev) * 100 : 0;

      return {
        caHT: caM,
        nbFactures,
        nbDossiers: Number(nbDossiers?.value) || 0,
        nbDevis: Number(nbDevis?.value) || 0,
        montantDevis: Number(montantDevis?.value) || 0,
        panierMoyen: Number(panierMoyen?.value) || 0,
        tauxTransfo: Number(tauxTransfo?.value) || 0,
        delaiMoyen: Number(dureeDossier?.value) || 0,
        nbRT: rtCount,
        nbInterventions: Number(nbInterventions?.value) || 0,
        nbTechsActifs,
        caTrancheHoraire: caTrancheHoraire?.value as Record<string, number> || {},
        evolutionCA,
        caPrev,
      };
    },
  });
}

export function GeneralTab() {
  const { data, isLoading } = useGeneralTabKpis();
  const { data: savData } = useStatiaSAVMetrics();

  // Transformer les données de tranche horaire pour le graphique
  const trancheHoraireChartData = useMemo(() => {
    if (!data?.caTrancheHoraire || typeof data.caTrancheHoraire !== 'object') return [];
    
    const trancheOrder = ['Matin (6h-12h)', 'Midi (12h-14h)', 'Après-midi (14h-18h)', 'Soirée (18h-21h)', 'Hors horaires (21h-6h)', 'Non classé'];
    const value = data.caTrancheHoraire;
    
    return trancheOrder
      .filter(tranche => value[tranche] !== undefined && value[tranche] > 0)
      .map(tranche => ({
        name: tranche.replace(/\s*\([^)]*\)/g, ''),
        fullName: tranche,
        ca: Math.round(value[tranche]),
      }));
  }, [data?.caTrancheHoraire]);

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

  // Données pour le graphique Dossiers vs Devis (vraies données, pas aléatoire)
  const currentMonthName = new Date().toLocaleDateString('fr-FR', { month: 'short' });
  const monthlyData = [
    {
      mois: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1),
      dossiers: data?.nbDossiers ?? 0,
      devis: data?.nbDevis ?? 0,
    }
  ];

  // 12 KPIs réorganisés avec vraies données
  const kpis = [
    // Ligne 1
    { icon: FolderOpen, title: 'Dossiers', value: data?.nbDossiers ?? 0, format: 'number', color: 'blue' },
    { icon: FileText, title: 'Devis émis', value: data?.nbDevis ?? 0, format: 'number', color: 'teal' },
    { icon: Receipt, title: 'Factures', value: data?.nbFactures ?? 0, format: 'number', color: 'green' },
    { icon: Euro, title: 'CA HT', value: data?.caHT ?? 0, format: 'currency', color: 'blue' },
    { icon: ShoppingCart, title: 'Panier', value: data?.panierMoyen ?? 0, format: 'currency', color: 'purple' },
    { icon: Wrench, title: 'Interventions', value: data?.nbInterventions ?? 0, format: 'number', color: 'orange' },
    // Ligne 2
    { icon: AlertTriangle, title: 'Taux SAV', value: savData?.tauxSavGlobal ?? 0, format: 'percent', color: 'rose' },
    { icon: Percent, title: 'Transfo', value: data?.tauxTransfo ?? 0, format: 'percent', color: 'teal' },
    { icon: Clock, title: 'Délai', value: data?.delaiMoyen ?? 0, format: 'days', color: 'cyan' },
    { icon: Target, title: 'RT', value: data?.nbRT ?? 0, format: 'number', color: 'purple' },
    { icon: TrendingUp, title: 'Évolution', value: data?.evolutionCA ?? 0, format: 'evolution', color: 'green' },
    { icon: Users, title: 'Techniciens', value: data?.nbTechsActifs ?? 0, format: 'number', color: 'blue' },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      case 'evolution': {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
      }
      case 'days': return `${Math.round(value)}j`;
      default: return String(value);
    }
  };

  // Palette de couleurs adoucie pour les tiles
  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: 'border-l-[hsl(210,60%,55%)]', bg: 'bg-[hsl(210,60%,55%)]/5', text: 'text-[hsl(210,60%,55%)]' },
    teal: { border: 'border-l-[hsl(175,50%,45%)]', bg: 'bg-[hsl(175,50%,45%)]/5', text: 'text-[hsl(175,50%,45%)]' },
    green: { border: 'border-l-[hsl(155,50%,45%)]', bg: 'bg-[hsl(155,50%,45%)]/5', text: 'text-[hsl(155,50%,45%)]' },
    purple: { border: 'border-l-[hsl(270,50%,55%)]', bg: 'bg-[hsl(270,50%,55%)]/5', text: 'text-[hsl(270,50%,55%)]' },
    orange: { border: 'border-l-[hsl(35,70%,50%)]', bg: 'bg-[hsl(35,70%,50%)]/5', text: 'text-[hsl(35,70%,50%)]' },
    rose: { border: 'border-l-[hsl(345,55%,55%)]', bg: 'bg-[hsl(345,55%,55%)]/5', text: 'text-[hsl(345,55%,55%)]' },
    cyan: { border: 'border-l-[hsl(195,55%,50%)]', bg: 'bg-[hsl(195,55%,50%)]/5', text: 'text-[hsl(195,55%,50%)]' },
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
              <Card className={`border-l-3 ${colors.border} ${colors.bg} hover:shadow-sm transition-all h-full rounded-xl`}>
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
