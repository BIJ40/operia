/**
 * Admin Mirror Monitor — Enhanced pilot monitoring panel
 * Shows pilot module status, metrics, pre-activation checks, decision journal,
 * persisted snapshots, projects readiness checkpoint.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Database, Wifi, AlertTriangle, CheckCircle2, Clock, Activity, ShieldCheck, ArrowDownUp, List, BarChart3, Rocket } from 'lucide-react';
import { getLastComparisonResults, type ComparisonResult } from '@/services/mirrorValidation';
import { invalidateFlagsCache } from '@/services/mirrorDataSource';
import {
  getPilotMetrics,
  evaluatePilotSuccess,
  PILOT_SUCCESS_CRITERIA,
  computePilotVerdictFromMetrics,
  loadPersistedSnapshots,
  checkProjectsReadiness,
  type PilotMetrics,
  type PilotVerdict,
  type ProjectsReadiness,
} from '@/services/mirrorPilotActivation';

// ============================================================
// TYPES
// ============================================================

interface FlagRow {
  id: string;
  module_key: string;
  source_mode: string;
  agency_id: string | null;
  is_enabled: boolean;
  freshness_threshold_minutes: number;
  updated_at: string;
}

interface SyncStatusRow {
  agency_id: string;
  agency_label: string;
  agency_slug: string;
  freshness_minutes: number | null;
  freshness_status: string;
  last_status: string | null;
  projects_count: number;
  factures_count: number;
  users_count: number;
}

interface DecisionLogRow {
  id: string;
  created_at: string;
  module_key: string;
  agency_id: string | null;
  mode_requested: string;
  source_used: string;
  fallback_reason: string | null;
  freshness_minutes: number | null;
  item_count: number | null;
}

interface SnapshotRow {
  id: string;
  created_at: string;
  mirror_reads: number;
  live_reads: number;
  fallback_to_live: number;
  comparisons_total: number;
  comparisons_passed: number;
  comparisons_failed: number;
  last_freshness_minutes: number | null;
  last_mirror_count: number | null;
  verdict: string | null;
  verdict_reasons: string[] | null;
}

const DAX_AGENCY_ID = '58d8d39f-7544-4e78-86f9-c182eacf29f5';
const PILOT_MODULES = ['users', 'projects', 'factures'] as const;

const MODE_COLORS: Record<string, string> = {
  live: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  fallback: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  mirror: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
};

const FRESHNESS_COLORS: Record<string, string> = {
  fresh: 'text-green-600',
  stale: 'text-amber-600',
  outdated: 'text-red-600',
  never_synced: 'text-muted-foreground',
};

const VERDICT_STYLES: Record<PilotVerdict, string> = {
  'stable': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700',
  'à surveiller': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700',
  'rollback conseillé': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700',
  'inactif': 'bg-muted text-muted-foreground border-border',
};

const SIGNAL_STYLES = {
  green: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200',
  orange: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200',
  red: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200',
};

// ============================================================
// COMPONENT
// ============================================================

export default function AdminMirrorMonitor() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusRow[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [decisions, setDecisions] = useState<DecisionLogRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [projectsReadiness, setProjectsReadiness] = useState<ProjectsReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'decisions' | 'criteria'>('overview');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [flagsRes, syncRes, decisionsRes, snapshotsData] = await Promise.all([
        supabase
          .from('data_source_flags')
          .select('id, module_key, source_mode, agency_id, is_enabled, freshness_threshold_minutes, updated_at')
          .order('module_key'),
        supabase
          .from('apogee_sync_status' as any)
          .select('agency_id, agency_label, agency_slug, freshness_minutes, freshness_status, last_status, projects_count, factures_count, users_count') as any,
        supabase
          .from('mirror_decision_log' as any)
          .select('id, created_at, module_key, agency_id, mode_requested, source_used, fallback_reason, freshness_minutes, item_count')
          .order('created_at', { ascending: false })
          .limit(50) as any,
        loadPersistedSnapshots('users', DAX_AGENCY_ID, 50),
      ]);

      if (flagsRes.data) setFlags(flagsRes.data as FlagRow[]);
      if (syncRes.data) setSyncStatus(syncRes.data as SyncStatusRow[]);
      if (decisionsRes.data) setDecisions(decisionsRes.data as DecisionLogRow[]);
      setSnapshots(snapshotsData as SnapshotRow[]);
      setComparisons(getLastComparisonResults());

      // Check projects readiness (non-blocking)
      checkProjectsReadiness(DAX_AGENCY_ID).then(setProjectsReadiness).catch(() => {});
    } catch (err) {
      console.error('[MirrorMonitor] Load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    invalidateFlagsCache();
    loadData();
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const globalFlags = flags.filter(f => f.agency_id === null);
  const agencyFlags = flags.filter(f => f.agency_id !== null);
  const metrics = getPilotMetrics();

  // Compute verdict from both session + persisted data
  const usersMetrics = metrics['users'];
  const { verdict: currentVerdict, reasons: verdictReasons } = computePilotVerdictFromMetrics(usersMetrics, comparisons, 'users');
  const daxFlag = agencyFlags.find(f => f.module_key === 'users' && f.agency_id === DAX_AGENCY_ID);

  // Aggregate from persisted snapshots for evidence pack
  const latestSnapshot = snapshots[0] as SnapshotRow | undefined;
  const totalMirrorReads = (usersMetrics?.mirrorReads ?? 0) + snapshots.reduce((s, r) => s + r.mirror_reads, 0);
  const totalFallbacks = (usersMetrics?.fallbackToLive ?? 0) + snapshots.reduce((s, r) => s + r.fallback_to_live, 0);
  const totalComparisons = (usersMetrics?.comparisonsTotal ?? 0) + snapshots.reduce((s, r) => s + r.comparisons_total, 0);
  const totalCmpPassed = (usersMetrics?.comparisonsPassed ?? 0) + snapshots.reduce((s, r) => s + r.comparisons_passed, 0);
  const aggregatedFallbackRatio = (totalMirrorReads + totalFallbacks) > 0
    ? totalFallbacks / (totalMirrorReads + totalFallbacks) : 0;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Miroir Apogée — Pilote</h2>
          <p className="text-sm text-muted-foreground">
            Ordre d'activation : users → projects → factures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden text-xs">
            {(['overview', 'evidence', 'decisions', 'criteria'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {tab === 'overview' ? 'Vue' : tab === 'evidence' ? 'Evidence' : tab === 'decisions' ? 'Journal' : 'Critères'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Rollback info banner */}
      <div className="bg-muted/50 border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Rollback immédiat DAX users
        </p>
        <code className="block bg-background rounded px-2 py-1 font-mono text-[11px]">
          DELETE FROM data_source_flags WHERE module_key = 'users' AND agency_id = '{DAX_AGENCY_ID}';
        </code>
        <p>Aucun redéploiement requis. Le cache flags expire en 60s.</p>
      </div>

      {/* ====================== OVERVIEW TAB ====================== */}
      {activeTab === 'overview' && (
        <>
          {/* Pilot Verdict Banner */}
          {daxFlag && (
            <div className={`border rounded-lg p-3 text-sm space-y-1 ${VERDICT_STYLES[currentVerdict]}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  {currentVerdict === 'stable' && <CheckCircle2 className="h-4 w-4" />}
                  {(currentVerdict === 'à surveiller' || currentVerdict === 'rollback conseillé') && <AlertTriangle className="h-4 w-4" />}
                  {currentVerdict === 'inactif' && <Clock className="h-4 w-4" />}
                  Pilote DAX — users — Verdict : {currentVerdict.toUpperCase()}
                </span>
                <span className="text-xs opacity-75">Activé le {new Date(daxFlag.updated_at).toLocaleString('fr-FR')}</span>
              </div>
              <ul className="text-xs list-disc pl-5 space-y-0.5">
                {verdictReasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              <div className="text-[10px] opacity-75 mt-1">
                Seuils : fallback &gt;20% = surveiller | &gt;50% = rollback | 2+ comparaisons KO = rollback | delta vol &gt;15% = surveiller
              </div>
            </div>
          )}

          {/* Pilot Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PILOT_MODULES.map(moduleKey => {
              const flag = globalFlags.find(f => f.module_key === moduleKey);
              const agencyFlag = agencyFlags.find(f => f.module_key === moduleKey);
              const mode = agencyFlag?.source_mode || flag?.source_mode || 'live';
              const threshold = flag?.freshness_threshold_minutes || 240;
              const lastComparison = comparisons.find(c => c.module === moduleKey);
              const m = metrics[moduleKey];

              return (
                <Card key={moduleKey} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base capitalize flex items-center gap-2">
                        {mode === 'live' ? <Wifi className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                        {moduleKey}
                      </CardTitle>
                      <Badge className={MODE_COLORS[mode] || ''}>{mode}</Badge>
                    </div>
                    {agencyFlag && (
                      <p className="text-[10px] text-muted-foreground">
                        Override agence: {agencyFlag.agency_id?.substring(0, 8)}…
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Seuil fraîcheur</span>
                      <span>{threshold} min</span>
                    </div>

                    {m && (
                      <div className="border rounded p-2 space-y-1">
                        <p className="text-xs font-medium flex items-center gap-1">
                          <Activity className="h-3 w-3" /> Métriques session
                        </p>
                        <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                          <div className="text-center">
                            <span className="block text-foreground font-semibold">{m.mirrorReads}</span>
                            miroir
                          </div>
                          <div className="text-center">
                            <span className="block text-foreground font-semibold">{m.liveReads}</span>
                            live
                          </div>
                          <div className="text-center">
                            <span className="block text-foreground font-semibold">{m.fallbackToLive}</span>
                            fallback
                          </div>
                        </div>
                        {m.comparisonsTotal > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Comparaisons: {m.comparisonsPassed}✓ / {m.comparisonsFailed}✗ sur {m.comparisonsTotal}
                          </div>
                        )}
                        {Object.keys(m.fallbackReasons).length > 0 && (
                          <div className="text-[10px] text-amber-600 mt-1">
                            {Object.entries(m.fallbackReasons).map(([r, c]) => `${r}(${c})`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {lastComparison ? (
                      <div className="border rounded p-2 space-y-1">
                        <div className="flex items-center gap-1">
                          {lastComparison.passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          <span className="text-xs font-medium">
                            Comparaison {lastComparison.passed ? 'OK' : 'écart'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                          <span>Live: {lastComparison.liveCount}</span>
                          <span>Miroir: {lastComparison.mirrorCount}</span>
                          <span>Delta: {lastComparison.countDeltaPct}%</span>
                          <span>{new Date(lastComparison.timestamp).toLocaleTimeString('fr-FR')}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucune comparaison</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sync Status per Agency */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Fraîcheur par agence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée de sync disponible</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Agence</th>
                        <th className="pb-2 pr-4">Fraîcheur</th>
                        <th className="pb-2 pr-4">Statut</th>
                        <th className="pb-2 pr-4">Users</th>
                        <th className="pb-2 pr-4">Projects</th>
                        <th className="pb-2">Factures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncStatus.map(row => (
                        <tr key={row.agency_id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{row.agency_label || row.agency_slug}</td>
                          <td className="py-2 pr-4">
                            <span className={`flex items-center gap-1 ${FRESHNESS_COLORS[row.freshness_status] || ''}`}>
                              <Clock className="h-3 w-3" />
                              {row.freshness_minutes != null ? `${Math.round(row.freshness_minutes)} min` : 'jamais'}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant="outline" className="text-xs">{row.freshness_status || 'unknown'}</Badge>
                          </td>
                          <td className="py-2 pr-4">{row.users_count ?? 0}</td>
                          <td className="py-2 pr-4">{row.projects_count ?? 0}</td>
                          <td className="py-2">{row.factures_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ====================== EVIDENCE TAB ====================== */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {/* Evidence Pack Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Evidence Pack — users / DAX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border rounded-lg p-3 text-center">
                  <span className="text-2xl font-bold text-foreground">{totalMirrorReads}</span>
                  <p className="text-xs text-muted-foreground">Lectures miroir (cumulé)</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <span className="text-2xl font-bold text-foreground">{totalFallbacks}</span>
                  <p className="text-xs text-muted-foreground">Fallbacks → live (cumulé)</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <span className={`text-2xl font-bold ${aggregatedFallbackRatio > 0.2 ? 'text-amber-600' : 'text-foreground'}`}>
                    {Math.round(aggregatedFallbackRatio * 100)}%
                  </span>
                  <p className="text-xs text-muted-foreground">Ratio fallback (cumulé)</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <span className="text-2xl font-bold text-foreground">
                    {totalComparisons > 0 ? `${Math.round(totalCmpPassed / totalComparisons * 100)}%` : '—'}
                  </span>
                  <p className="text-xs text-muted-foreground">Comparaisons OK</p>
                </div>
              </div>

              {latestSnapshot && (
                <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium text-foreground">Dernier snapshot persisté</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-muted-foreground">
                    <span>Fraîcheur: {latestSnapshot.last_freshness_minutes != null ? `${Math.round(latestSnapshot.last_freshness_minutes)} min` : '—'}</span>
                    <span>Volume miroir: {latestSnapshot.last_mirror_count ?? '—'}</span>
                    <span>Verdict: {latestSnapshot.verdict ?? '—'}</span>
                    <span>{new Date(latestSnapshot.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Snapshot History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des snapshots</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun snapshot persisté. Les snapshots sont créés automatiquement toutes les 5 minutes lors de lectures miroir.</p>
              ) : (
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-1 pr-3">Date</th>
                        <th className="pb-1 pr-3">Miroir</th>
                        <th className="pb-1 pr-3">Fallback</th>
                        <th className="pb-1 pr-3">Cmp OK/KO</th>
                        <th className="pb-1 pr-3">Fraîcheur</th>
                        <th className="pb-1">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-1 pr-3">{new Date(s.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-1 pr-3">{s.mirror_reads}</td>
                          <td className="py-1 pr-3">{s.fallback_to_live}</td>
                          <td className="py-1 pr-3">{s.comparisons_passed}✓/{s.comparisons_failed}✗</td>
                          <td className="py-1 pr-3">{s.last_freshness_minutes != null ? `${Math.round(s.last_freshness_minutes)}m` : '—'}</td>
                          <td className="py-1">
                            <Badge variant="outline" className="text-[10px]">{s.verdict ?? '—'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects Readiness */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="h-4 w-4" /> Checkpoint → projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!projectsReadiness ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : (
                <div className="space-y-3">
                  <div className={`border rounded-lg p-3 text-sm ${SIGNAL_STYLES[projectsReadiness.signal]}`}>
                    <span className="font-semibold">
                      {projectsReadiness.signal === 'green' ? '🟢 FEU VERT' : projectsReadiness.signal === 'orange' ? '🟡 FEU ORANGE' : '🔴 FEU ROUGE'}
                      {' — '}ready_for_projects = {projectsReadiness.signal === 'green' ? 'true' : 'false'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(projectsReadiness.checks).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        {typeof value === 'boolean' ? (
                          value ? <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> : <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>

                  <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                    {projectsReadiness.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====================== DECISIONS TAB ====================== */}
      {activeTab === 'decisions' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <List className="h-4 w-4" /> Journal de décisions (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune décision enregistrée</p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {decisions.map(d => (
                  <div key={d.id} className="flex items-center gap-3 text-xs border-b pb-1 last:border-0">
                    <ArrowDownUp className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="font-medium w-16">{d.module_key}</span>
                    <Badge className={`${MODE_COLORS[d.source_used] || ''} text-[10px] px-1.5`}>
                      {d.source_used}
                    </Badge>
                    <span className="text-muted-foreground">
                      {d.mode_requested !== d.source_used ? `(demandé: ${d.mode_requested})` : ''}
                    </span>
                    {d.fallback_reason && (
                      <span className="text-amber-600 truncate max-w-48">{d.fallback_reason}</span>
                    )}
                    {d.item_count != null && (
                      <span className="text-muted-foreground">{d.item_count} items</span>
                    )}
                    <span className="text-muted-foreground ml-auto shrink-0">
                      {new Date(d.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ====================== CRITERIA TAB ====================== */}
      {activeTab === 'criteria' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Critères de succès du pilote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PILOT_MODULES.map(moduleKey => {
                const criteria = PILOT_SUCCESS_CRITERIA[moduleKey];
                const evaluation = evaluatePilotSuccess(moduleKey);

                return (
                  <div key={moduleKey} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{moduleKey}</span>
                      <Badge variant={evaluation.passed ? 'default' : 'outline'}>
                        {evaluation.passed ? '✓ Critères atteints' : 'En attente'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Durée min : {criteria.minDuration}</span>
                      <span>Max fallback : {criteria.maxFallbackRatio * 100}%</span>
                      <span>Max delta : {criteria.maxDeltaPct}%</span>
                      <span>Comparaisons OK : requis</span>
                    </div>
                    {evaluation.details && Object.keys(evaluation.details).length > 1 && (
                      <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-1.5 font-mono">
                        {Object.entries(evaluation.details)
                          .filter(([k]) => k !== 'reason')
                          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                          .join(' | ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prochaines étapes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p><strong>1.</strong> Pilote <code>users</code> DAX activé ✓</p>
              <p><strong>2.</strong> Surveiller métriques et journal pendant 48h–7j</p>
              <p><strong>3.</strong> Vérifier <strong>Evidence Pack</strong> pour données cumulées</p>
              <p><strong>4.</strong> Consulter <strong>Checkpoint → projects</strong> pour feu vert</p>
              <p><strong>5.</strong> Si tous critères atteints → activer <code>projects</code> en <code>fallback</code> pour DAX</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
