import { useState } from "react";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import { useStatiaSAVMetrics } from "@/statia/hooks/useStatiaSAVMetrics";
import { SAVDossierList } from "@/apogee-connect/components/sav/SAVDossierList";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Users, Layers, ChevronDown, ChevronUp } from "lucide-react";
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/config/routes";

export default function IndicateursSAV() {
  const { isAgencyReady } = useAgency();
  const { isAuthLoading } = useAuth();
  const [showAllApporteurs, setShowAllApporteurs] = useState(false);

  const { data, isLoading } = useStatiaSAVMetrics();

  if (isAuthLoading || !isAgencyReady) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const {
    tauxSavGlobal = 0,
    nbSavGlobal = 0,
    tauxSavParUnivers = {},
    tauxSavParApporteur = {},
    tauxSavParTypeApporteur = {},
    caSav = 0,
    coutSavEstime = 0,
    dossiersSAV = [],
  } = data || {};

  // Préparer données pour camemberts
  const universData = Object.entries(tauxSavParUnivers)
    .filter(([_, v]) => v.sav > 0)
    .map(([univers, stats]) => ({
      name: formatUniverseLabel(univers),
      value: stats.sav,
      taux: stats.taux,
      total: stats.total,
    }));

  const typeApporteurData = Object.entries(tauxSavParTypeApporteur)
    .filter(([_, v]) => v.sav > 0)
    .map(([type, stats]) => ({
      name: formatApporteurType(type),
      value: stats.sav,
      taux: stats.taux,
      total: stats.total,
    }));

  const apporteurList = Object.entries(tauxSavParApporteur)
    .filter(([_, v]) => v.sav > 0)
    .map(([nom, stats]) => ({
      nom,
      sav: stats.sav,
      total: stats.total,
      taux: stats.taux,
    }))
    .sort((a, b) => b.sav - a.sav);

  const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#06b6d4", "#8b5cf6", "#ec4899", "#f43f5e"];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title="Gestion des SAV"
        subtitle="Suivi et analyse des dossiers de service après-vente"
        backTo={ROUTES.pilotage.index}
        backLabel="Mon Agence"
        rightElement={<SecondaryPeriodSelector />}
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Globaux */}
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
                    {tauxSavGlobal.toFixed(1)}%
                  </p>
                </div>
              </div>
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
                  <p className="text-sm font-medium text-muted-foreground">Coût moyen / dossier</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {nbSavGlobal > 0 ? formatEuros(coutSavEstime / nbSavGlobal) : "–"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Total: {formatEuros(coutSavEstime)} sur {nbSavGlobal} dossiers
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
                    {nbSavGlobal}
                  </p>
                </div>
              </div>
            </div>

            <div className="group rounded-xl border border-rose-200 p-5
              bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-rose-100/50 via-white to-white
              shadow-sm transition-all duration-300 border-l-4 border-l-rose-500
              hover:from-rose-200/50 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-rose-300 flex items-center justify-center
                  group-hover:border-rose-500 group-hover:bg-white transition-all">
                  <Layers className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CA Impacté</p>
                  <p className="text-2xl font-bold text-rose-600">
                    {formatEuros(caSav)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                CA des dossiers avec SAV
              </p>
            </div>
          </div>

          {/* SAV par type apporteur et par univers - Camemberts côte à côte */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* SAV par type apporteur */}
            <Card className="p-6 border-l-4 border-l-accent shadow-lg">
              <h2 className="text-lg font-bold bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent mb-4">
                SAV par type d'apporteur
              </h2>
              {typeApporteurData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeApporteurData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeApporteurData.map((_, index) => (
                        <Cell key={`cell-type-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, entry: any) => {
                        const total = typeApporteurData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                        return [
                          <>
                            <div>{value} dossiers ({percentage}%)</div>
                            <div>Taux SAV: {entry.payload.taux.toFixed(1)}%</div>
                          </>,
                          name,
                        ];
                      }}
                    />
                    <Legend formatter={(value: string, entry: any) => `${value} (${entry.payload.value})`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Aucun SAV détecté sur la période
                </div>
              )}
            </Card>

            {/* SAV par univers */}
            <Card className="p-6 border-l-4 border-l-accent shadow-lg">
              <h2 className="text-lg font-bold bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent mb-4">
                SAV par univers
              </h2>
              {universData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={universData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {universData.map((_, index) => (
                        <Cell key={`cell-univers-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, entry: any) => {
                        const total = universData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                        return [
                          <>
                            <div>{value} dossiers ({percentage}%)</div>
                            <div>Taux SAV: {entry.payload.taux.toFixed(1)}%</div>
                          </>,
                          name,
                        ];
                      }}
                    />
                    <Legend formatter={(value: string, entry: any) => `${value} (${entry.payload.value})`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Aucun SAV détecté sur la période
                </div>
              )}
            </Card>
          </div>

          {/* SAV par apporteur - Liste */}
          <Card className="p-6 border-l-4 border-l-accent shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
                SAV par apporteurs
              </h2>
              {apporteurList.length > 5 && (
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
                      Voir plus ({apporteurList.length - 5} autres)
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
                    <TableHead className="text-right">Dossiers SAV</TableHead>
                    <TableHead className="text-right">Total dossiers</TableHead>
                    <TableHead className="text-right">Taux SAV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showAllApporteurs ? apporteurList : apporteurList.slice(0, 5)).map((item) => (
                    <TableRow key={item.nom}>
                      <TableCell className="font-medium">{item.nom}</TableCell>
                      <TableCell className="text-right">{item.sav}</TableCell>
                      <TableCell className="text-right">{item.total}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.taux > 20 ? "destructive" : "secondary"}>
                          {item.taux.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Liste des dossiers SAV avec gestion */}
          <SAVDossierList dossiers={dossiersSAV} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}
