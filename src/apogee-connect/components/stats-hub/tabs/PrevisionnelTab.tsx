/**
 * PrevisionnelTab — Vue principale prévisionnel
 * Affiche le dashboard original (KPIs, résumé, graphiques, tableaux)
 * + sections d'analyse avancée (pipeline, charge, risques) en collapsible
 */

import { useMemo, useState } from 'react';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useChargeTravauxAVenir } from '@/statia/hooks/useChargeTravauxAVenir';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, FolderOpen, Clock, Calendar, Euro, Layers, ClipboardList, ShoppingCart, Truck } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

import { CAPlanifieCard } from '../CAPlanifieCard';
import { PipelineSection } from '../previsionnel/PipelineSection';
import { ChargeSection } from '../previsionnel/ChargeSection';
import { ActionsSection } from '../previsionnel/ActionsSection';
import { RiskSection } from '../previsionnel/RiskSection';

// ─── Animation variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ─── Couleurs ────────────────────────────────────────────────────────

const UNIVERS_COLORS: Record<string, string> = {
  'Rénovation': '#22c55e',
  'menuiserie': '#6b7280',
  'Plomberie': '#3b82f6',
  'Vitrerie': '#a855f7',
  'volets': '#6b7280',
  'Électricité': '#f59e0b',
  'Serrurerie': '#22c55e',
  'Aménagement PMR': '#22c55e',
};

const ETAT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bgClass: string }> = {
  'À planifier TVX': { label: 'À planifier TVX', color: 'hsl(200, 85%, 60%)', icon: <ClipboardList className="h-4 w-4" />, bgClass: 'bg-sky-50 border-sky-200' },
  'À commander': { label: 'À commander', color: 'hsl(35, 90%, 60%)', icon: <ShoppingCart className="h-4 w-4" />, bgClass: 'bg-amber-50 border-amber-200' },
  'En attente fournitures': { label: 'En attente fournitures', color: 'hsl(270, 60%, 65%)', icon: <Truck className="h-4 w-4" />, bgClass: 'bg-purple-50 border-purple-200' },
  'Planifié TVX': { label: 'Planifié TVX', color: 'hsl(145, 60%, 55%)', icon: <Calendar className="h-4 w-4" />, bgClass: 'bg-green-50 border-green-200' },
};

const PIE_COLORS = ['hsl(270, 60%, 65%)', 'hsl(35, 90%, 60%)', 'hsl(200, 85%, 60%)', 'hsl(145, 60%, 55%)'];

// ─── Helpers ─────────────────────────────────────────────────────────

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${Math.round(value)}€`;
};

const getUniversColor = (univers: string): string => UNIVERS_COLORS[univers] || '#6b7280';

// ─── Main ────────────────────────────────────────────────────────────

export function PrevisionnelTab() {
  const { isAgencyReady } = useAgency();
  const { data, rawData, isLoading } = useChargeTravauxAVenir();

  const [showAllDossiers, setShowAllDossiers] = useState(false);
  const [openPipeline, setOpenPipeline] = useState(false);
  const [openCharge, setOpenCharge] = useState(false);
  const [openActions, setOpenActions] = useState(false);
  const [openRisque, setOpenRisque] = useState(false);

  // Charge couverte
  const chargeCouverte = useMemo(() => {
    if (!data?.parTechnicien || data.parTechnicien.length === 0) return 0;
    const totalHeures = data.parTechnicien.reduce((s, t) => s + t.heuresPlanifiees, 0);
    const capacity = data.parTechnicien.length * 35 * 4;
    return capacity > 0 ? totalHeures / capacity : 0;
  }, [data?.parTechnicien]);

  const dossiersARisque = useMemo(() => {
    return data?.dossiersRisque?.filter((d) => d.riskScoreGlobal > 30).length ?? 0;
  }, [data?.dossiersRisque]);

  if (!isAgencyReady || isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-20" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucune donnée disponible
        </CardContent>
      </Card>
    );
  }

  const { parEtat, parUnivers, parProjet, totaux } = data;

  // Chart data
  const universChartData = parUnivers
    .filter((u) => u.totalHeuresTech > 0)
    .sort((a, b) => b.totalHeuresTech - a.totalHeuresTech)
    .map((u) => ({ name: u.univers, heures: Math.round(u.totalHeuresTech), color: getUniversColor(u.univers) }));

  const etatPieData = parEtat
    .filter((e) => e.totalHeuresTech > 0)
    .map((e) => ({ name: e.etatLabel, value: Math.round(e.totalHeuresTech) }));

  const caUniversData = parUnivers
    .filter((u) => u.devisHTTotal > 0)
    .sort((a, b) => b.devisHTTotal - a.devisHTTotal)
    .map((u) => ({ name: u.univers, ca: Math.round(u.devisHTTotal), color: getUniversColor(u.univers) }));

  const caEtatData = parEtat
    .filter((e) => e.devisHT > 0)
    .map((e) => ({ name: e.etatLabel, value: Math.round(e.devisHT) }));

  const dossiersList = showAllDossiers ? parProjet : parProjet.slice(0, 8);

  const etatBadgeStyle = (etatLabel: string) => {
    const cfg = ETAT_CONFIG[etatLabel];
    if (!cfg) return {};
    return { backgroundColor: cfg.color + '20', color: cfg.color, borderColor: cfg.color + '40' };
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ═══ KPI Cards ═══ */}
      <div className="grid gap-4 md:grid-cols-4">
        {parEtat.map((etat) => {
          const cfg = ETAT_CONFIG[etat.etatLabel];
          return (
            <motion.div key={etat.etat} variants={itemVariants}>
              <Card className={`border-l-4 ${cfg?.bgClass || ''}`} style={{ borderLeftColor: cfg?.color }}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">{etat.etatLabel}</h4>
                    {cfg?.icon}
                  </div>
                  <p className="text-3xl font-bold mt-1" style={{ color: cfg?.color }}>{etat.nbDossiers}</p>
                  <p className="text-sm text-muted-foreground">dossiers</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {Math.round(etat.totalHeuresTech)}h tech
                    </span>
                    <span className="flex items-center gap-1">
                      <Euro className="h-3 w-3" /> {formatCurrency(etat.devisHT)}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}

        {/* CA Planifié */}
        {rawData && (
          <CAPlanifieCard
            projects={rawData.projects}
            interventions={rawData.interventions}
            devis={rawData.devis}
            factures={rawData.factures}
          />
        )}
      </div>

      {/* ═══ Résumé global ═══ */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-muted/30 to-muted/10">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="text-lg font-bold">{totaux.nbDossiers}</span>
                <span className="text-sm text-muted-foreground">dossiers total</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-lg font-bold">{Math.round(totaux.totalHeuresTech)}h</span>
                <span className="text-sm text-muted-foreground">Heures Homme</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-bold">{Math.round(totaux.totalHeuresRdv)}h</span>
                <span className="text-sm text-muted-foreground">Durée totale inter</span>
              </div>
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-green-600" />
                <span className="text-lg font-bold">{formatCurrency(totaux.totalDevisHT)}</span>
                <span className="text-sm text-muted-foreground">CA estimé</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                <span className="text-lg font-bold">{parUnivers.length}</span>
                <span className="text-sm text-muted-foreground">univers</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ Graphiques Charge & Répartition ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Charge par Univers (heures homme)</CardTitle>
            </CardHeader>
            <CardContent>
              {universChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(250, universChartData.length * 40)}>
                  <BarChart data={universChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={75} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`${value}h`, 'Heures']}
                    />
                    <Bar dataKey="heures" radius={[0, 4, 4, 0]} animationDuration={1500}>
                      {universChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">Aucune donnée</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Répartition par État (heures)</CardTitle>
            </CardHeader>
            <CardContent>
              {etatPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={etatPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      dataKey="value"
                      label={({ name, value }) => `${value}h`}
                      labelLine
                    >
                      {etatPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => [`${value}h`, 'Heures']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">Aucune donnée</div>
              )}
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {etatPieData.map((e, i) => (
                  <div key={e.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span>{e.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══ Graphiques CA ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CA Devis par Univers</CardTitle>
            </CardHeader>
            <CardContent>
              {caUniversData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(250, caUniversData.length * 40)}>
                  <BarChart data={caUniversData} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={75} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [formatCurrency(value), 'CA']}
                    />
                    <Bar dataKey="ca" radius={[0, 4, 4, 0]} animationDuration={1500}>
                      {caUniversData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">Aucune donnée</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CA Devis par État</CardTitle>
            </CardHeader>
            <CardContent>
              {caEtatData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={caEtatData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      dataKey="value"
                      label={({ value }) => formatCurrency(value)}
                      labelLine
                    >
                      {caEtatData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), 'CA']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">Aucune donnée</div>
              )}
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {caEtatData.map((e, i) => (
                  <div key={e.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span>{e.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══ Détail par Univers ═══ */}
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
                {parUnivers
                  .sort((a, b) => b.totalHeuresTech - a.totalHeuresTech)
                  .map((u) => (
                    <TableRow key={u.univers}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getUniversColor(u.univers) }} />
                          {u.univers}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{u.nbDossiers}</TableCell>
                      <TableCell className="text-right">{Math.round(u.totalHeuresRdv)}h</TableCell>
                      <TableCell className="text-right font-semibold">{Math.round(u.totalHeuresTech)}h</TableCell>
                      <TableCell className="text-right font-medium text-green-600">{formatCurrency(u.devisHTTotal)}</TableCell>
                      <TableCell className="text-right" style={{ color: ETAT_CONFIG['À planifier TVX']?.color }}>
                        {u.totalHeuresTech_A_planifier_TVX > 0 ? `${Math.round(u.totalHeuresTech_A_planifier_TVX)}h` : ''}
                      </TableCell>
                      <TableCell className="text-right" style={{ color: ETAT_CONFIG['À commander']?.color }}>
                        {u.totalHeuresTech_A_commander > 0 ? `${Math.round(u.totalHeuresTech_A_commander)}h` : ''}
                      </TableCell>
                      <TableCell className="text-right" style={{ color: ETAT_CONFIG['En attente fournitures']?.color }}>
                        {u.totalHeuresTech_En_attente_fournitures > 0 ? `${Math.round(u.totalHeuresTech_En_attente_fournitures)}h` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ Liste des Dossiers ═══ */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Liste des Dossiers ({parProjet.length})</CardTitle>
              <button
                onClick={() => setShowAllDossiers(!showAllDossiers)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Voir tout {showAllDossiers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossiersList.map((d) => (
                  <TableRow key={d.projectId}>
                    <TableCell className="font-mono text-xs">{d.reference || d.projectId}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{d.label || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" style={etatBadgeStyle(d.etatWorkflowLabel)}>
                        {d.etatWorkflowLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {d.universes.map((u) => (
                          <span key={u} className="text-xs text-muted-foreground">{u}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{d.totalHeuresRdv > 0 ? `${Math.round(d.totalHeuresRdv)}h` : '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{d.totalHeuresTech > 0 ? `${Math.round(d.totalHeuresTech)}h` : '—'}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{d.devisHT > 0 ? formatCurrency(d.devisHT) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════
           SECTIONS D'ANALYSE AVANCÉE — Collapsibles (fermées par défaut)
         ═══════════════════════════════════════════════════════════════ */}

      {/* Pipeline & Vieillissement */}
      <motion.div variants={itemVariants}>
        <Collapsible open={openPipeline} onOpenChange={setOpenPipeline}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    📊 Analyse Pipeline & Vieillissement
                  </CardTitle>
                  {openPipeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <PipelineSection parEtat={parEtat} pipelineAge={data.pipelineAge} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>

      {/* Charge Technicien & Hebdo */}
      <motion.div variants={itemVariants}>
        <Collapsible open={openCharge} onOpenChange={setOpenCharge}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    👷 Charge Techniciens & Projection Hebdomadaire
                  </CardTitle>
                  {openCharge ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ChargeSection parTechnicien={data.parTechnicien} chargeParSemaine={data.chargeParSemaine} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>

      {/* Actions (dossiers à commander / planifier) */}
      <motion.div variants={itemVariants}>
        <Collapsible open={openActions} onOpenChange={setOpenActions}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    📋 Actions à mener ({parProjet.filter(p => p.etatWorkflow === 'devis_to_order').length} à commander, {parProjet.filter(p => p.etatWorkflow === 'to_planify_tvx').length} à planifier)
                  </CardTitle>
                  {openActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ActionsSection parProjet={parProjet} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>

      {/* Dossiers à risque */}
      <motion.div variants={itemVariants}>
        <Collapsible open={openRisque} onOpenChange={setOpenRisque}>
          <Card className="border-destructive/20">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    ⚠️ Dossiers à risque ({dossiersARisque})
                  </CardTitle>
                  {openRisque ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <RiskSection dossiersRisque={data.dossiersRisque} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>

      {/* Debug */}
      {data.debug && (
        <motion.div variants={itemVariants}>
          <Card className="bg-muted/50">
            <CardContent className="py-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                Debug: {data.debug.totalProjects} projets • {data.debug.projectsEligibleState} éligibles • {data.debug.projectsAvecRT} avec RT • {data.debug.rtBlocksCount} blocs RT
              </p>
              <p className="text-xs text-muted-foreground">
                Fiabilité {data.forecastReliabilityScore}% • Charge couverte {Math.round(chargeCouverte * 100)}% • {dossiersARisque} risques
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
