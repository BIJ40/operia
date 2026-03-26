/**
 * Admin Mirror Monitor — Lightweight monitoring panel
 * Shows pilot module status, freshness, comparison results, flags.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Database, Wifi, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { getLastComparisonResults, type ComparisonResult } from '@/services/mirrorValidation';
import { invalidateFlagsCache } from '@/services/mirrorDataSource';

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

const PILOT_MODULES = ['users', 'projects', 'factures'] as const;

const MODE_COLORS: Record<string, string> = {
  live: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  fallback: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  mirror: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [flagsRes, syncRes] = await Promise.all([
        supabase
          .from('data_source_flags')
          .select('id, module_key, source_mode, agency_id, is_enabled, freshness_threshold_minutes, updated_at')
          .order('module_key'),
      const syncRes = await supabase
          .from('apogee_sync_status' as any)
          .select('agency_id, agency_label, agency_slug, freshness_minutes, freshness_status, last_status, projects_count, factures_count, users_count') as { data: SyncStatusRow[] | null; error: any };

      if (flagsRes.data) setFlags(flagsRes.data as FlagRow[]);
      if (syncRes.data) setSyncStatus(syncRes.data);
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

  // Global flags (agency_id = null)
  const globalFlags = flags.filter(f => f.agency_id === null);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Miroir Apogée — Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Modules pilotes : users → projects → factures
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Pilot Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PILOT_MODULES.map(moduleKey => {
          const flag = globalFlags.find(f => f.module_key === moduleKey);
          const mode = flag?.source_mode || 'live';
          const threshold = flag?.freshness_threshold_minutes || 240;
          const lastComparison = comparisons.find(c => c.module === moduleKey);

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
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Threshold */}
                <div className="flex justify-between text-muted-foreground">
                  <span>Seuil fraîcheur</span>
                  <span>{threshold} min</span>
                </div>

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
                        Comparaison {lastComparison.passed ? 'OK' : 'écart détecté'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                      <span>Live: {lastComparison.liveCount}</span>
                      <span>Miroir: {lastComparison.mirrorCount}</span>
                      <span>Delta: {lastComparison.countDeltaPct}%</span>
                      <span>{new Date(lastComparison.timestamp).toLocaleTimeString('fr-FR')}</span>
                    </div>
                    {lastComparison.details && (
                      <p className="text-xs text-amber-600">{lastComparison.details}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Aucune comparaison</p>
                )}

                {/* Status */}
                <div className="flex justify-between text-xs">
                  <span>Activé</span>
                  <span>{flag?.is_enabled ? '✓' : '✗'}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Status per Agency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fraîcheur par agence</CardTitle>
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
                    <th className="pb-2 pr-4">Projects</th>
                    <th className="pb-2 pr-4">Factures</th>
                    <th className="pb-2">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {syncStatus.map(row => (
                    <tr key={row.agency_id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.agency_label || row.agency_slug}</td>
                      <td className="py-2 pr-4">
                        <span className={`flex items-center gap-1 ${FRESHNESS_COLORS[row.freshness_status] || ''}`}>
                          <Clock className="h-3 w-3" />
                          {row.freshness_minutes != null
                            ? `${Math.round(row.freshness_minutes)} min`
                            : 'jamais'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {row.freshness_status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{row.projects_count ?? 0}</td>
                      <td className="py-2 pr-4">{row.factures_count ?? 0}</td>
                      <td className="py-2">{row.users_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Comparisons Log */}
      {comparisons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparaisons récentes (live vs miroir)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comparisons.slice(0, 20).map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs border-b pb-1 last:border-0">
                  {c.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  )}
                  <span className="font-medium w-20">{c.module}</span>
                  <span className="text-muted-foreground w-32 truncate">{c.agencyId.substring(0, 8)}…</span>
                  <span>L:{c.liveCount} M:{c.mirrorCount}</span>
                  <span className="text-muted-foreground">Δ{c.countDeltaPct}%</span>
                  <span className="text-muted-foreground ml-auto">
                    {new Date(c.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
