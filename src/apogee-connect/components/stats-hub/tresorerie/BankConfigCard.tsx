/**
 * BankConfigCard — Configuration du provider bancaire
 */

import { Shield, CheckCircle2, AlertTriangle, XCircle, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { BankProviderConfig, BankConfigStatus } from '@/apogee-connect/types/treasury';

interface Props {
  config: BankProviderConfig | null;
  isLoading: boolean;
}

const STATUS_MAP: Record<BankConfigStatus, { icon: React.ReactNode; label: string; color: string }> = {
  not_configured: { icon: <Settings className="h-4 w-4" />, label: 'Non configuré', color: 'text-muted-foreground' },
  partial: { icon: <AlertTriangle className="h-4 w-4" />, label: 'Partiellement configuré', color: 'text-yellow-600' },
  ready: { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Prêt à connecter', color: 'text-emerald-600' },
  error: { icon: <XCircle className="h-4 w-4" />, label: 'Erreur de configuration', color: 'text-red-600' },
};

export function BankConfigCard({ config, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    );
  }

  const status = config?.config_status ?? 'not_configured';
  const statusInfo = STATUS_MAP[status];

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-4.5 w-4.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Configuration accès bancaire</h3>
      </div>

      <div className="space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={statusInfo.color}>{statusInfo.icon}</span>
          <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium capitalize">{config?.provider ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environnement</span>
            <span className="font-medium">
              {config?.environment === 'production' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Production
                </span>
              ) : (
                <span className="text-yellow-600">Sandbox</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Clé publique</span>
            <span className={`font-medium ${config?.has_client_id ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {config?.has_client_id ? '✓ Configurée' : '✗ Absente'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Clé secrète</span>
            <span className={`font-medium ${config?.has_secret_key ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {config?.has_secret_key ? '✓ Côté serveur' : '✗ Absente'}
            </span>
          </div>
        </div>

        {/* Integration status */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Connexion bancaire</span>
            <span className={`font-medium ${config?.is_ready ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {config?.is_ready ? 'Disponible' : 'Non disponible'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
