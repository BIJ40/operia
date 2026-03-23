import { useMemo, useState } from 'react';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useChargeTravauxAVenir } from '@/statia/hooks/useChargeTravauxAVenir';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, FolderOpen, Layers, ChevronDown, ChevronUp, Users, Package, ShoppingCart, ClipboardList, Euro } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
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
import { CAPlanifieCard } from '../CAPlanifieCard';
import { PilotageAvanceSection } from '../previsionnel/PilotageAvanceSection';
import { EtatDetailDialog } from '../EtatDetailDialog';
import { DossiersExplorerDialog } from '../DossiersExplorerDialog';

// Formatage monétaire
const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${Math.round(value)}€`;
};

// Tooltip explicatif pour Heures Homme
const HeuresHommeTooltip = () => (
  <div className="space-y-3 max-w-xs">
    <p className="font-medium">Heures Homme = Σ (nbHeures × nbTechs)</p>
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

// Tooltip explicatif pour Durée totale inter
const DureeTotaleInterTooltip = () => (
  <div className="space-y-3 max-w-xs">
    <p className="font-medium">Durée totale inter = Σ nbHeures</p>
    <p className="text-xs text-muted-foreground">
      Durée brute des interventions : temps que va durer chaque intervention, indépendamment du nombre de techniciens.
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

// Tooltip explicatif pour CA devis estimé
const CADevisTooltip = () => (
  <div className="space-y-2 max-w-xs">
    <p className="font-medium">CA Devis estimé = Σ devis.totalHT</p>
    <p className="text-xs text-muted-foreground">
      Somme des montants HT des devis associés aux dossiers en attente de travaux.
    </p>
    <p className="text-xs text-muted-foreground">
      États inclus : envoyé, accepté, commandé, facturé.
      <br/>États exclus : brouillon, rejeté, annulé.
    </p>
  </div>
);

// Palette warm dashboard pour univers
const UNIVERS_COLORS: Record<string, string> = {
  'Plomberie': 'hsl(200, 85%, 60%)',      // warm-blue
  'Électricité': 'hsl(35, 90%, 60%)',     // warm-orange
  'Serrurerie': 'hsl(145, 60%, 55%)',     // warm-green
  'Vitrerie': 'hsl(270, 60%, 65%)',       // warm-purple
  'Multiservice': 'hsl(340, 70%, 65%)',   // warm-pink
  'Rénovation': 'hsl(175, 60%, 50%)',     // warm-teal
  'Aménagement PMR': 'hsl(100, 55%, 55%)',            // soft lime
  'Recherche de fuite': 'hsl(350, 65%, 60%)', // coral
  'Non classé': 'hsl(210, 10%, 60%)',     // neutral gray
};

const ETAT_CONFIG: Record<string, { color: string; icon: typeof Clock; bgClass: string }> = {
  'to_planify_tvx': { color: 'hsl(200, 85%, 60%)', icon: ClipboardList, bgClass: 'bg-warm-blue/10' },
  'devis_to_order': { color: 'hsl(35, 90%, 60%)', icon: ShoppingCart, bgClass: 'bg-warm-orange/10' },
  'wait_fourn': { color: 'hsl(270, 60%, 65%)', icon: Package, bgClass: 'bg-warm-purple/10' },
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
  const { data, rawData, isLoading } = useChargeTravauxAVenir();
  const [showAllDossiers, setShowAllDossiers] = useState(false);
  const [selectedEtat, setSelectedEtat] = useState<string | null>(null);
  const [dossiersExplorerOpen, setDossiersExplorerOpen] = useState(false);

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

  const chartDataCA = useMemo(() => {
    if (!data?.parUnivers) return [];
    return data.parUnivers
      .filter(u => u.devisHTTotal > 0)
      .sort((a, b) => b.devisHTTotal - a.devisHTTotal)
      .map(u => ({
        name: u.univers,
        ca: Math.round(u.devisHTTotal),
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

  const pieDataCA = useMemo(() => {
    if (!data?.parEtat) return [];
    return data.parEtat.filter(e => e.devisHT > 0).map(e => ({
      name: e.etatLabel,
      value: Math.round(e.devisHT),
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
    totaux: { totalHeuresRdv: 0, totalHeuresTech: 0, totalNbTechs: 0, nbDossiers: 0, totalDevisHT: 0, caPlanifie: 0 },
    parUnivers: [],
    parEtat: [],
    parProjet: [],
    debug: { totalProjects: 0, projectsEligibleState: 0, projectsAvecRT: 0, rtBlocksCount: 0, devisTotal: 0, devisIndexed: 0, caPlanifieDevisCount: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Cards par État + CA Planifié */}
      <div className="grid gap-4 md:grid-cols-4">
        {parEtat.map((etatStats) => {
          const config = ETAT_CONFIG[etatStats.etat] || { color: '#6b7280', icon: FolderOpen, bgClass: 'bg-muted' };
          const Icon = config.icon;
          return (
            <motion.div key={etatStats.etat} variants={itemVariants}>
              <Card
                className={`border-l-4 ${config.bgClass} cursor-pointer hover:shadow-md transition-shadow`}
                style={{ borderLeftColor: config.color }}
                onClick={() => setSelectedEtat(etatStats.etat)}
              >
                {/* Header */}
                <div className="flex items-start justify-between p-4 pb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{etatStats.etatLabel}</h4>
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                </div>
                {/* Content */}
                <div className="px-4 pb-4">
                  <div className="text-2xl font-bold" style={{ color: config.color }}>{etatStats.nbDossiers}</div>
                  <p className="text-sm text-muted-foreground mt-1">dossiers</p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{Math.round(etatStats.totalHeuresTech)}h</span>
                      <span className="text-muted-foreground">tech</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Euro className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{formatCurrency(etatStats.devisHT)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
        
        {/* Card CA Planifié avec sélecteur de mois intégré */}
        {rawData && (
          <CAPlanifieCard 
            projects={rawData.projects}
            interventions={rawData.interventions}
            devis={rawData.devis}
            factures={rawData.factures}
            clients={rawData.clients}
          />
        )}

        {parEtat.length === 0 && (
          <motion.div variants={itemVariants} className="col-span-4">
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
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setDossiersExplorerOpen(true)}>
                    <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
                    <span className="text-2xl font-bold">{totaux.nbDossiers}</span>
                    <span className="text-muted-foreground underline decoration-dashed underline-offset-4">dossiers total</span>
                  </div>
                  <div className="h-8 w-px bg-border hidden md:block" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <Clock className="h-5 w-5 text-helpconfort-orange" />
                        <span className="text-2xl font-bold">{Math.round(totaux.totalHeuresTech)}h</span>
                        <span className="text-muted-foreground">Heures Homme</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="p-4">
                      <HeuresHommeTooltip />
                    </TooltipContent>
                  </Tooltip>
                  <div className="h-8 w-px bg-border hidden md:block" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <Calendar className="h-5 w-5 text-cyan-500" />
                        <span className="text-2xl font-bold">{Math.round(totaux.totalHeuresRdv)}h</span>
                        <span className="text-muted-foreground">Durée totale inter</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="p-4">
                      <DureeTotaleInterTooltip />
                    </TooltipContent>
                  </Tooltip>
                  <div className="h-8 w-px bg-border hidden md:block" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <Euro className="h-5 w-5 text-green-500" />
                        <span className="text-2xl font-bold">{formatCurrency(totaux.totalDevisHT)}</span>
                        <span className="text-muted-foreground">CA estimé</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="p-4">
                      <CADevisTooltip />
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-500" />
                    <span className="text-lg font-semibold">{parUnivers.length}</span>
                    <span className="text-muted-foreground">univers</span>
                  </div>
                  {data?.dataQuality && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: data.dataQuality.score >= 75 ? 'hsl(142, 76%, 36%)' : data.dataQuality.score >= 50 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)',
                        color: data.dataQuality.score >= 75 ? 'hsl(142, 76%, 36%)' : data.dataQuality.score >= 50 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)',
                      }}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Fiabilité {data.dataQuality.score}%
                    </Badge>
                  )}
                </div>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row - Heures */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar Chart - Charge par Univers */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Charge par Univers (heures homme)</CardTitle>
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
                      formatter={(value: number) => [`${value}h`, 'Heures Homme']}
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
              <CardTitle className="text-sm">Répartition par État (heures)</CardTitle>
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

      {/* Charts Row - CA Devis */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar Chart - CA Devis par Univers */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CA Devis par Univers</CardTitle>
            </CardHeader>
            <CardContent>
              {chartDataCA.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartDataCA} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'CA Devis']}
                    />
                    <Bar 
                      dataKey="ca" 
                      radius={[0, 4, 4, 0]}
                      animationDuration={2500}
                      animationEasing="ease-out"
                    >
                      {chartDataCA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Aucun devis associé
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - CA par État */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CA Devis par État</CardTitle>
            </CardHeader>
            <CardContent>
              {pieDataCA.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieDataCA}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ value }) => formatCurrency(value)}
                      animationDuration={2500}
                      animationEasing="ease-out"
                    >
                      {pieDataCA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Aucun devis
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
                  <TableHead className="text-right">Durée totale</TableHead>
                  <TableHead className="text-right">H. Homme</TableHead>
                  <TableHead className="text-right">CA Devis</TableHead>
                  <TableHead className="text-right">À planifier</TableHead>
                  <TableHead className="text-right">À commander</TableHead>
                  <TableHead className="text-right">Att. Fourn</TableHead>
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
                    <TableCell className="text-right text-green-600 font-medium">
                      {u.devisHTTotal > 0 ? formatCurrency(u.devisHTTotal) : '—'}
                    </TableCell>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                   <TableHead className="text-right">Durée</TableHead>
                   <TableHead className="text-right">H. Homme</TableHead>
                   <TableHead className="text-right">CA Devis</TableHead>
                   <TableHead className="text-right">Âge</TableHead>
                   <TableHead className="text-right">Risque</TableHead>
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
                      <TableCell className="text-right text-green-600 font-medium">
                        {d.devisHT > 0 ? formatCurrency(d.devisHT) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.ageDays === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              borderColor: d.ageDays <= 7 ? 'hsl(142, 76%, 36%)' : d.ageDays <= 15 ? 'hsl(45, 93%, 47%)' : d.ageDays <= 30 ? 'hsl(25, 95%, 53%)' : 'hsl(0, 84%, 60%)',
                              color: d.ageDays <= 7 ? 'hsl(142, 76%, 36%)' : d.ageDays <= 15 ? 'hsl(45, 93%, 47%)' : d.ageDays <= 30 ? 'hsl(25, 95%, 53%)' : 'hsl(0, 84%, 60%)',
                            }}
                          >
                            {d.ageDays}j
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                          style={{
                            borderColor: d.riskScoreGlobal < 0.3 ? 'hsl(142, 76%, 36%)' : d.riskScoreGlobal < 0.6 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)',
                            color: d.riskScoreGlobal < 0.3 ? 'hsl(142, 76%, 36%)' : d.riskScoreGlobal < 0.6 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)',
                          }}
                        >
                          {Math.round(d.riskScoreGlobal * 100)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visibleDossiers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Aucun dossier en attente
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pilotage avancé */}
      {data && (
        <motion.div variants={itemVariants}>
          <PilotageAvanceSection data={data} />
        </motion.div>
      )}

      {/* Debug Info */}
      {debug && (
        <motion.div variants={itemVariants}>
          <Card className="bg-muted/50">
            <CardContent className="py-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                Debug: {debug.totalProjects} projets • {debug.projectsEligibleState} éligibles • {debug.projectsAvecRT} avec RT • {debug.rtBlocksCount} blocs RT
              </p>
              <p className="text-xs text-muted-foreground">
                Devis: {debug.devisTotal || 0} total • {debug.devisIndexed || 0} indexés • {debug.devisMatchedToProjects || 0} matchés • {formatCurrency(debug.devisHTCalculated || 0)} CA calculé
              </p>
              {debug.sampleDevis && (
                <p className="text-xs text-muted-foreground font-mono">
                  Sample: id={debug.sampleDevis.id} projectId={debug.sampleDevis.projectId} state={debug.sampleDevis.state} HT={debug.sampleDevis.totalHT ?? debug.sampleDevis.dataTotalHT}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dialog état détaillé */}
      {selectedEtat && parEtat && (
        <EtatDetailDialog
          open={!!selectedEtat}
          onOpenChange={(o) => { if (!o) setSelectedEtat(null); }}
          etat={selectedEtat}
          etatStats={parEtat.find(e => e.etat === selectedEtat) || { etat: selectedEtat, etatLabel: selectedEtat, nbDossiers: 0, totalHeuresRdv: 0, totalHeuresTech: 0, totalNbTechs: 0, devisHT: 0 }}
          projets={parProjet || []}
          universStats={parUnivers || []}
          clients={rawData?.clients}
        />
      )}

      {/* Dialog explorateur dossiers */}
      <DossiersExplorerDialog
        open={dossiersExplorerOpen}
        onOpenChange={setDossiersExplorerOpen}
        projets={parProjet || []}
        clients={rawData?.clients}
      />
    </motion.div>
  );
}
