/**
 * BankAccountsPanel — Comptes bancaires avec soldes
 */

import { Wallet, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { BankAccount } from '@/apogee-connect/types/treasury';
import { ACCOUNT_TYPE_LABELS } from '@/apogee-connect/types/treasury';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  accounts: BankAccount[];
  isLoading: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
}

const SYNC_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  synced: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  stale: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const SYNC_LABEL: Record<string, string> = {
  pending: 'En attente',
  synced: 'Synchronisé',
  error: 'Erreur',
  stale: 'Obsolète',
};

export function BankAccountsPanel({ accounts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Comptes bancaires</h3>
        <span className="text-xs text-muted-foreground">({accounts.length})</span>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Aucun compte bancaire</p>
          <p className="text-xs mt-1">Les comptes apparaîtront après connexion et synchronisation</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {accounts.map(account => (
            <div
              key={account.id}
              className="rounded-lg border border-border/40 bg-background/60 p-4 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground truncate">{account.bank_name || 'Banque'}</span>
                  </div>
                  <p className="text-sm font-semibold mt-0.5 truncate">{account.account_label || 'Compte'}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${SYNC_BADGE[account.sync_status]}`}>
                  {SYNC_LABEL[account.sync_status]}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Solde</span>
                  <span className={`text-base font-bold tabular-nums ${Number(account.balance) >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                    {fmt(Number(account.balance))}
                  </span>
                </div>
                {account.available_balance != null && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Disponible</span>
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">
                      {fmt(Number(account.available_balance))}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 pt-1 border-t border-border/30">
                  <span>{account.iban_masked ?? '•••• •••• ••••'} · {account.currency}</span>
                  <span className="capitalize">{ACCOUNT_TYPE_LABELS[account.account_type]}</span>
                </div>
                {account.balance_updated_at && (
                  <p className="text-[10px] text-muted-foreground/50">
                    MAJ {formatDistanceToNow(new Date(account.balance_updated_at), { addSuffix: true, locale: fr })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
