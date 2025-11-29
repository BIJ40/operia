import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { buildTechMap } from "@/apogee-connect/utils/techTools";
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
import { AlertTriangle, TrendingUp, Users, Layers, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function IndicateursSAV() {
  const { isAgencyReady } = useAgency();
  const { isAuthLoading } = useAuth();
  const { filters } = useSecondaryFilters();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAllApporteurs, setShowAllApporteurs] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["apogee-sav-stats", filters.dateRange, selectedYear],
    queryFn: async () => {
      const rawData = await DataService.loadAllData();

      // Construire le mapping des techniciens
      const TECHS = buildTechMap(rawData.users || []);

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
        TECHS,
        rawData.clients || [],
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
        TECHS,
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
    TECHS = {},
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
          {/* KPI Globaux - Dégradés rouges */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="group rounded-xl border border-red-200 p-5
              bg-gradient-to-br from-white to-red-50
              shadow-sm transition-all duration-300 border-l-4 border-l-red-500
              hover:to-red-100 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-red-300 flex items-center justify-center
                  group-hover:border-red-500 group-hover:bg-white/50 transition-all">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taux SAV Global</p>
                  <p className="text-2xl font-bold text-red-600">
                    {globalStats?.tauxSAV.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {globalStats?.nbSAVProjects} / {globalStats?.nbTotalProjects} dossiers
              </p>
            </div>

            <div className="group rounded-xl border border-orange-200 p-5
              bg-gradient-to-b from-orange-50/50 to-white
              shadow-sm transition-all duration-300 border-l-4 border-l-orange-500
              hover:from-orange-100/50 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border-2 border-orange-300 flex items-center justify-center
                  group-hover:border-orange-500 group-hover:bg-white transition-all">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CA SAV</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatEuros(globalStats?.caSAV || 0)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Chiffre d'affaires généré
              </p>
            </div>

            <div className="group rounded-xl border border-red-200/50 p-5
              bg-gradient-to-r from-red-50/30 to-white
              shadow-sm transition-all duration-300 border-l-4 border-l-red-400
              hover:from-red-100/50 hover:border-l-red-500 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-red-300 flex items-center justify-center
                  group-hover:border-red-500 group-hover:bg-white transition-all">
                  <Users className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dossiers SAV</p>
                  <p className="text-2xl font-bold text-red-500">
                    {globalStats?.nbSAVProjects || 0}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Dossiers avec intervention SAV
              </p>
            </div>

            <div className="group rounded-xl border border-rose-200 p-5
              bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-rose-100/50 via-white to-white
              shadow-sm transition-all duration-300 border-l-4 border-l-rose-500
              hover:from-rose-200/50 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-rose-300 flex items-center justify-center
                  group-hover:border-rose-500 group-hover:bg-white transition-all">
                  <CalendarDays className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interventions SAV</p>
                  <p className="text-2xl font-bold text-rose-600">
                    {globalStats?.nbInterventionsSAV || 0}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Total interventions période
              </p>
            </div>
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

          {/* SAV par type apporteur et par univers - Camemberts côte à côte */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* SAV par type apporteur */}
            <Card className="p-6 border-l-4 border-l-accent shadow-lg">
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent mb-4">
                SAV par type d'apporteur
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byTypeApporteur
                      .filter(item => item.nbSAVProjects > 0)
                      .map(item => ({
                        name: formatApporteurType(item.type),
                        value: item.nbSAVProjects,
                        tauxSAV: item.tauxSAV,
                        caSAV: item.caSAV,
                      }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {byTypeApporteur.filter(item => item.nbSAVProjects > 0).map((entry, index) => {
                      const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#06b6d4", "#8b5cf6", "#ec4899"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, entry: any) => {
                      const total = byTypeApporteur
                        .filter(item => item.nbSAVProjects > 0)
                        .reduce((sum, item) => sum + item.nbSAVProjects, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                      return [
                        <>
                          <div>{value} dossiers ({percentage}%)</div>
                          <div>Taux SAV: {entry.payload.tauxSAV.toFixed(1)}%</div>
                          <div>CA: {formatEuros(entry.payload.caSAV)}</div>
                        </>,
                        name
                      ];
                    }}
                  />
                  <Legend 
                    formatter={(value: string, entry: any) => {
                      return `${value} (${entry.payload.value})`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* SAV par univers */}
            <Card className="p-6 border-l-4 border-l-accent shadow-lg">
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent mb-4">
                SAV par univers
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byUnivers
                      .filter((item) => item.nbProjectsSAV > 0 && item.univers.toLowerCase() !== "non défini")
                      .map(item => ({
                        name: formatUniverseLabel(item.univers),
                        value: item.nbProjectsSAV,
                        tauxSAV: item.tauxSAV,
                        caSAV: item.caSAV,
                      }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {byUnivers.filter((item) => item.nbProjectsSAV > 0 && item.univers.toLowerCase() !== "non défini").map((entry, index) => {
                      const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#06b6d4", "#8b5cf6", "#ec4899", "#f43f5e"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, entry: any) => {
                      const total = byUnivers
                        .filter((item) => item.nbProjectsSAV > 0 && item.univers.toLowerCase() !== "non défini")
                        .reduce((sum, item) => sum + item.nbProjectsSAV, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                      return [
                        <>
                          <div>{value} dossiers ({percentage}%)</div>
                          <div>Taux SAV: {entry.payload.tauxSAV.toFixed(1)}%</div>
                          <div>CA: {formatEuros(entry.payload.caSAV)}</div>
                        </>,
                        name
                      ];
                    }}
                  />
                  <Legend 
                    formatter={(value: string, entry: any) => {
                      return `${value} (${entry.payload.value})`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* SAV par technicien */}
          <Card className="p-6 border-l-4 border-l-accent shadow-lg">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent mb-6">
              Technicien impliqué
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
                  <TooltipProvider>
                    {byTechnicien.map((item) => {
                      const techIdNum = parseInt(item.technicienId, 10);
                      const techInfo = TECHS[techIdNum];
                      const color = techInfo?.color || "#808080";
                      
                      return (
                        <UITooltip key={item.technicienId}>
                          <TooltipTrigger asChild>
                            <TableRow className="cursor-help hover:bg-muted/50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: color }}
                                  />
                                  {item.technicienNom}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.nbProjectsSAV}</TableCell>
                              <TableCell className="text-right">{item.nbInterventionsSAV}</TableCell>
                              <TableCell className="text-right">{item.heuresSAV}h</TableCell>
                              <TableCell className="text-right">{formatEuros(item.caSAV)}</TableCell>
                            </TableRow>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-md p-4">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm mb-2">Dossiers SAV de {item.technicienNom}</h4>
                              {item.dossiers && item.dossiers.length > 0 ? (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                  {item.dossiers.map((dossier, idx) => (
                                    <div key={idx} className="text-xs border-l-2 border-primary pl-2 py-1">
                                      <div className="font-medium">#{dossier.projectId} - {dossier.projectName}</div>
                                      <div className="text-muted-foreground">Client: {dossier.clientName}</div>
                                      <div className="text-muted-foreground">
                                        Univers: {dossier.universes.map(u => formatUniverseLabel(u)).join(", ") || "Non défini"}
                                      </div>
                                      <div className="text-muted-foreground">
                                        Type: {formatApporteurType(dossier.apporteurType)}
                                      </div>
                                      <div className="font-semibold text-primary">CA SAV: {formatEuros(dossier.caSAV)}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">Aucun détail disponible</div>
                              )}
                            </div>
                          </TooltipContent>
                        </UITooltip>
                      );
                    })}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* SAV par apporteur */}
          <Card className="p-6 border-l-4 border-l-accent shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                SAV par apporteurs
              </h2>
              {byApporteur.length > 5 && (
                <button
                  onClick={() => setShowAllApporteurs(!showAllApporteurs)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  {showAllApporteurs ? (
                    <>
                      Voir moins
                      <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      Voir plus ({byApporteur.length - 5} autres)
                      <ChevronDown size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
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
                  {(showAllApporteurs ? byApporteur : byApporteur.slice(0, 5)).map((item) => (
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
