import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import {
  calculateSAVGlobalStats,
  calculateSAVByTypeApporteur,
  calculateSAVByTechnicien,
  calculateSAVByUnivers,
  calculateSAVByApporteur,
  calculateSAVMonthlyEvolution,
} from "@/apogee-connect/utils/savCalculations";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Users, Layers, CalendarDays } from "lucide-react";
import { formatEuros, formatUniverseLabel, formatApporteurType } from "@/apogee-connect/utils/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export default function IndicateursSAV() {
  const { isAgencyReady } = useAgency();
  const { isAuthLoading } = useAuth();
  const { filters } = useSecondaryFilters();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["apogee-sav-stats", filters.dateRange, selectedYear],
    queryFn: async () => {
      const rawData = await DataService.loadAllData();

      const globalStats = calculateSAVGlobalStats(
        rawData.projects,
        rawData.interventions,
        rawData.factures,
        filters.dateRange
      );

      const byTypeApporteur = calculateSAVByTypeApporteur(
        rawData.projects,
        rawData.clients,
        rawData.interventions,
        rawData.factures,
        filters.dateRange
      );

      const byTechnicien = calculateSAVByTechnicien(
        rawData.projects,
        rawData.interventions,
        rawData.factures,
        rawData.users,
        filters.dateRange
      );

      const byUnivers = calculateSAVByUnivers(
        rawData.projects,
        rawData.interventions,
        rawData.factures,
        filters.dateRange
      );

      const byApporteur = calculateSAVByApporteur(
        rawData.projects,
        rawData.clients,
        rawData.interventions,
        rawData.factures,
        filters.dateRange
      );

      const monthlyEvolution = calculateSAVMonthlyEvolution(
        rawData.projects,
        rawData.interventions,
        rawData.factures,
        selectedYear
      );

      return {
        globalStats,
        byTypeApporteur,
        byTechnicien,
        byUnivers,
        byApporteur,
        monthlyEvolution,
      };
    },
    enabled: isAgencyReady && !isAuthLoading,
  });

  if (isAuthLoading || !isAgencyReady) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const {
    globalStats,
    byTypeApporteur = [],
    byTechnicien = [],
    byUnivers = [],
    byApporteur = [],
    monthlyEvolution = [],
  } = data || {};

  return (
    <div className="space-y-8">
      {/* En-tête avec titre et sélecteur de période */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Les SAV
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Analyse complète des interventions SAV (Service Après-Vente)
          </p>
        </div>
        <SecondaryPeriodSelector />
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Globaux */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taux SAV Global</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                    {globalStats?.tauxSAV.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {globalStats?.nbSAVProjects} / {globalStats?.nbTotalProjects} dossiers
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CA SAV</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                    {formatEuros(globalStats?.caSAV || 0)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Chiffre d'affaires généré
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dossiers SAV</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    {globalStats?.nbSAVProjects || 0}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Projets avec intervention SAV
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <CalendarDays className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interventions SAV</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                    {globalStats?.nbInterventionsSAV || 0}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total interventions période
              </p>
            </Card>
          </div>

          {/* Évolution mensuelle */}
          <Card className="p-6 border-l-4 border-l-accent shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                  Évolution mensuelle des SAV
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Nombre de dossiers et taux SAV par mois
                </p>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border rounded-lg bg-background"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="nbSAV"
                  stroke="#ef4444"
                  name="Nb SAV"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tauxSAV"
                  stroke="#f97316"
                  name="Taux SAV (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* SAV par type apporteur */}
          <Card className="p-6 border-l-4 border-l-accent shadow-lg">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent mb-6">
              SAV par type d'apporteur
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byTypeApporteur.map(item => ({ ...item, type: formatApporteurType(item.type) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tauxSAV" fill="#ef4444" name="Taux SAV (%)" />
                <Bar dataKey="nbSAVProjects" fill="#f97316" name="Nb dossiers SAV" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* SAV par univers - Tuiles */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent mb-2">
                SAV par univers
              </h2>
              <p className="text-sm text-muted-foreground">
                Analyse du taux de SAV et du CA par univers métier
              </p>
            </div>

            {/* Grille de tuiles par univers */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {byUnivers.map((item) => {
                const isHighRate = item.tauxSAV > 15;
                const colorClass = isHighRate 
                  ? "from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-l-red-500"
                  : "from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-l-green-500";
                
                return (
                  <Card 
                    key={item.univers} 
                    className={`p-5 bg-gradient-to-br ${colorClass} border-l-4 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]`}
                  >
                    <div className="space-y-3">
                      {/* Titre univers */}
                      <div className="flex items-center gap-2">
                        <Layers className={`w-5 h-5 ${isHighRate ? 'text-red-600' : 'text-green-600'}`} />
                        <h3 className="font-bold text-sm">{formatUniverseLabel(item.univers)}</h3>
                      </div>

                      {/* Taux SAV principal */}
                      <div>
                        <p className="text-xs text-muted-foreground">Taux SAV</p>
                        <p className={`text-3xl font-bold bg-gradient-to-r ${isHighRate ? 'from-red-600 to-red-800' : 'from-green-600 to-green-800'} bg-clip-text text-transparent`}>
                          {item.tauxSAV.toFixed(1)}%
                        </p>
                      </div>

                      {/* Indicateurs secondaires */}
                      <div className="pt-2 border-t space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Dossiers SAV</span>
                          <Badge variant={isHighRate ? "destructive" : "secondary"} className="font-mono">
                            {item.nbProjectsSAV}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">CA SAV</span>
                          <span className="text-sm font-semibold">{formatEuros(item.caSAV)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Graphique comparatif */}
            <Card className="p-6 border-l-4 border-l-accent shadow-lg">
              <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent mb-4">
                Comparaison taux SAV par univers
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={byUnivers.map(item => ({ 
                  ...item, 
                  univers: formatUniverseLabel(item.univers) 
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="univers" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "CA SAV") return [formatEuros(value), name];
                      if (name === "Taux SAV (%)") return [value.toFixed(1) + "%", name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="tauxSAV" fill="#ef4444" name="Taux SAV (%)" />
                  <Bar dataKey="nbProjectsSAV" fill="#f97316" name="Dossiers SAV" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* SAV par technicien */}
          <Card className="p-6 border-l-4 border-l-accent shadow-lg">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent mb-6">
              SAV par technicien (responsable = dernier intervenu)
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technicien</TableHead>
                    <TableHead className="text-right">Dossiers SAV</TableHead>
                    <TableHead className="text-right">Interventions SAV</TableHead>
                    <TableHead className="text-right">Heures SAV</TableHead>
                    <TableHead className="text-right">CA SAV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byTechnicien.map((item) => (
                    <TableRow key={item.technicienId}>
                      <TableCell className="font-medium">{item.technicienNom}</TableCell>
                      <TableCell className="text-right">{item.nbProjectsSAV}</TableCell>
                      <TableCell className="text-right">{item.nbInterventionsSAV}</TableCell>
                      <TableCell className="text-right">{item.heuresSAV}h</TableCell>
                      <TableCell className="text-right">{formatEuros(item.caSAV)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* SAV par apporteur (TOP 20) */}
          <Card className="p-6 border-l-4 border-l-accent shadow-lg">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent mb-6">
              TOP 20 Apporteurs avec SAV
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apporteur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Dossiers SAV</TableHead>
                    <TableHead className="text-right">Taux SAV</TableHead>
                    <TableHead className="text-right">CA SAV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byApporteur.slice(0, 20).map((item) => (
                    <TableRow key={item.apporteurId}>
                      <TableCell className="font-medium">{item.apporteurNom}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatApporteurType(item.type)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.nbProjectsSAV}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.tauxSAV > 20 ? "destructive" : "secondary"}>
                          {item.tauxSAV.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatEuros(item.caSAV)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
