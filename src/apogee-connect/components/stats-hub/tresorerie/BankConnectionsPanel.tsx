/**
 * BankConnectionsPanel — Liste des connexions bancaires multi-utilisateurs
 */

import { useState } from 'react';
import { RefreshCcw, Plug, Unplug, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BankConnection } from '@/apogee-connect/types/treasury';
import { CONNECTION_STATUS_LABELS, CONNECTION_STATUS_COLORS } from '@/apogee-connect/types/treasury';
import { BankConnectionSheet } from './BankConnectionSheet';

interface Props {
  connections: BankConnection[];
  isLoading: boolean;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  isSyncing?: boolean;
}

export function BankConnectionsPanel({ connections, isLoading, onSync, onDisconnect, isSyncing }: Props) {
  const [showSheet, setShowSheet] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Connexions bancaires</h3>
            <span className="text-xs text-muted-foreground">({connections.length})</span>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowSheet(true)}>
            <Plus className="h-3.5 w-3.5" />
            Connecter
          </Button>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plug className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Aucune connexion bancaire</p>
            <p className="text-xs mt-1">Connectez votre première banque pour commencer</p>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map(conn => (
              <div
                key={conn.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/60 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{conn.display_name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CONNECTION_STATUS_COLORS[conn.status]}`}>
                      {CONNECTION_STATUS_LABELS[conn.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="capitalize">{conn.provider}</span>
                    {conn.last_sync_at && (
                      <span>Synchro {formatDistanceToNow(new Date(conn.last_sync_at), { addSuffix: true, locale: fr })}</span>
                    )}
                    {conn.error_message && (
                      <span className="text-red-500 truncate max-w-[200px]">{conn.error_message}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {conn.status === 'active' || conn.status === 'error' || conn.status === 'requires_reauth' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onSync(conn.id)}
                      disabled={isSyncing}
                      title="Resynchroniser"
                    >
                      <RefreshCcw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                    onClick={() => onDisconnect(conn.id)}
                    title="Déconnecter"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BankConnectionSheet open={showSheet} onOpenChange={setShowSheet} />
    </>
  );
}
