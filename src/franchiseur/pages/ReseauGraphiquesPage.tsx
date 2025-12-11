/**
 * Page Graphiques Réseau - Galerie de visualisations StatIA
 */

import { useState, useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStatiaReseauDashboard } from '@/statia/hooks/useStatiaReseauDashboard';
import { useStatiaComparatifAgences } from '@/statia/hooks/useStatiaComparatifAgences';
import { useNetworkFilters } from '@/franchiseur/contexts/NetworkFiltersContext';
import { useFranchiseur } from '@/franchiseur/contexts/FranchiseurContext';
import { useFranchiseurStatsStatia } from '../hooks/useFranchiseurStatsStatia';
import { FranchiseurPageHeader } from '../components/layout/FranchiseurPageHeader';
import { FranchiseurPageContainer } from '../components/layout/FranchiseurPageContainer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis
} from 'recharts';

type GraphTheme = 'all' | 'ca' | 'qualite' | 'apporteurs' | 'delais' | 'productivite';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];
const HELPCONFORT_BLUE = '#0088FE';
const HELPCONFORT_ORANGE = '#FF8042';

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '–';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '–';
  return `${value.toFixed(1)} %`;
};

const formatDays = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '–';
  return `${value.toFixed(1)} j`;
};

function ChartSkeleton() {
  return (
    <Card className="h-[400px] rounded-2xl">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 mt-8 first:mt-0">
      <span className="text-2xl">{icon}</span>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function PeriodLabel({ from, to }: { from: Date; to: Date }) {
  return (
    <span className="text-xs text-muted-foreground">
      Période : {format(from, 'dd/MM/yyyy', { locale: fr })} → {format(to, 'dd/MM/yyyy', { locale: fr })}
    </span>
  );
}

export default function ReseauGraphiquesPage() {
  const [theme, setTheme] = useState<GraphTheme>('all');
  const { dateRange } = useNetworkFilters();
  const { selectedAgencies } = useFranchiseur();

  // Date range
  const dateStart = dateRange?.from || new Date(new Date().getFullYear(), 0, 1);
  const dateEnd = dateRange?.to || new Date();

  // Hooks StatIA
  const { data: dashboardData, isLoading: loadingDashboard } = useStatiaReseauDashboard();
  const { data: comparatifData, isLoading: loadingComparatif } = useStatiaComparatifAgences({
    dateStart,
    dateEnd,
    scopeAgencies: selectedAgencies.length > 0 ? selectedAgencies : undefined,
  });
  const { data: franchiseurStatsData, isLoading: loadingStats } = useFranchiseurStatsStatia();

  const isLoading = loadingDashboard || loadingComparatif || loadingStats;

  // Prepared data
  const agences = comparatifData?.agences || [];
  const caSeriesData = dashboardData?.blocCA.serieCAMensuel || [];
  const savSeriesData = dashboardData?.blocSav.serieTauxSavMensuel || [];
  const partCAAgences = dashboardData?.blocCA.partCAParAgence || [];
  const topApporteurs = dashboardData?.blocApporteurs.top3ApporteursCA || [];
  const technicienStats = franchiseurStatsData?.technicienStats || [];

  // CA par agence for bar chart
  const caParAgenceData = useMemo(() => 
    agences
      .filter(a => a.ca_periode !== null && a.ca_periode > 0)
      .sort((a, b) => (b.ca_periode || 0) - (a.ca_periode || 0))
      .slice(0, 15)
      .map(a => ({ name: a.agency_name, ca: a.ca_periode || 0 })),
    [agences]
  );

  // CA moyen par dossier vs intervention for grouped bar
  const caMoyenData = useMemo(() =>
    agences
      .filter(a => a.ca_moyen_par_dossier !== null || a.ca_moyen_par_intervention !== null)
      .slice(0, 10)
      .map(a => ({
        name: a.agency_name.length > 12 ? a.agency_name.slice(0, 12) + '...' : a.agency_name,
        caDossier: a.ca_moyen_par_dossier || 0,
        caIntervention: a.ca_moyen_par_intervention || 0,
      })),
    [agences]
  );

  // Volume stacked bar
  const volumeData = useMemo(() =>
    agences
      .slice(0, 12)
      .map(a => ({
        name: a.agency_name.length > 10 ? a.agency_name.slice(0, 10) + '...' : a.agency_name,
        dossiers: a.nb_dossiers_periode,
        interventions: a.nb_interventions_periode,
      })),
    [agences]
  );

  // SAV par agence
  const savParAgenceData = useMemo(() =>
    agences
      .filter(a => a.taux_sav !== null)
      .sort((a, b) => (b.taux_sav || 0) - (a.taux_sav || 0))
      .slice(0, 12)
      .map(a => ({ name: a.agency_name.length > 12 ? a.agency_name.slice(0, 12) + '...' : a.agency_name, tauxSav: a.taux_sav || 0 })),
    [agences]
  );

  // One-shot vs multi-visites
  const qualiteData = useMemo(() =>
    agences
      .filter(a => a.taux_one_shot !== null)
      .slice(0, 10)
      .map(a => ({
        name: a.agency_name.length > 10 ? a.agency_name.slice(0, 10) + '...' : a.agency_name,
        oneShot: a.taux_one_shot || 0,
        multiVisites: a.taux_multi_visites || 0,
      })),
    [agences]
  );

  // Scatter SAV vs CA
  const scatterData = useMemo(() =>
    agences
      .filter(a => a.taux_sav !== null && a.ca_periode !== null)
      .map(a => ({
        name: a.agency_name,
        x: a.taux_sav || 0,
        y: a.ca_periode || 0,
      })),
    [agences]
  );

  // Délais grouped bar
  const delaisData = useMemo(() =>
    agences
      .filter(a => a.delai_premier_devis !== null || a.delai_traitement_dossier !== null)
      .slice(0, 10)
      .map(a => ({
        name: a.agency_name.length > 10 ? a.agency_name.slice(0, 10) + '...' : a.agency_name,
        devis: a.delai_premier_devis || 0,
        traitement: a.delai_traitement_dossier || 0,
        ouverture: a.delai_ouverture_dossier || 0,
      })),
    [agences]
  );

  // Productivité CA/tech - inclure les agences même avec ca_par_technicien_actif null (afficher 0)
  const productiviteData = useMemo(() =>
    agences
      .filter(a => a.ca_par_technicien_actif !== null || a.nb_techniciens_actifs > 0)
      .sort((a, b) => (b.ca_par_technicien_actif || 0) - (a.ca_par_technicien_actif || 0))
      .slice(0, 12)
      .map(a => ({ name: a.agency_name.length > 12 ? a.agency_name.slice(0, 12) + '...' : a.agency_name, ca: a.ca_par_technicien_actif || 0 })),
    [agences]
  );

  // Techniciens actifs - inclure toutes les agences sélectionnées
  const techActifsData = useMemo(() =>
    agences
      .sort((a, b) => b.nb_techniciens_actifs - a.nb_techniciens_actifs)
      .slice(0, 12)
      .map(a => ({ name: a.agency_name.length > 12 ? a.agency_name.slice(0, 12) + '...' : a.agency_name, techs: a.nb_techniciens_actifs })),
    [agences]
  );

  // Radar data for agency profile
  const radarData = useMemo(() => {
    if (agences.length === 0) return [];
    
    // Calculate network averages
    const avgCaDossier = agences.reduce((sum, a) => sum + (a.ca_moyen_par_dossier || 0), 0) / agences.length;
    const avgTauxSav = agences.reduce((sum, a) => sum + (a.taux_sav || 0), 0) / agences.length;
    const avgOneShot = agences.reduce((sum, a) => sum + (a.taux_one_shot || 0), 0) / agences.length;
    const avgDelai = agences.reduce((sum, a) => sum + (a.delai_traitement_dossier || 0), 0) / agences.length;
    const avgCaTech = agences.reduce((sum, a) => sum + (a.ca_par_technicien_actif || 0), 0) / agences.length;

    // Take top agency for comparison
    const topAgency = agences[0];
    if (!topAgency) return [];

    // Normalize values (0-100 scale)
    const normalize = (val: number, max: number) => max > 0 ? Math.min((val / max) * 100, 100) : 0;

    return [
      { subject: 'CA/Dossier', agence: normalize(topAgency.ca_moyen_par_dossier || 0, avgCaDossier * 2), reseau: 50, fullMark: 100 },
      { subject: 'Qualité (100-SAV)', agence: Math.max(0, 100 - (topAgency.taux_sav || 0)), reseau: Math.max(0, 100 - avgTauxSav), fullMark: 100 },
      { subject: 'One-shot', agence: topAgency.taux_one_shot || 0, reseau: avgOneShot, fullMark: 100 },
      { subject: 'Réactivité (100-délai)', agence: Math.max(0, 100 - (topAgency.delai_traitement_dossier || 0) * 2), reseau: Math.max(0, 100 - avgDelai * 2), fullMark: 100 },
      { subject: 'CA/Tech', agence: normalize(topAgency.ca_par_technicien_actif || 0, avgCaTech * 2), reseau: 50, fullMark: 100 },
    ];
  }, [agences]);

  // TOP 10 techniciens individuels (CA par technicien)
  const topTechniciensData = useMemo(() =>
    technicienStats
      .slice(0, 10)
      .map(tech => ({
        name: tech.technicienNom.length > 15 ? tech.technicienNom.slice(0, 15) + '...' : tech.technicienNom,
        fullName: tech.technicienNom,
        ca: tech.totaux.caHT,
        heures: tech.totaux.heures,
        agence: tech.agenceLabel || tech.agenceSlug || 'N/A',
      })),
    [technicienStats]
  );

  // Theme filter
  const showSection = (section: GraphTheme) => theme === 'all' || theme === section;

  if (isLoading) {
    return (
      <FranchiseurPageContainer>
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      </FranchiseurPageContainer>
    );
  }

  return (
    <FranchiseurPageContainer maxWidth="full">
      <FranchiseurPageHeader
        title="Graphiques Réseau"
        subtitle={<PeriodLabel from={dateStart} to={dateEnd} />}
        icon={<BarChart2 className="h-6 w-6 text-helpconfort-blue" />}
        actions={
          <Select value={theme} onValueChange={(v) => setTheme(v as GraphTheme)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par thème" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les graphiques</SelectItem>
              <SelectItem value="ca">CA & Volume</SelectItem>
              <SelectItem value="qualite">Qualité & SAV</SelectItem>
              <SelectItem value="apporteurs">Apporteurs</SelectItem>
              <SelectItem value="delais">Délais</SelectItem>
              <SelectItem value="productivite">Productivité</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* ================================================================ */}
      {/* BLOC CA & VOLUME */}
      {/* ================================================================ */}
      {showSection('ca') && (
        <>
          <SectionHeader title="CA & Volume" icon="📊" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Évolution CA mensuel */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Évolution du CA réseau sur l'année</CardTitle>
                <CardDescription>Histogramme + courbe de tendance mensuelle</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {caSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={caSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="ca" name="CA mensuel" fill={HELPCONFORT_BLUE} />
                      <Line type="monotone" dataKey="ca" name="Tendance" stroke={HELPCONFORT_ORANGE} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 2. Part de marché CA par agence (pie) */}
            <Card>
              <CardHeader>
                <CardTitle>Part de marché CA par agence</CardTitle>
                <CardDescription>Répartition du CA total par agence</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {partCAAgences.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={partCAAgences.slice(0, 8)}
                        dataKey="ca"
                        nameKey="agencyLabel"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ name, percent }) => `${name?.slice(0, 8)}... ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {partCAAgences.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 3. CA par agence (barres horizontales) */}
            <Card>
              <CardHeader>
                <CardTitle>CA par agence</CardTitle>
                <CardDescription>Top 15 agences par CA sur la période</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {caParAgenceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={caParAgenceData} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="ca" fill={HELPCONFORT_BLUE} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 4. CA moyen dossier vs intervention */}
            <Card>
              <CardHeader>
                <CardTitle>CA moyen par dossier vs intervention</CardTitle>
                <CardDescription>Comparaison par agence</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {caMoyenData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={caMoyenData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="caDossier" name="CA / Dossier" fill={HELPCONFORT_BLUE} />
                      <Bar dataKey="caIntervention" name="CA / Intervention" fill={HELPCONFORT_ORANGE} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 5. Volume dossiers vs interventions (stacked) */}
            <Card>
              <CardHeader>
                <CardTitle>Volume dossiers & interventions</CardTitle>
                <CardDescription>Répartition par agence</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {volumeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="dossiers" name="Dossiers" stackId="a" fill={HELPCONFORT_BLUE} />
                      <Bar dataKey="interventions" name="Interventions" stackId="a" fill={HELPCONFORT_ORANGE} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ================================================================ */}
      {/* BLOC QUALITÉ / SAV */}
      {/* ================================================================ */}
      {showSection('qualite') && (
        <>
          <SectionHeader title="Qualité & SAV" icon="✅" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 6. Évolution mensuelle taux SAV */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Évolution mensuelle du taux SAV réseau</CardTitle>
                <CardDescription>Pourcentage de dossiers avec SAV par mois</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {savSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={savSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                      <Tooltip formatter={(v: number) => formatPercent(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="tauxSAV" name="Taux SAV" stroke="#FF6B6B" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 7. Taux SAV par agence */}
            <Card>
              <CardHeader>
                <CardTitle>Taux SAV par agence</CardTitle>
                <CardDescription>Classement par taux SAV décroissant</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {savParAgenceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={savParAgenceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number) => formatPercent(v)} />
                      <Bar dataKey="tauxSav" name="Taux SAV" fill="#FF6B6B" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 8. Taux one-shot vs multi-visites */}
            <Card>
              <CardHeader>
                <CardTitle>One-shot vs Multi-visites</CardTitle>
                <CardDescription>Répartition par agence</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {qualiteData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={qualiteData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number) => formatPercent(v)} />
                      <Legend />
                      <Bar dataKey="oneShot" name="One-shot" stackId="a" fill="#00C49F" />
                      <Bar dataKey="multiVisites" name="Multi-visites" stackId="a" fill="#FFBB28" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 10. Scatter SAV vs CA */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Nuage de points : Taux SAV vs CA</CardTitle>
                <CardDescription>Chaque point = une agence (survol pour détails)</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {scatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="x" name="Taux SAV" unit="%" domain={[0, 'auto']} />
                      <YAxis type="number" dataKey="y" name="CA" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <ZAxis range={[100, 100]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(v: number, name: string) => 
                          name === 'Taux SAV' ? formatPercent(v) : formatCurrency(v)
                        }
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                      />
                      <Scatter name="Agences" data={scatterData} fill={HELPCONFORT_BLUE} />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ================================================================ */}
      {/* BLOC APPORTEURS */}
      {/* ================================================================ */}
      {showSection('apporteurs') && (
        <>
          <SectionHeader title="Apporteurs" icon="🤝" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 11. Top apporteurs CA */}
            <Card>
              <CardHeader>
                <CardTitle>Top apporteurs par CA</CardTitle>
                <CardDescription>Principaux apporteurs du réseau</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {topApporteurs.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topApporteurs} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="ca" fill={HELPCONFORT_ORANGE} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée apporteurs</div>
                )}
              </CardContent>
            </Card>

            {/* 12. Part CA apporteurs (pie) */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition CA apporteurs</CardTitle>
                <CardDescription>Top apporteurs vs Autres</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {topApporteurs.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topApporteurs.map((a, i) => ({ name: a.name, value: a.ca }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name?.slice(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {topApporteurs.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ================================================================ */}
      {/* BLOC DÉLAIS */}
      {/* ================================================================ */}
      {showSection('delais') && (
        <>
          <SectionHeader title="Délais & Process" icon="⏱️" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 16. Comparatif délais par agence */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Comparatif délais par agence</CardTitle>
                <CardDescription>Délai 1er devis, traitement dossier, ouverture (jours)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {delaisData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={delaisData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v}j`} />
                      <Tooltip formatter={(v: number) => formatDays(v)} />
                      <Legend />
                      <Bar dataKey="devis" name="Délai 1er devis" fill={HELPCONFORT_BLUE} />
                      <Bar dataKey="traitement" name="Délai traitement" fill={HELPCONFORT_ORANGE} />
                      <Bar dataKey="ouverture" name="Délai ouverture" fill="#82CA9D" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ================================================================ */}
      {/* BLOC PRODUCTIVITÉ */}
      {/* ================================================================ */}
      {showSection('productivite') && (
        <>
          <SectionHeader title="Productivité agences" icon="🚀" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 18. CA / technicien actif */}
            <Card>
              <CardHeader>
                <CardTitle>CA par technicien actif</CardTitle>
                <CardDescription>Performance individuelle moyenne</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {productiviteData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productiviteData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="ca" name="CA / Tech" fill={HELPCONFORT_BLUE} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 19. Nombre techniciens actifs */}
            <Card>
              <CardHeader>
                <CardTitle>Techniciens actifs par agence</CardTitle>
                <CardDescription>Effectif ayant au moins 1 intervention</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {techActifsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={techActifsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="techs" name="Techniciens actifs" fill={HELPCONFORT_ORANGE} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>

            {/* 20. TOP 10 Techniciens - CA individuel */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>TOP 10 Techniciens - CA individuel</CardTitle>
                <CardDescription>Performance individuelle des collaborateurs (CA HT)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {topTechniciensData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topTechniciensData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(v: number) => formatCurrency(v)}
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload;
                          if (item) return `${item.fullName} (${item.agence})`;
                          return '';
                        }}
                      />
                      <Legend />
                      <Bar dataKey="ca" name="CA HT" fill={HELPCONFORT_BLUE} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée technicien</div>
                )}
              </CardContent>
            </Card>

            {/* 21. Radar profil agence */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profil agence vs moyenne réseau</CardTitle>
                <CardDescription>Radar comparatif multi-axes (top agence vs réseau)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Top Agence" dataKey="agence" stroke={HELPCONFORT_BLUE} fill={HELPCONFORT_BLUE} fillOpacity={0.5} />
                      <Radar name="Moyenne Réseau" dataKey="reseau" stroke={HELPCONFORT_ORANGE} fill={HELPCONFORT_ORANGE} fillOpacity={0.3} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </FranchiseurPageContainer>
  );
}
