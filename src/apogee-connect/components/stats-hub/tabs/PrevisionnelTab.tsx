import { useMemo, useState } from 'react';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useChargeTravauxAVenir } from '@/statia/hooks/useChargeTravauxAVenir';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, FolderOpen, Layers, ChevronDown, ChevronUp, Users, Package, ShoppingCart, ClipboardList } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Button } from '@/components/ui/button';

// Tooltip explicatif pour Heures Technicien
const HeuresTechTooltip = () => (
  <div className="space-y-3 max-w-xs">
    <p className="font-medium">Heures Technicien = Σ (nbHeures × nbTechs)</p>
    <p className="text-xs text-muted-foreground">
      Charge de main d'œuvre réelle : temps cumulé de travail de tous les techniciens mobilisés.
    </p>
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-muted">
          <th className="text-left py-1">Dossier</th>
          <th className="text-right py-1">Heures</th>
          <th className="text-right py-1">Techs</th>
          <th className="text-right py-1 font-bold">H. Tech</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>A</td><td className="text-right">6h</td><td className="text-right">1</td><td className="text-right font-medium">6h</td></tr>
        <tr><td>B</td><td className="text-right">8h</td><td className="text-right">2</td><td className="text-right font-medium">16h</td></tr>
        <tr><td>C</td><td className="text-right">4h</td><td className="text-right">3</td><td className="text-right font-medium">12h</td></tr>
        <tr className="border-t border-muted font-bold">
          <td>Total</td><td className="text-right">18h</td><td></td><td className="text-right">34h</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// Tooltip explicatif pour Heures RDV
const HeuresRdvTooltip = () => (
  <div className="space-y-3 max-w-xs">
    <p className="font-medium">Heures RDV = Σ nbHeures</p>
    <p className="text-xs text-muted-foreground">
      Durée brute des interventions : temps que va durer chaque RDV, indépendamment du nombre de techniciens.
    </p>
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-muted">
          <th className="text-left py-1">Dossier</th>
          <th className="text-right py-1">Heures</th>
          <th className="text-right py-1">Techs</th>
          <th className="text-right py-1 font-bold">H. RDV</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>A</td><td className="text-right">6h</td><td className="text-right">1</td><td className="text-right font-medium">6h</td></tr>
        <tr><td>B</td><td className="text-right">8h</td><td className="text-right">2</td><td className="text-right font-medium">8h</td></tr>
        <tr><td>C</td><td className="text-right">4h</td><td className="text-right">3</td><td className="text-right font-medium">4h</td></tr>
        <tr className="border-t border-muted font-bold">
          <td>Total</td><td></td><td></td><td className="text-right">18h</td>
        </tr>
      </tbody>
    </table>
  </div>
);

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

const ETAT_CONFIG: Record<string, { color: string; icon: typeof Clock; bgClass: string }> = {
  'to_planify_tvx': { color: '#3b82f6', icon: ClipboardList, bgClass: 'bg-blue-500/10' },
  'devis_to_order': { color: '#f59e0b', icon: ShoppingCart, bgClass: 'bg-amber-500/10' },
  'wait_fourn': { color: '#8b5cf6', icon: Package, bgClass: 'bg-purple-500/10' },
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
    if (!data?.parEtat) return [];
    return data.parEtat.filter(e => e.totalHeuresTech > 0).map(e => ({
      name: e.etatLabel,
      value: Math.round(e.totalHeuresTech * 10) / 10,
      color: ETAT_CONFIG[e.etat]?.color || '#6b7280'
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
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-28" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  const { totaux, parUnivers, parEtat, parProjet, debug } = data || {
    totaux: { totalHeuresRdv: 0, totalHeuresTech: 0, totalNbTechs: 0, nbDossiers: 0 },
    parUnivers: [],
    parEtat: [],
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
      {/* Cards par État */}
      <div className="grid gap-4 md:grid-cols-3">
        {parEtat.map((etatStats) => {
          const config = ETAT_CONFIG[etatStats.etat] || { color: '#6b7280', icon: FolderOpen, bgClass: 'bg-muted' };
          const Icon = config.icon;
          return (
            <motion.div key={etatStats.etat} variants={itemVariants}>
              <Card className={`border-l-4 ${config.bgClass}`} style={{ borderLeftColor: config.color }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{etatStats.etatLabel}</CardTitle>
                  <Icon className="h-5 w-5" style={{ color: config.color }} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" style={{ color: config.color }}>{etatStats.nbDossiers}</div>
                  <p className="text-sm text-muted-foreground mt-1">dossiers</p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{Math.round(etatStats.totalHeuresTech)}h</span>
                      <span className="text-muted-foreground">tech</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{etatStats.totalNbTechs}</span>
                      <span className="text-muted-foreground">techs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {parEtat.length === 0 && (
          <motion.div variants={itemVariants} className="col-span-3">
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun dossier en attente de travaux
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Total Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-helpconfort-blue/10 to-helpconfort-orange/10 border-helpconfort-blue/30">
          <CardContent className="py-4">
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
                    <span className="text-2xl font-bold">{totaux.nbDossiers}</span>
                    <span className="text-muted-foreground">dossiers total</span>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <Clock className="h-5 w-5 text-helpconfort-orange" />
                        <span className="text-2xl font-bold">{Math.round(totaux.totalHeuresTech)}h</span>
                        <span className="text-muted-foreground">heures technicien</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="p-4">
                      <HeuresTechTooltip />
                    </TooltipContent>
                  </Tooltip>
                  <div className="h-8 w-px bg-border" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <Calendar className="h-5 w-5 text-cyan-500" />
                        <span className="text-2xl font-bold">{Math.round(totaux.totalHeuresRdv)}h</span>
                        <span className="text-muted-foreground">heures RDV</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="p-4">
                      <HeuresRdvTooltip />
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-500" />
                  <span className="text-lg font-semibold">{parUnivers.length}</span>
                  <span className="text-muted-foreground">univers</span>
                </div>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </motion.div>

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
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}h`, 'Heures Tech']}
                    />
                    <Bar 
                      dataKey="heuresTech" 
                      radius={[0, 4, 4, 0]}
                      animationDuration={2500}
                      animationEasing="ease-out"
                    >
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
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${value}h`}
                      animationDuration={2500}
                      animationEasing="ease-out"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
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
                {visibleDossiers.map((d) => {
                  const etatConfig = ETAT_CONFIG[d.etatWorkflow] || { color: '#6b7280' };
                  return (
                    <TableRow key={d.projectId}>
                      <TableCell className="font-mono text-xs">{d.reference || d.projectId}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{d.label || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: etatConfig.color, color: etatConfig.color }}
                        >
                          {d.etatWorkflowLabel}
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
                  );
                })}
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
