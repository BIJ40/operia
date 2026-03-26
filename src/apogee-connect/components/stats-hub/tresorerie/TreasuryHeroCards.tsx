/**
 * TreasuryHeroCards — KPI cards premium pour le cockpit trésorerie
 * 
 * Affiche des états honnêtes : si aucune banque n'est connectée ou si les données
 * ne sont pas encore remontées du provider, on affiche clairement "non disponible".
 */

import { Landmark, CreditCard, RefreshCcw, ArrowDownRight, ArrowUpRight, AlertCircle, Clock, Link2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { TreasuryOverview } from '@/apogee-connect/types/treasury';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  overview: TreasuryOverview | null;
  isLoading: boolean;
  hasConnections: boolean;
  hasRealBankData: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

interface HeroCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  subtitle?: string;
  accent?: string;
  isEmpty?: boolean;
  isPending?: boolean;
}

function HeroCard({ icon, label, value, subtitle, accent, isEmpty, isPending }: HeroCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm transition-all ${isEmpty || isPending ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className={`text-xl font-bold tabular-nums ${accent ?? 'text-foreground'}`}>{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground/70 truncate">{subtitle}</p>}
        </div>
        <div className="shrink-0 rounded-lg bg-muted/50 p-2">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function TreasuryHeroCards({ overview, isLoading, hasConnections, hasRealBankData }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const noBank = !hasConnections;
  const pendingSync = hasConnections && !hasRealBankData;
  const o = overview;
  const lastSync = o?.lastSyncAt
    ? formatDistanceToNow(new Date(o.lastSyncAt), { addSuffix: true, locale: fr })
    : null;

  const pendingLabel = 'En attente de synchronisation';
  const noBankLabel = 'Connectez une banque';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <HeroCard
        icon={<Landmark className="h-4 w-4 text-emerald-600" />}
        label="Trésorerie consolidée"
        value={noBank ? '—' : pendingSync ? '—' : fmt(o?.consolidatedBalance ?? 0)}
        subtitle={noBank ? noBankLabel : pendingSync ? pendingLabel : undefined}
        accent={!noBank && !pendingSync && (o?.consolidatedBalance ?? 0) >= 0 ? 'text-emerald-600' : noBank || pendingSync ? undefined : 'text-red-600'}
        isEmpty={noBank}
        isPending={pendingSync}
      />
      <HeroCard
        icon={<CreditCard className="h-4 w-4 text-blue-600" />}
        label="Comptes connectés"
        value={noBank ? '—' : pendingSync ? '0' : String(o?.connectedAccountsCount ?? 0)}
        subtitle={noBank ? noBankLabel : pendingSync ? pendingLabel : `${o?.connectedBanksCount ?? 0} banque${(o?.connectedBanksCount ?? 0) > 1 ? 's' : ''}`}
        isEmpty={noBank}
        isPending={pendingSync}
      />
      <HeroCard
        icon={<Link2 className="h-4 w-4 text-indigo-600" />}
        label="Banques connectées"
        value={noBank ? '—' : pendingSync ? '0' : String(o?.connectedBanksCount ?? 0)}
        subtitle={pendingSync ? pendingLabel : undefined}
        isEmpty={noBank}
        isPending={pendingSync}
      />
      <HeroCard
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        label="Dernière synchro"
        value={noBank ? '—' : lastSync ?? 'Jamais'}
        subtitle={noBank ? noBankLabel : undefined}
        isEmpty={noBank}
      />
      <HeroCard
        icon={<ArrowDownRight className="h-4 w-4 text-emerald-600" />}
        label="Encaissements récents"
        value={noBank || pendingSync ? '—' : fmt(o?.recentCredits ?? 0)}
        subtitle={noBank ? noBankLabel : pendingSync ? 'Disponible après première synchro' : undefined}
        accent="text-emerald-600"
        isEmpty={noBank}
        isPending={pendingSync}
      />
      <HeroCard
        icon={<ArrowUpRight className="h-4 w-4 text-red-500" />}
        label="Décaissements récents"
        value={noBank || pendingSync ? '—' : fmt(o?.recentDebits ?? 0)}
        subtitle={noBank ? noBankLabel : pendingSync ? 'Disponible après première synchro' : undefined}
        accent="text-red-600"
        isEmpty={noBank}
        isPending={pendingSync}
      />
      <HeroCard
        icon={<RefreshCcw className="h-4 w-4 text-yellow-600" />}
        label="Non rapprochées"
        value={noBank || pendingSync ? '—' : String(o?.unmatchedTransactionsCount ?? 0)}
        subtitle={noBank ? noBankLabel : pendingSync ? 'Disponible après première synchro' : 'Transactions'}
        isEmpty={noBank}
        isPending={pendingSync}
      />
      <HeroCard
        icon={<AlertCircle className="h-4 w-4 text-red-500" />}
        label="Comptes en erreur"
        value={noBank ? '—' : String(o?.errorAccountsCount ?? 0)}
        accent={(o?.errorAccountsCount ?? 0) > 0 ? 'text-red-600' : undefined}
        isEmpty={noBank}
      />
    </div>
  );
}
