/**
 * KpiDetailDialog — Popup de détail pour chaque tuile KPI du cockpit apporteur
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus, LucideIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type {
  ApporteurKpisV2,
  TrendValue,
  Series12m,
  MonthlyValue,
} from '../../types/apporteur-stats-v2';

export type KpiDetailType =
  | 'ca_genere'
  | 'panier_moyen'
  | 'taux_transfo'
  | 'dossiers_en_cours'
  | 'devis_envoyes'
  | 'factures_en_attente'
  | 'delai_rdv'
  | 'delai_devis';

interface KpiDetailDialogProps {
  open: boolean;
  onClose: () => void;
  type: KpiDetailType | null;
  kpis: ApporteurKpisV2;
  trends: Record<string, TrendValue | null>;
  series: Series12m;
}

interface DetailRow {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function formatMonth(m: string) {
  const [, mm] = m.split('-');
  return MONTH_LABELS[parseInt(mm, 10) - 1] || mm;
}

function TrendBadge({ trend }: { trend?: TrendValue | null }) {
  if (!trend || (trend.delta === 0 && trend.pct === 0)) return null;
  const isPositive = trend.pct > 0;
  const isNegative = trend.pct < 0;
  return (
    <div className={cn(
      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
      isPositive && 'bg-[hsl(var(--ap-success-light))] text-[hsl(var(--ap-success))]',
      isNegative && 'bg-destructive/10 text-destructive',
      !isPositive && !isNegative && 'bg-muted text-muted-foreground'
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {isPositive ? '+' : ''}{trend.pct.toFixed(1)}% vs N-1
    </div>
  );
}

function MiniChart({ data, dataKey, formatFn, color = 'hsl(var(--primary))' }: {
  data: { month: string; value: number }[];
  dataKey?: string;
  formatFn?: (v: number) => string;
  color?: string;
}) {
  if (!data || data.length < 2) return null;
  const chartData = data.map(d => ({ name: formatMonth(d.month), value: d.value }));

  return (
    <div className="h-[140px] w-full mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`kpi-grad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatFn || ((v) => String(v))} />
          <Tooltip
            formatter={(value: number) => [formatFn ? formatFn(value) : value, '']}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#kpi-grad-${color.replace(/[^a-z0-9]/gi, '')})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KpiDetailDialog({ open, onClose, type, kpis, trends, series }: KpiDetailDialogProps) {
  const navigate = useNavigate();

  if (!type) return null;

  const goToDossiers = (search?: string) => {
    onClose();
    navigate(`/apporteur/dashboard?tab=dossiers${search ? `&search=${search}` : ''}`);
  };

  const configs: Record<KpiDetailType, {
    title: string;
    rows: DetailRow[];
    chartData?: MonthlyValue[];
    chartFormat?: (v: number) => string;
    chartColor?: string;
    actionLabel?: string;
    onAction?: () => void;
    explanation?: string;
  }> = {
    ca_genere: {
      title: 'CA Généré — Détail',
      rows: [
        { label: 'Chiffre d\'affaires HT', value: formatCurrency(kpis.ca_genere), highlight: true },
        { label: 'Nombre de factures', value: String(kpis.factures_en_attente.count + (kpis.factures_reglees?.count || 0)) },
        { label: 'Factures réglées', value: `${kpis.factures_reglees?.count || 0} — ${formatCurrency(kpis.factures_reglees?.amount || 0)}` },
        { label: 'Factures en attente', value: `${kpis.factures_en_attente.count} — ${formatCurrency(kpis.factures_en_attente.amount)}` },
        { label: 'Panier moyen', value: formatCurrency(kpis.panier_moyen), muted: true },
      ],
      chartData: series.ca_ht,
      chartFormat: (v) => `${Math.round(v / 1000)}k`,
      explanation: 'Somme des factures HT émises (hors avoirs) sur la période sélectionnée.',
      actionLabel: 'Voir les dossiers',
      onAction: () => goToDossiers(),
    },
    panier_moyen: {
      title: 'Panier Moyen — Détail',
      rows: [
        { label: 'Panier moyen HT', value: formatCurrency(kpis.panier_moyen), highlight: true },
        { label: 'CA généré', value: formatCurrency(kpis.ca_genere) },
        { label: 'Nombre de factures', value: String(kpis.factures_en_attente.count + (kpis.factures_reglees?.count || 0)) },
      ],
      chartData: series.ca_ht,
      chartFormat: (v) => `${Math.round(v / 1000)}k`,
      explanation: 'CA HT total ÷ nombre de factures. Reflète le montant moyen par intervention facturée.',
    },
    taux_transfo: {
      title: 'Taux de Transformation — Détail',
      rows: [
        { label: 'Taux de transformation', value: `${kpis.taux_transformation.toFixed(1)}%`, highlight: true },
        { label: 'Devis envoyés', value: String(kpis.devis_envoyes) },
        { label: 'Devis validés', value: String(kpis.devis_valides) },
        { label: 'Devis refusés', value: String(kpis.devis_refuses) },
        { label: 'En attente', value: String(Math.max(0, kpis.devis_envoyes - kpis.devis_valides - kpis.devis_refuses)), muted: true },
      ],
      chartData: series.taux_transformation,
      chartFormat: (v) => `${v.toFixed(0)}%`,
      chartColor: 'hsl(var(--ap-success))',
      explanation: 'Devis validés ÷ devis envoyés. Un taux élevé traduit une bonne adéquation entre les demandes et les propositions de l\'agence.',
    },
    dossiers_en_cours: {
      title: 'Dossiers en Cours — Détail',
      rows: [
        { label: 'Dossiers en cours', value: String(kpis.dossiers_en_cours), highlight: true },
        { label: 'Devis envoyés', value: String(kpis.devis_envoyes) },
        { label: 'Devis validés', value: String(kpis.devis_valides) },
        { label: 'Factures en attente', value: String(kpis.factures_en_attente.count) },
      ],
      chartData: series.dossiers,
      chartFormat: (v) => String(Math.round(v)),
      chartColor: 'hsl(var(--primary))',
      explanation: 'Nombre de dossiers non clos et non annulés sur la période.',
      actionLabel: 'Voir tous les dossiers',
      onAction: () => goToDossiers(),
    },
    devis_envoyes: {
      title: 'Devis Envoyés — Détail',
      rows: [
        { label: 'Devis envoyés', value: String(kpis.devis_envoyes), highlight: true },
        { label: 'Validés', value: String(kpis.devis_valides) },
        { label: 'Refusés', value: String(kpis.devis_refuses) },
        { label: 'En attente', value: String(Math.max(0, kpis.devis_envoyes - kpis.devis_valides - kpis.devis_refuses)) },
        { label: 'Taux transfo', value: `${kpis.taux_transformation.toFixed(1)}%`, muted: true },
      ],
      explanation: 'Tous les devis émis par l\'agence pour vos dossiers sur la période (hors annulés).',
    },
    factures_en_attente: {
      title: 'Factures en Attente — Détail',
      rows: [
        { label: 'Montant en attente', value: formatCurrency(kpis.factures_en_attente.amount), highlight: true },
        { label: 'Nombre de factures', value: String(kpis.factures_en_attente.count) },
        { label: 'Factures réglées', value: `${kpis.factures_reglees?.count || 0} — ${formatCurrency(kpis.factures_reglees?.amount || 0)}` },
        { label: 'CA total', value: formatCurrency(kpis.ca_genere), muted: true },
      ],
      explanation: 'Somme des restes à payer (factures HT non entièrement réglées).',
      actionLabel: 'Voir les dossiers',
      onAction: () => goToDossiers(),
    },
    delai_rdv: {
      title: 'Délai RDV — Détail',
      rows: [
        { label: 'Délai moyen', value: `${kpis.avg_rdv_delay_days.toFixed(0)} jours`, highlight: true },
        { label: 'Couverture', value: `${kpis.coverage_rdv_delay.toFixed(0)}%` },
        { label: 'Dossiers avec RDV', value: `${kpis.coverage_rdv_delay.toFixed(0)}% des dossiers`, muted: true },
      ],
      chartData: series.avg_delays_days?.map(d => ({ month: d.month, value: d.rdv })),
      chartFormat: (v) => `${Math.round(v)}j`,
      chartColor: 'hsl(var(--ap-info))',
      explanation: 'Délai moyen entre la création du dossier et le premier RDV planifié. La couverture indique le % de dossiers pris en compte (ceux avec au moins un RDV).',
    },
    delai_devis: {
      title: 'Délai Validation Devis — Détail',
      rows: [
        { label: 'Délai moyen', value: `${kpis.avg_devis_validation_delay_days.toFixed(0)} jours`, highlight: true },
        { label: 'Couverture', value: `${kpis.coverage_devis_validation_delay.toFixed(0)}%` },
        { label: 'Devis validés', value: String(kpis.devis_valides), muted: true },
      ],
      chartData: series.avg_delays_days?.map(d => ({ month: d.month, value: d.devis_validation })),
      chartFormat: (v) => `${Math.round(v)}j`,
      chartColor: 'hsl(var(--ap-warning))',
      explanation: 'Délai moyen entre l\'envoi du devis et sa validation par le client. La couverture indique le % de devis pris en compte.',
    },
  };

  const conf = configs[type];
  const trendKey: Record<KpiDetailType, string> = {
    ca_genere: 'ca_genere',
    panier_moyen: 'panier_moyen',
    taux_transfo: 'taux_transformation',
    dossiers_en_cours: 'dossiers_en_cours',
    devis_envoyes: 'devis_envoyes',
    factures_en_attente: 'factures_en_attente',
    delai_rdv: 'avg_rdv_delay_days',
    delai_devis: 'avg_devis_validation_delay_days',
  };
  const trend = trends[trendKey[type]];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{conf.title}</DialogTitle>
          <div className="mt-1">
            <TrendBadge trend={trend} />
          </div>
        </DialogHeader>

        {/* Explanation */}
        {conf.explanation && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border">
            {conf.explanation}
          </p>
        )}

        {/* Detail rows */}
        <div className="space-y-0 border rounded-lg overflow-hidden">
          {conf.rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between px-4 py-2.5 text-sm',
                i !== conf.rows.length - 1 && 'border-b',
                row.highlight && 'bg-primary/5 font-semibold',
                row.muted && 'text-muted-foreground'
              )}
            >
              <span>{row.label}</span>
              <span className={cn('tabular-nums', row.highlight && 'text-primary')}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        {conf.chartData && conf.chartData.length > 1 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Évolution 12 mois
            </p>
            <MiniChart
              data={conf.chartData}
              formatFn={conf.chartFormat}
              color={conf.chartColor}
            />
          </div>
        )}

        {/* Action */}
        {conf.actionLabel && conf.onAction && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={conf.onAction}
          >
            {conf.actionLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
