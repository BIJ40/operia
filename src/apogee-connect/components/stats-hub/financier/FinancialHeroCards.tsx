/**
 * FinancialHeroCards — Strategic KPI cards for the Financier tab hero section
 * V2: Clickable tiles, renamed "Âge moyen encours", fiabilité badge
 */

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Banknote, Building2, Users, CheckCircle2, Percent, FileWarning, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { FinancialKPIs, FiabiliteScore } from '@/apogee-connect/types/financial';
import { cn } from '@/lib/utils';

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

interface HeroCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  accentClass?: string;
  badgeText?: string;
  badgeClass?: string;
  onClick?: () => void;
}

function HeroCard({ icon, label, value, subtitle, accentClass = 'text-foreground', badgeText, badgeClass, onClick }: HeroCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card
        className={cn(
          'relative overflow-hidden p-4 h-full border-border/50 bg-gradient-to-br from-card to-muted/20 transition-all',
          onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30 hover:scale-[1.01]'
        )}
        onClick={onClick}
      >
        {badgeText && (
          <span className={cn('absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badgeClass)}>
            {badgeText}
          </span>
        )}
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg bg-muted/60 shrink-0', accentClass)}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={cn('text-lg font-bold tabular-nums leading-tight mt-0.5', accentClass)}>{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export type KpiTileId = 'duTotal' | 'duClients' | 'duApporteurs' | 'encaisse' | 'tauxRecouvrement' | 'facturesAvecSolde' | 'ageMoyen' | 'retard30';

interface FinancialHeroCardsProps {
  kpis: FinancialKPIs | null;
  fiabilite?: FiabiliteScore | null;
  isLoading: boolean;
  onTileClick?: (tileId: KpiTileId) => void;
}

export function FinancialHeroCards({ kpis, fiabilite, isLoading, onTileClick }: FinancialHeroCardsProps) {
  if (isLoading || !kpis) return <SkeletonCards />;

  const riskColor = kpis.tauxRecouvrement >= 90
    ? 'text-emerald-600 dark:text-emerald-400'
    : kpis.tauxRecouvrement >= 70
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-destructive';

  const retardBadge = kpis.montantRetard90 > 0
    ? { text: 'Critique', cls: 'bg-destructive/15 text-destructive' }
    : kpis.montantRetard30 > 0
      ? { text: 'Surveillance', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
      : null;

  const fiabBadge = fiabilite ? {
    text: fiabilite.level === 'forte' ? '✓ Fiable' : fiabilite.level === 'moyenne' ? '~ Moyenne' : '⚠ Fragile',
    cls: fiabilite.level === 'forte'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : fiabilite.level === 'moyenne'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-destructive/15 text-destructive',
  } : null;

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
    >
      <HeroCard
        icon={<Banknote className="h-5 w-5" />}
        label="Dû total TTC"
        value={formatEuros(kpis.duTotal)}
        accentClass="text-destructive"
        badgeText={retardBadge?.text}
        badgeClass={retardBadge?.cls}
        onClick={() => onTileClick?.('duTotal')}
      />
      <HeroCard
        icon={<Building2 className="h-5 w-5" />}
        label="Dû clients directs"
        value={formatEuros(kpis.duClientsDirects)}
        subtitle={`${kpis.duTotal > 0 ? Math.round((kpis.duClientsDirects / kpis.duTotal) * 100) : 0}% du total`}
        accentClass="text-blue-600 dark:text-blue-400"
        onClick={() => onTileClick?.('duClients')}
      />
      <HeroCard
        icon={<Users className="h-5 w-5" />}
        label="Dû apporteurs"
        value={formatEuros(kpis.duApporteurs)}
        subtitle={`${kpis.duTotal > 0 ? Math.round((kpis.duApporteurs / kpis.duTotal) * 100) : 0}% du total`}
        accentClass="text-violet-600 dark:text-violet-400"
        onClick={() => onTileClick?.('duApporteurs')}
      />
      <HeroCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="Montant encaissé"
        value={formatEuros(kpis.totalEncaisse)}
        accentClass="text-emerald-600 dark:text-emerald-400"
      />
      <HeroCard
        icon={<Percent className="h-5 w-5" />}
        label="Taux de recouvrement"
        value={`${kpis.tauxRecouvrement}%`}
        accentClass={riskColor}
      />
      <HeroCard
        icon={<FileWarning className="h-5 w-5" />}
        label="Factures avec solde"
        value={String(kpis.nbFacturesAvecSolde)}
        subtitle="factures non soldées"
      />
      <HeroCard
        icon={<Clock className="h-5 w-5" />}
        label="Âge moyen encours"
        value={kpis.ageMoyenEncours !== null ? `${kpis.ageMoyenEncours} j` : 'N/A'}
        subtitle="des factures non soldées"
      />
      <HeroCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Retard > 30 jours"
        value={formatEuros(kpis.montantRetard30)}
        accentClass={kpis.montantRetard30 > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}
        badgeText={fiabBadge?.text}
        badgeClass={fiabBadge?.cls}
        onClick={() => onTileClick?.('retard30')}
      />
    </motion.div>
  );
}
