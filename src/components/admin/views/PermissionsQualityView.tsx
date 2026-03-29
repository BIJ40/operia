import React from 'react';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { useModuleCatalog } from '@/hooks/access-rights/useModuleCatalog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface Anomaly {
  type: string;
  label: string;
  detail: string;
  severity: 'error' | 'warning';
}

function useAnomalies(deployedKeys: Set<string>, coreKeys: Set<string>) {
  return useQuery({
    queryKey: ['permissions_anomalies'],
    enabled: deployedKeys.size > 0,
    queryFn: async (): Promise<Anomaly[]> => {
      const anomalies: Anomaly[] = [];

      // 1. Modules non déployés attribués dans user_access
      const { data: phantomAccess } = await supabase
        .from('user_access')
        .select('user_id, module_key')
        .eq('granted', true);

      (phantomAccess ?? []).forEach(row => {
        if (!deployedKeys.has(row.module_key)) {
          anomalies.push({
            type: 'phantom_module',
            severity: 'error',
            label: 'Module non déployé attribué',
            detail: `user_access: ${row.module_key} attribué à ${row.user_id} mais non déployé`,
          });
        }
      });

      // 2. Deny sur module socle (is_core)
      const { data: denyCore } = await supabase
        .from('user_access')
        .select('user_id, module_key')
        .eq('granted', false);

      (denyCore ?? []).forEach(row => {
        if (coreKeys.has(row.module_key)) {
          anomalies.push({
            type: 'deny_on_core',
            severity: 'warning',
            label: 'Deny sur module socle',
            detail: `Deny explicite sur ${row.module_key} pour ${row.user_id} — module socle`,
          });
        }
      });

      // 3. Options expirées encore actives
      const { data: expiredOptions } = await supabase
        .from('agency_module_entitlements')
        .select('agency_id, module_key, expires_at, trial_ends_at')
        .eq('is_active', true)
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString());

      (expiredOptions ?? []).forEach(row => {
        anomalies.push({
          type: 'expired_option',
          severity: 'warning',
          label: 'Option expirée encore active',
          detail: `agency_module_entitlements: ${row.module_key} pour ${row.agency_id} — expiré le ${row.expires_at}`,
        });
      });

      // 4. Trials expirés encore actifs
      const { data: expiredTrials } = await supabase
        .from('agency_module_entitlements')
        .select('agency_id, module_key, trial_ends_at')
        .eq('is_active', true)
        .not('trial_ends_at', 'is', null)
        .lt('trial_ends_at', new Date().toISOString());

      (expiredTrials ?? []).forEach(row => {
        anomalies.push({
          type: 'expired_trial',
          severity: 'warning',
          label: 'Trial expiré encore actif',
          detail: `Trial expiré pour ${row.module_key} / agence ${row.agency_id}`,
        });
      });

      return anomalies;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function PermissionsQualityView() {
  const { isAdmin } = usePermissionsBridge();
  const { modules } = useModuleCatalog();
  const queryClient = useQueryClient();

  const coreKeys = new Set(modules.filter(m => m.is_core).map(m => m.key));
  const deployedKeys = new Set(modules.filter(m => m.is_deployed).map(m => m.key));

  const { data: anomalies = [], isLoading, refetch } = useAnomalies(deployedKeys, coreKeys);

  const fixExpiredOptions = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('agency_module_entitlements')
        .update({ is_active: false })
        .eq('is_active', true)
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString());
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions_anomalies'] });
      refetch();
    },
  });

  const fixExpiredTrials = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('agency_module_entitlements')
        .update({ is_active: false })
        .eq('is_active', true)
        .not('trial_ends_at', 'is', null)
        .lt('trial_ends_at', new Date().toISOString());
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions_anomalies'] });
      refetch();
    },
  });

  if (!isAdmin) {
    return <p className="text-muted-foreground p-4">Accès réservé aux administrateurs plateforme.</p>;
  }

  const errors = anomalies.filter(a => a.severity === 'error');
  const warnings = anomalies.filter(a => a.severity === 'warning');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Qualité des permissions</h2>
          <p className="text-sm text-muted-foreground">Détection automatique des anomalies dans la configuration des droits.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">V2</Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Rafraîchir
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && anomalies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
          <p className="text-foreground font-medium">Aucune anomalie détectée. Configuration conforme.</p>
        </div>
      )}

      {!isLoading && errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium text-sm">Erreurs ({errors.length})</span>
          </div>
          {errors.map((a, i) => (
            <div key={i} className="border border-destructive/20 bg-destructive/5 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">{a.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && warnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium text-sm">Avertissements ({warnings.length})</span>
          </div>
          {warnings.map((a, i) => (
            <div key={i} className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{a.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
              </div>
              {a.type === 'expired_option' && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => fixExpiredOptions.mutate()} disabled={fixExpiredOptions.isPending}>
                  Corriger tout
                </Button>
              )}
              {a.type === 'expired_trial' && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => fixExpiredTrials.mutate()} disabled={fixExpiredTrials.isPending}>
                  Corriger tout
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PermissionsQualityView;
