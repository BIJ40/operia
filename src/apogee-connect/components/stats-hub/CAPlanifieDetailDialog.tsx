/**
 * CAPlanifieDetailDialog - Popup détaillée du CA Planifié
 * Graphiques : répartition par univers (pie), par état (bar), timeline semaine, top dossiers
 */

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Euro, FolderOpen, Clock, TrendingUp, PieChart as PieChartIcon, BarChart3, Calendar } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

// --- Types ---
interface PlanifiedProject {
  projectId: number;
  reference: string;
  label: string;
  univers: string;
  etatWorkflow: string;
  etatWorkflowLabel: string;
  devisHT: number;
  planningDate: Date;
  heuresTech: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
  interventions: any[];
  devis: any[];
  factures: any[];
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
}

// --- Helpers ---
const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v as any);
  return isNaN(d.getTime()) ? null : d;
};

const getProjectId = (obj: any): number | null => {
  const raw = obj?.projectId ?? obj?.project_id ?? obj?.project?.id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const getInterventionPlanningDate = (itv: any): Date | null => {
  const direct = toDate(itv?.dateReelle ?? itv?.date);
  if (direct) return direct;
  const visites = Array.isArray(itv?.visites) ? itv.visites : [];
  for (const v of visites) {
    const dv = toDate(v?.dateReelle ?? v?.date);
    if (dv) return dv;
  }
  return null;
};

const isDevisToOrder = (d: any): boolean => {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? '').trim().toLowerCase();
  return state === 'to order' || state === 'to_order' || state === 'order';
};

const parseNum = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') { const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? 0 : n; }
  return 0;
};

const fmtCurrency = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k€`;
  return `${Math.round(v)}€`;
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(35, 90%, 60%)',
  'hsl(200, 85%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(270, 70%, 60%)',
  'hsl(180, 60%, 45%)',
  'hsl(320, 70%, 55%)',
];

const ETAT_COLORS: Record<string, string> = {
  'to_planify_tvx': 'hsl(200, 85%, 60%)',
  'devis_to_order': 'hsl(35, 90%, 60%)',
  'wait_fourn': 'hsl(0, 84%, 60%)',
};

const normalizeUnivers = (u: string) => {
  const trimmed = u?.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return 'Non classé';
  return trimmed;
};

// --- Hook to compute detailed data ---
function usePlanifiedProjects(props: Omit<Props, 'open' | 'onOpenChange'>): PlanifiedProject[] {
  const { projects, interventions, devis, factures, periodStart, periodEnd } = props;

  return useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const facturedIds = new Set<number>();
    for (const f of factures) { const pid = getProjectId(f); if (pid != null) facturedIds.add(pid); }

    const itvByPid = new Map<number, any[]>();
    for (const itv of interventions) { const pid = getProjectId(itv); if (pid != null) { if (!itvByPid.has(pid)) itvByPid.set(pid, []); itvByPid.get(pid)!.push(itv); } }

    const devisByPid = new Map<number, any[]>();
    for (const d of devis) { const pid = getProjectId(d); if (pid != null) { if (!devisByPid.has(pid)) devisByPid.set(pid, []); devisByPid.get(pid)!.push(d); } }

    const periodStartMonth = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
    const periodEndMonth = `${periodEnd.getFullYear()}-${String(periodEnd.getMonth() + 1).padStart(2, '0')}`;

    const results: PlanifiedProject[] = [];

    for (const project of projects) {
      const projectId = Number(project?.id);
      if (!Number.isFinite(projectId)) continue;
      if (facturedIds.has(projectId)) continue;

      const projectItvs = itvByPid.get(projectId) || [];
      let totalHours = 0;

      // Phase A : compter les interventions futures par mois
      const monthCounts = new Map<string, { count: number; firstDate: Date }>();
      for (const itv of projectItvs) {
        const d = getInterventionPlanningDate(itv);
        if (d && d.getTime() >= todayMs) {
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const existing = monthCounts.get(mk);
          if (!existing) {
            monthCounts.set(mk, { count: 1, firstDate: d });
          } else {
            existing.count++;
            if (d < existing.firstDate) existing.firstDate = d;
          }
        }
        const hrs = parseNum(itv?.data?.dureeRdv ?? itv?.dureeRdv ?? itv?.data?.heureTechnicien ?? itv?.heureTechnicien ?? 0);
        totalHours += hrs;
      }

      if (monthCounts.size === 0) continue;

      // Phase B : mois dominant
      let dominantMonth = '';
      let dominantCount = 0;
      let bestDate: Date | null = null;
      for (const [month, { count, firstDate }] of monthCounts) {
        if (count > dominantCount || (count === dominantCount && month < dominantMonth)) {
          dominantMonth = month;
          dominantCount = count;
          bestDate = firstDate;
        }
      }

      // Phase C : ne retenir que si le mois dominant est dans la période
      if (!dominantMonth || dominantMonth < periodStartMonth || dominantMonth > periodEndMonth) continue;
      if (!bestDate) continue;

      // Phase D : ne retenir que les projets avec devis accepté (cohérence tuile)
      const projectDevis = devisByPid.get(projectId) || [];
      let devisHT = 0;
      let hasAcceptedDevis = false;
      for (const d of projectDevis) {
        if (!isDevisToOrder(d)) continue;
        devisHT = parseNum(d.data?.totalHT) || parseNum(d.totalHT) || parseNum(d.amount) || 0;
        if (devisHT > 0) { hasAcceptedDevis = true; break; }
      }

      if (!hasAcceptedDevis) continue;

      const universes = (project?.data?.universes as string[]) || ['Non classé'];
      const state = project?.data?.state ?? project?.state ?? '';
      const clientName = project?.data?.clientName ?? project?.data?.client_name ?? project?.data?.nom ?? '';
      const ville = project?.data?.ville ?? project?.data?.city ?? '';

      results.push({
        projectId,
        reference: project?.data?.reference || project?.reference || `#${projectId}`,
        label: clientName || project?.data?.label || project?.label || '',
        ville,
        univers: normalizeUnivers(universes[0]),
        etatWorkflow: state,
        etatWorkflowLabel: state === 'to_planify_tvx' ? 'À planifier' : state === 'devis_to_order' ? 'À commander' : state === 'wait_fourn' ? 'Att. fourn.' : state,
        devisHT,
        planningDate: bestDate,
        heuresTech: totalHours,
      });
    }

    return results.sort((a, b) => b.devisHT - a.devisHT);
  }, [projects, interventions, devis, factures, periodStart, periodEnd]);
}

// --- Custom tooltip ---
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{fmtCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// --- Main Component ---
export function CAPlanifieDetailDialog({ open, onOpenChange, ...dataProps }: Props) {
  const planifiedProjects = usePlanifiedProjects(dataProps);

  const totalCA = useMemo(() => planifiedProjects.reduce((s, p) => s + p.devisHT, 0), [planifiedProjects]);
  const totalHours = useMemo(() => planifiedProjects.reduce((s, p) => s + p.heuresTech, 0), [planifiedProjects]);

  // By univers
  const byUnivers = useMemo(() => {
    const map = new Map<string, { ca: number; count: number; hours: number }>();
    for (const p of planifiedProjects) {
      const entry = map.get(p.univers) || { ca: 0, count: 0, hours: 0 };
      entry.ca += p.devisHT;
      entry.count++;
      entry.hours += p.heuresTech;
      map.set(p.univers, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.ca - a.ca);
  }, [planifiedProjects]);

  // By état
  const byEtat = useMemo(() => {
    const map = new Map<string, { ca: number; count: number; label: string }>();
    for (const p of planifiedProjects) {
      const entry = map.get(p.etatWorkflow) || { ca: 0, count: 0, label: p.etatWorkflowLabel };
      entry.ca += p.devisHT;
      entry.count++;
      map.set(p.etatWorkflow, entry);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, name: v.label, ca: v.ca, count: v.count }))
      .sort((a, b) => b.ca - a.ca);
  }, [planifiedProjects]);

  // By week
  const byWeek = useMemo(() => {
    const map = new Map<string, { ca: number; count: number; hours: number }>();
    for (const p of planifiedProjects) {
      const d = p.planningDate;
      const dayOfWeek = d.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      const weekNum = getISOWeekNumber(monday);
      const label = `S${weekNum}`;
      const entry = map.get(label) || { ca: 0, count: 0, hours: 0 };
      entry.ca += p.devisHT;
      entry.count++;
      entry.hours += p.heuresTech;
      map.set(label, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => {
        const wA = parseInt(a.name.slice(1)); const wB = parseInt(b.name.slice(1));
        return wA - wB;
      });
  }, [planifiedProjects]);

  // Ticket moyen
  const ticketMoyen = planifiedProjects.length > 0 ? totalCA / planifiedProjects.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            CA Planifié — {dataProps.periodLabel}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiMini icon={Euro} label="CA total" value={fmtCurrency(totalCA)} color="hsl(var(--primary))" />
              <KpiMini icon={FolderOpen} label="Dossiers" value={String(planifiedProjects.length)} color="hsl(200, 85%, 60%)" />
              <KpiMini icon={Clock} label="Heures tech" value={`${Math.round(totalHours)}h`} color="hsl(35, 90%, 60%)" />
              <KpiMini icon={TrendingUp} label="Ticket moyen" value={fmtCurrency(ticketMoyen)} color="hsl(142, 76%, 36%)" />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pie: by univers */}
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Répartition par univers
                </div>
                {byUnivers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={byUnivers}
                        dataKey="ca"
                        nameKey="name"
                        cx="50%" cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {byUnivers.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">Aucune donnée</p>
                )}
              </div>

              {/* Bar: by état */}
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  CA par état workflow
                </div>
                {byEtat.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byEtat} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={fmtCurrency} className="text-xs" />
                      <YAxis type="category" dataKey="name" width={90} className="text-xs" />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Bar dataKey="ca" name="CA HT" radius={[0, 4, 4, 0]}>
                        {byEtat.map((entry) => (
                          <Cell key={entry.key} fill={ETAT_COLORS[entry.key] || 'hsl(var(--primary))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">Aucune donnée</p>
                )}
              </div>
            </div>

            {/* Timeline by week */}
            {byWeek.length > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  Timeline par semaine
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byWeek} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis tickFormatter={fmtCurrency} className="text-xs" />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="ca" name="CA HT" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="hours" name="Heures" fill="hsl(200, 85%, 60%)" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Dossier list */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Dossiers planifiés ({planifiedProjects.length})
                </div>
              </div>
              {planifiedProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Aucun dossier planifié sur cette période</p>
              ) : (
                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                  <div className="grid grid-cols-[1fr_100px_80px_80px_60px] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide pb-1 border-b">
                    <span>Référence</span>
                    <span>Univers</span>
                    <span className="text-right">Devis HT</span>
                    <span className="text-right">Heures</span>
                    <span className="text-right">État</span>
                  </div>
                  {planifiedProjects.map(p => (
                    <div key={p.projectId} className="grid grid-cols-[1fr_100px_80px_80px_60px] gap-2 items-center text-xs py-1.5 border-b border-border/40 last:border-0">
                      <div className="min-w-0">
                        <span className="font-mono font-medium truncate block">{p.reference}</span>
                        {p.label && <span className="text-muted-foreground truncate block text-[10px]">{p.label.slice(0, 40)}</span>}
                      </div>
                      <span className="text-muted-foreground truncate">{p.univers}</span>
                      <span className="text-right font-medium">{p.devisHT > 0 ? fmtCurrency(p.devisHT) : '—'}</span>
                      <span className="text-right text-muted-foreground">{p.heuresTech > 0 ? `${Math.round(p.heuresTech)}h` : '—'}</span>
                      <div className="flex justify-end">
                        <Badge variant="outline" className="text-[9px] px-1 py-0" style={{ borderColor: ETAT_COLORS[p.etatWorkflow] || 'hsl(var(--border))' }}>
                          {p.etatWorkflowLabel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// --- Sub-components ---
function KpiMini({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3 w-3" style={{ color }} />
        {label}
      </div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
