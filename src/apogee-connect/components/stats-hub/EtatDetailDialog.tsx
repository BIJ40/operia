/**
 * EtatDetailDialog - Dialog détaillé pour les tuiles d'état pipeline
 * (À planifier TVX, À commander, En attente fournitures)
 * Drill-down complet avec sous-détails cliquables
 */

import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Clock, Euro, FolderOpen, Users, Layers, MapPin, Calendar, ChevronRight, ArrowUpDown } from 'lucide-react';
import { ChargeTravauxProjet, ChargeParEtatStats, ChargeTravauxUniversStats } from '@/statia/shared/chargeTravauxEngine';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const fmtCurrency = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k€`;
  return `${Math.round(v)}€`;
};

const ETAT_META: Record<string, { label: string; color: string; description: string }> = {
  'to_planify_tvx': {
    label: 'À planifier travaux',
    color: 'hsl(200, 85%, 60%)',
    description: 'Dossiers prêts à planifier : devis validé, en attente de programmation d\'intervention',
  },
  'devis_to_order': {
    label: 'À commander',
    color: 'hsl(35, 90%, 60%)',
    description: 'Dossiers avec devis accepté, en attente de commande / bon de commande',
  },
  'wait_fourn': {
    label: 'En attente fournitures',
    color: 'hsl(270, 60%, 65%)',
    description: 'Dossiers bloqués en attente de réception des fournitures nécessaires',
  },
};

const UNIVERS_COLORS: Record<string, string> = {
  'Plomberie': 'hsl(200, 85%, 60%)',
  'Électricité': 'hsl(35, 90%, 60%)',
  'Serrurerie': 'hsl(145, 60%, 55%)',
  'Vitrerie': 'hsl(270, 60%, 65%)',
  'Multiservice': 'hsl(340, 70%, 65%)',
  'Rénovation': 'hsl(175, 60%, 50%)',
  'Aménagement PMR': 'hsl(100, 55%, 55%)',
  'Recherche de fuite': 'hsl(350, 65%, 60%)',
  'Non classé': 'hsl(210, 10%, 60%)',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etat: string;
  etatStats: ChargeParEtatStats;
  projets: ChargeTravauxProjet[];
  universStats: ChargeTravauxUniversStats[];
  clients?: any[];
}

type SortKey = 'reference' | 'client' | 'heures' | 'devis' | 'univers' | 'age';
type SortDir = 'asc' | 'desc';

type DrillView =
  | { type: 'overview' }
  | { type: 'dossiers'; title: string; filter?: (p: ChargeTravauxProjet) => boolean }
  | { type: 'univers-detail'; univers: string };

export function EtatDetailDialog({ open, onOpenChange, etat, etatStats, projets, universStats, clients }: Props) {
  const [drill, setDrill] = useState<DrillView>({ type: 'overview' });
  const [sortKey, setSortKey] = useState<SortKey>('devis');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const meta = ETAT_META[etat] || { label: etatStats.etatLabel, color: '#6b7280', description: '' };

  // Client lookup
  const clientMap = useMemo(() => {
    const m = new Map<number | string, string>();
    if (!clients) return m;
    for (const c of clients) {
      if (c?.id != null) {
        m.set(c.id, c.nom || c.name || c.raisonSociale || c.raison_sociale || `Client ${c.id}`);
        m.set(String(c.id), m.get(c.id)!);
        m.set(Number(c.id), m.get(c.id)!);
      }
    }
    return m;
  }, [clients]);

  const getClientName = useCallback((p: ChargeTravauxProjet): string => {
    const fromClient = p.clientId != null ? clientMap.get(p.clientId) : undefined;
    if (fromClient) return fromClient;
    return p.dossierLabel || p.label || `Dossier ${p.reference || p.projectId}`;
  }, [clientMap]);

  // Projets filtrés pour cet état
  const filteredProjets = useMemo(() => {
    return projets.filter(p => p.etatWorkflow === etat);
  }, [projets, etat]);

  // Stats par univers pour cet état
  const byUnivers = useMemo(() => {
    const map = new Map<string, { count: number; heuresTech: number; devisHT: number }>();
    for (const p of filteredProjets) {
      const u = p.universes[0] || 'Non classé';
      const entry = map.get(u) || { count: 0, heuresTech: 0, devisHT: 0 };
      entry.count++;
      entry.heuresTech += p.totalHeuresTech;
      entry.devisHT += p.devisHT;
      map.set(u, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.devisHT - a.devisHT);
  }, [filteredProjets]);

  // Pie data univers
  const pieData = useMemo(() => {
    return byUnivers.filter(u => u.count > 0).map(u => ({
      name: u.name,
      value: u.count,
      color: UNIVERS_COLORS[u.name] || '#6b7280',
    }));
  }, [byUnivers]);

  // Bar data CA
  const barDataCA = useMemo(() => {
    return byUnivers.filter(u => u.devisHT > 0).map(u => ({
      name: u.name,
      ca: Math.round(u.devisHT),
      color: UNIVERS_COLORS[u.name] || '#6b7280',
    }));
  }, [byUnivers]);

  // Stats agrégées
  const totalCA = filteredProjets.reduce((s, p) => s + p.devisHT, 0);
  const totalHeuresTech = filteredProjets.reduce((s, p) => s + p.totalHeuresTech, 0);
  const totalHeuresRdv = filteredProjets.reduce((s, p) => s + p.totalHeuresRdv, 0);
  const avgAge = filteredProjets.filter(p => p.ageDays != null).reduce((s, p) => s + (p.ageDays || 0), 0) / (filteredProjets.filter(p => p.ageDays != null).length || 1);
  const ticketMoyen = filteredProjets.length > 0 ? totalCA / filteredProjets.length : 0;
  const withDevis = filteredProjets.filter(p => p.devisHT > 0).length;
  const withHours = filteredProjets.filter(p => p.totalHeuresTech > 0).length;

  // Sorting
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedProjets = useMemo(() => {
    let list = drill.type === 'dossiers' && drill.filter
      ? filteredProjets.filter(drill.filter)
      : drill.type === 'univers-detail'
        ? filteredProjets.filter(p => (p.universes[0] || 'Non classé') === drill.univers)
        : filteredProjets;

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'reference': return dir * String(a.reference || '').localeCompare(String(b.reference || ''));
        case 'client': return dir * getClientName(a).localeCompare(getClientName(b));
        case 'heures': return dir * (a.totalHeuresTech - b.totalHeuresTech);
        case 'devis': return dir * (a.devisHT - b.devisHT);
        case 'univers': return dir * (a.universes[0] || '').localeCompare(b.universes[0] || '');
        case 'age': return dir * ((a.ageDays || 0) - (b.ageDays || 0));
        default: return 0;
      }
    });
  }, [filteredProjets, drill, sortKey, sortDir, getClientName]);

  const handleOpenChange = useCallback((o: boolean) => {
    if (!o) setDrill({ type: 'overview' });
    onOpenChange(o);
  }, [onOpenChange]);

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort(sortKeyVal)}>
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyVal ? 'text-foreground' : 'text-muted-foreground/50'}`} />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {drill.type !== 'overview' && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDrill({ type: 'overview' })}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
            {drill.type === 'overview' ? meta.label : drill.type === 'dossiers' ? drill.title : `Univers : ${drill.univers}`}
            <Badge variant="secondary" className="ml-2">{drill.type === 'overview' ? filteredProjets.length : sortedProjets.length} dossiers</Badge>
          </DialogTitle>
          {drill.type === 'overview' && meta.description && (
            <p className="text-xs text-muted-foreground mt-1 pl-5">{meta.description}</p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-80px)]">
          <div className="px-6 pb-6 space-y-5">
            {drill.type === 'overview' ? (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrill({ type: 'dossiers', title: 'Tous les dossiers' })}>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Dossiers</div>
                      <div className="text-2xl font-bold mt-1" style={{ color: meta.color }}>{filteredProjets.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">{withDevis} avec devis • {withHours} avec heures</div>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrill({ type: 'dossiers', title: 'Détail CA', filter: p => p.devisHT > 0 })}>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">CA Total</div>
                      <div className="text-2xl font-bold text-green-600 mt-1">{fmtCurrency(totalCA)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Ticket moyen : {fmtCurrency(ticketMoyen)}</div>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrill({ type: 'dossiers', title: 'Détail Heures', filter: p => p.totalHeuresTech > 0 })}>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Heures Homme</div>
                      <div className="text-2xl font-bold text-orange-500 mt-1">{Math.round(totalHeuresTech)}h</div>
                      <div className="text-xs text-muted-foreground mt-1">Durée inter : {Math.round(totalHeuresRdv)}h</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Ancienneté moy.</div>
                      <div className="text-2xl font-bold mt-1">{Math.round(avgAge)}j</div>
                      <div className="text-xs text-muted-foreground mt-1">{byUnivers.length} univers</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pie - Répartition par univers (nombre) */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium mb-3">Répartition par univers</h4>
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                              label={({ name, value }) => `${name} (${value})`}>
                              {pieData.map((e, i) => <Cell key={i} fill={e.color} className="cursor-pointer" onClick={() => setDrill({ type: 'univers-detail', univers: e.name })} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>}
                    </CardContent>
                  </Card>

                  {/* Bar - CA par univers */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium mb-3">CA Devis par univers</h4>
                      {barDataCA.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={barDataCA} layout="vertical" margin={{ left: 80, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtCurrency} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                              formatter={(v: number) => [fmtCurrency(v), 'CA HT']} />
                            <Bar dataKey="ca" radius={[0, 4, 4, 0]}>
                              {barDataCA.map((e, i) => <Cell key={i} fill={e.color} className="cursor-pointer" onClick={() => setDrill({ type: 'univers-detail', univers: e.name })} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucun devis</div>}
                    </CardContent>
                  </Card>
                </div>

                {/* Tableau univers cliquable */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium mb-3">Détail par univers</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Univers</TableHead>
                          <TableHead className="text-right">Dossiers</TableHead>
                          <TableHead className="text-right">Heures Tech</TableHead>
                          <TableHead className="text-right">CA Devis</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byUnivers.map(u => (
                          <TableRow key={u.name} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrill({ type: 'univers-detail', univers: u.name })}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: UNIVERS_COLORS[u.name] || '#6b7280' }} />
                                <span className="font-medium">{u.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{u.count}</TableCell>
                            <TableCell className="text-right">{Math.round(u.heuresTech)}h</TableCell>
                            <TableCell className="text-right font-medium">{fmtCurrency(u.devisHT)}</TableCell>
                            <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Top 5 dossiers */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Top dossiers par CA</h4>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDrill({ type: 'dossiers', title: 'Tous les dossiers' })}>
                        Voir tout <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client / Réf</TableHead>
                          <TableHead>Univers</TableHead>
                          <TableHead className="text-right">Heures</TableHead>
                          <TableHead className="text-right">CA HT</TableHead>
                          <TableHead className="text-right">Âge</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjets.slice().sort((a, b) => b.devisHT - a.devisHT).slice(0, 5).map(p => (
                          <TableRow key={p.projectId}>
                            <TableCell>
                              <div className="font-medium">{getClientName(p)}</div>
                              <div className="text-xs text-muted-foreground">{p.reference || p.projectId}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{p.universes[0] || 'N/C'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{p.totalHeuresTech > 0 ? `${Math.round(p.totalHeuresTech)}h` : '-'}</TableCell>
                            <TableCell className="text-right font-medium">{p.devisHT > 0 ? fmtCurrency(p.devisHT) : '-'}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{p.ageDays != null ? `${p.ageDays}j` : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Drill-down: liste complète des dossiers */
              <Card>
                <CardContent className="p-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground uppercase">Dossiers</div>
                      <div className="text-xl font-bold" style={{ color: meta.color }}>{sortedProjets.length}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground uppercase">CA Total</div>
                      <div className="text-xl font-bold text-green-600">{fmtCurrency(sortedProjets.reduce((s, p) => s + p.devisHT, 0))}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground uppercase">Heures</div>
                      <div className="text-xl font-bold text-orange-500">{Math.round(sortedProjets.reduce((s, p) => s + p.totalHeuresTech, 0))}h</div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><SortHeader label="Client" sortKeyVal="client" /></TableHead>
                        <TableHead><SortHeader label="Réf." sortKeyVal="reference" /></TableHead>
                        <TableHead><SortHeader label="Univers" sortKeyVal="univers" /></TableHead>
                        <TableHead className="text-right"><SortHeader label="Heures" sortKeyVal="heures" /></TableHead>
                        <TableHead className="text-right"><SortHeader label="CA HT" sortKeyVal="devis" /></TableHead>
                        <TableHead className="text-right"><SortHeader label="Âge" sortKeyVal="age" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedProjets.map(p => (
                        <TableRow key={p.projectId}>
                          <TableCell className="font-medium">{getClientName(p)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.reference || p.projectId}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.universes[0] || 'N/C'}</Badge></TableCell>
                          <TableCell className="text-right">{p.totalHeuresTech > 0 ? `${Math.round(p.totalHeuresTech)}h` : '-'}</TableCell>
                          <TableCell className="text-right font-medium">{p.devisHT > 0 ? fmtCurrency(p.devisHT) : '-'}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{p.ageDays != null ? `${p.ageDays}j` : '-'}</TableCell>
                        </TableRow>
                      ))}
                      {sortedProjets.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun dossier</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
