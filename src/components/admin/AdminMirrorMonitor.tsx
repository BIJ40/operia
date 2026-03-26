/**
 * Admin Mirror Monitor — Enhanced pilot monitoring panel
 * Shows pilot module status, metrics, pre-activation checks, decision journal.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Database, Wifi, AlertTriangle, CheckCircle2, Clock, Activity, ShieldCheck, ArrowDownUp, List } from 'lucide-react';
import { getLastComparisonResults, type ComparisonResult } from '@/services/mirrorValidation';
import { invalidateFlagsCache } from '@/services/mirrorDataSource';
import { getPilotMetrics, evaluatePilotSuccess, canActivateMirrorPilot, PILOT_SUCCESS_CRITERIA, type PilotMetrics } from '@/services/mirrorPilotActivation';

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

// ============================================================
// COMPONENT
// ============================================================

export default function AdminMirrorMonitor() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusRow[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [decisions, setDecisions] = useState<DecisionLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'decisions' | 'criteria'>('overview');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [flagsRes, syncRes, decisionsRes] = await Promise.all([
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
      ]);

      if (flagsRes.data) setFlags(flagsRes.data as FlagRow[]);
      if (syncRes.data) setSyncStatus(syncRes.data as SyncStatusRow[]);
      if (decisionsRes.data) setDecisions(decisionsRes.data as DecisionLogRow[]);
      setComparisons(getLastComparisonResults());
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
            {(['overview', 'decisions', 'criteria'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {tab === 'overview' ? 'Vue' : tab === 'decisions' ? 'Journal' : 'Critères'}
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
          <ShieldCheck className="h-3.5 w-3.5" /> Rollback immédiat
        </p>
        <code className="block bg-background rounded px-2 py-1 font-mono text-[11px]">
          UPDATE data_source_flags SET source_mode = 'live' WHERE module_key = 'users';
        </code>
        <p>Aucun redéploiement requis. Le cache flags expire en 60s.</p>
      </div>

      {activeTab === 'overview' && (
        <>
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

                    {/* Metrics */}
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
                        {Object.keys(m.fallbackReasons).length > 0 && (
                          <div className="text-[10px] text-amber-600 mt-1">
                            {Object.entries(m.fallbackReasons).map(([r, c]) => `${r}(${c})`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Last comparison */}
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

      {activeTab === 'criteria' && (
        <div className="space-y-4">
          {/* Success Criteria */}
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

          {/* Next steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prochaines étapes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p><strong>1.</strong> Lancer une sync complète pour remplir les tables miroir</p>
              <p><strong>2.</strong> Activer <code>users</code> en <code>fallback</code> pour 1 agence pilote :</p>
              <code className="block bg-muted rounded px-2 py-1 font-mono text-[11px] my-1">
                INSERT INTO data_source_flags (module_key, source_mode, agency_id, is_enabled, freshness_threshold_minutes)
                VALUES ('users', 'fallback', 'AGENCY_UUID', true, 480);
              </code>
              <p><strong>3.</strong> Surveiller les métriques et le journal pendant 48h–7j</p>
              <p><strong>4.</strong> Si critères atteints → étendre à <code>projects</code></p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
