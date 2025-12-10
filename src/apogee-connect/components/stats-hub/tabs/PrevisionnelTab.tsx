import { useMemo, useState } from 'react';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useChargeTravauxAVenir } from '@/statia/hooks/useChargeTravauxAVenir';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, FolderOpen, Layers, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Button } from '@/components/ui/button';

const UNIVERS_COLORS: Record<string, string> = {
  'Plomberie': '#3b82f6',
  'Électricité': '#f59e0b',
  'Serrurerie': '#10b981',
  'Vitrerie': '#8b5cf6',
  'Multiservice': '#ec4899',
  'Rénovation': '#06b6d4',
  'PMR': '#84cc16',
  'Recherche de fuite': '#f43f5e',
  'Non classé': '#6b7280',
};

const ETAT_COLORS: Record<string, string> = {
  'À planifier TVX': '#3b82f6',
  'À commander': '#f59e0b',
  'En attente fournitures': '#8b5cf6',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function PrevisionnelTab() {
  const { isAgencyReady } = useAgency();
  const { data, isLoading } = useChargeTravauxAVenir();
  const [showAllDossiers, setShowAllDossiers] = useState(false);

  const chartData = useMemo(() => {
    if (!data?.parUnivers) return [];
    return data.parUnivers.map(u => ({
      name: u.univers,
      heuresTech: Math.round(u.totalHeuresTech * 10) / 10,
      heuresRdv: Math.round(u.totalHeuresRdv * 10) / 10,
      dossiers: u.nbDossiers,
      color: UNIVERS_COLORS[u.univers] || '#6b7280'
    }));
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.parUnivers) return [];
    return data.parUnivers.filter(u => u.totalHeuresTech > 0).map(u => ({
      name: u.univers,
      value: Math.round(u.totalHeuresTech * 10) / 10,
      color: UNIVERS_COLORS[u.univers] || '#6b7280'
    }));
  }, [data]);

  const etatChartData = useMemo(() => {
    if (!data?.parUnivers) return [];
    const totaux = {
      'À planifier TVX': 0,
      'À commander': 0,
      'En attente fournitures': 0
    };
    data.parUnivers.forEach(u => {
      totaux['À planifier TVX'] += u.totalHeuresTech_A_planifier_TVX;
      totaux['À commander'] += u.totalHeuresTech_A_commander;
      totaux['En attente fournitures'] += u.totalHeuresTech_En_attente_fournitures;
    });
    return Object.entries(totaux).filter(([_, v]) => v > 0).map(([name, value]) => ({
      name,
      value: Math.round(value * 10) / 10,
      color: ETAT_COLORS[name]
    }));
  }, [data]);

  const visibleDossiers = useMemo(() => {
    if (!data?.parProjet) return [];
    const sorted = [...data.parProjet].sort((a, b) => b.totalHeuresTech - a.totalHeuresTech);
    return showAllDossiers ? sorted : sorted.slice(0, 10);
  }, [data, showAllDossiers]);

  if (!isAgencyReady || isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  const { totaux, parUnivers, parProjet, debug } = data || {
    totaux: { totalHeuresRdv: 0, totalHeuresTech: 0, nbDossiers: 0 },
    parUnivers: [],
    parProjet: [],
    debug: { totalProjects: 0, projectsEligibleState: 0, projectsAvecRT: 0, rtBlocksCount: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures Technicien</CardTitle>
              <Clock className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(totaux.totalHeuresTech)}h</div>
              <p className="text-xs text-muted-foreground">charge à venir</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures RDV</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(totaux.totalHeuresRdv)}h</div>
              <p className="text-xs text-muted-foreground">à programmer</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dossiers</CardTitle>
              <FolderOpen className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totaux.nbDossiers}</div>
              <p className="text-xs text-muted-foreground">en attente travaux</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Univers</CardTitle>
              <Layers className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parUnivers.length}</div>
              <p className="text-xs text-muted-foreground">concernés</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar Chart - Charge par Univers */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Charge par Univers (heures tech)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}h`, 'Heures Tech']}
                    />
                    <Bar dataKey="heuresTech" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Aucune charge à venir
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - Répartition par État */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Répartition par État</CardTitle>
            </CardHeader>
            <CardContent>
              {etatChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={etatChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${value}h`}
                    >
                      {etatChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}h`, '']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Table - Détail par Univers */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Détail par Univers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Univers</TableHead>
                  <TableHead className="text-right">Dossiers</TableHead>
                  <TableHead className="text-right">Heures RDV</TableHead>
                  <TableHead className="text-right">Heures Tech</TableHead>
                  <TableHead className="text-right">À planifier</TableHead>
                  <TableHead className="text-right">À commander</TableHead>
                  <TableHead className="text-right">Fournitures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parUnivers.map((u) => (
                  <TableRow key={u.univers}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: UNIVERS_COLORS[u.univers] || '#6b7280' }}
                        />
                        {u.univers}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{u.nbDossiers}</TableCell>
                    <TableCell className="text-right">{Math.round(u.totalHeuresRdv * 10) / 10}h</TableCell>
                    <TableCell className="text-right font-semibold">{Math.round(u.totalHeuresTech * 10) / 10}h</TableCell>
                    <TableCell className="text-right text-blue-600">
                      {u.totalHeuresTech_A_planifier_TVX > 0 && `${Math.round(u.totalHeuresTech_A_planifier_TVX * 10) / 10}h`}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      {u.totalHeuresTech_A_commander > 0 && `${Math.round(u.totalHeuresTech_A_commander * 10) / 10}h`}
                    </TableCell>
                    <TableCell className="text-right text-purple-600">
                      {u.totalHeuresTech_En_attente_fournitures > 0 && `${Math.round(u.totalHeuresTech_En_attente_fournitures * 10) / 10}h`}
                    </TableCell>
                  </TableRow>
                ))}
                {parUnivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucun dossier en attente de travaux
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table - Liste des Dossiers */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Liste des Dossiers ({parProjet.length})</CardTitle>
            {parProjet.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllDossiers(!showAllDossiers)}
              >
                {showAllDossiers ? (
                  <>Réduire <ChevronUp className="ml-1 h-4 w-4" /></>
                ) : (
                  <>Voir tout <ChevronDown className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Univers</TableHead>
                  <TableHead className="text-right">Heures RDV</TableHead>
                  <TableHead className="text-right">Heures Tech</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDossiers.map((d) => (
                  <TableRow key={d.projectId}>
                    <TableCell className="font-mono text-xs">{d.reference || d.projectId}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{d.label || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{ borderColor: ETAT_COLORS[d.etatWorkflow] || '#6b7280', color: ETAT_COLORS[d.etatWorkflow] || '#6b7280' }}
                      >
                        {d.etatWorkflow}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {d.universes.map((u) => (
                          <Badge key={u} variant="secondary" className="text-xs">
                            {u}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{d.totalHeuresRdv > 0 ? `${d.totalHeuresRdv}h` : '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{d.totalHeuresTech > 0 ? `${d.totalHeuresTech}h` : '—'}</TableCell>
                  </TableRow>
                ))}
                {visibleDossiers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun dossier en attente
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Debug Info */}
      {debug && (
        <motion.div variants={itemVariants}>
          <Card className="bg-muted/50">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">
                Debug: {debug.totalProjects} projets analysés • {debug.projectsEligibleState} éligibles • {debug.projectsAvecRT} avec RT • {debug.rtBlocksCount} blocs RT
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
