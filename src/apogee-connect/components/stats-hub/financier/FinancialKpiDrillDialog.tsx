/**
 * FinancialKpiDrillDialog — Popup when clicking a KPI tile
 * Shows filtered invoice list relevant to the clicked KPI
 */

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatEuros, formatDate } from '@/apogee-connect/utils/formatters';
import { cn } from '@/lib/utils';
import type { FinancialAnalysis, FinancialInvoice, InvoicePaymentStatus } from '@/apogee-connect/types/financial';
import type { KpiTileId } from './FinancialHeroCards';

const STATUS_STYLES: Record<InvoicePaymentStatus, { label: string; cls: string }> = {
  paid: { label: 'Payé', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  partial: { label: 'Partiel', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  pending: { label: 'En attente', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  overdue_30: { label: '> 30j', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  overdue_60: { label: '> 60j', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  overdue_90: { label: '> 90j', cls: 'bg-destructive/15 text-destructive' },
  critical: { label: 'Critique', cls: 'bg-destructive/15 text-destructive' },
};

interface Props {
  tileId: KpiTileId | null;
  analysis: FinancialAnalysis | null;
  open: boolean;
  onClose: () => void;
}

const TILE_CONFIG: Record<KpiTileId, { title: string; description: string }> = {
  duTotal: { title: 'Dû total TTC', description: 'Toutes les factures avec un solde restant dû' },
  duClients: { title: 'Dû clients directs', description: 'Factures non soldées des clients directs' },
  duApporteurs: { title: 'Dû apporteurs', description: 'Factures non soldées des apporteurs' },
  encaisse: { title: 'Montant encaissé', description: 'Factures réglées (total ou partiel)' },
  tauxRecouvrement: { title: 'Taux de recouvrement', description: 'Répartition payé / impayé' },
  facturesAvecSolde: { title: 'Factures avec solde', description: 'Factures ayant un reste dû > 0' },
  ageMoyen: { title: 'Âge moyen des encours', description: 'Factures non soldées triées par ancienneté' },
  retard30: { title: 'Retard > 30 jours', description: 'Factures en retard de plus de 30 jours' },
};

function filterInvoices(invoices: FinancialInvoice[], tileId: KpiTileId): FinancialInvoice[] {
  switch (tileId) {
    case 'duTotal':
      return invoices.filter(i => i.resteDu > 0.01 && !i.isAvoir);
    case 'duClients':
      return invoices.filter(i => i.resteDu > 0.01 && !i.isAvoir && i.entityType === 'client_direct');
    case 'duApporteurs':
      return invoices.filter(i => i.resteDu > 0.01 && !i.isAvoir && i.entityType === 'apporteur');
    case 'encaisse':
      return invoices.filter(i => i.montantRegle > 0).sort((a, b) => b.montantRegle - a.montantRegle);
    case 'tauxRecouvrement':
      return invoices.filter(i => !i.isAvoir);
    case 'facturesAvecSolde':
      return invoices.filter(i => i.resteDu > 0.01 && !i.isAvoir);
    case 'ageMoyen':
      return invoices.filter(i => i.resteDu > 0.01 && !i.isAvoir).sort((a, b) => b.agingDays - a.agingDays);
    case 'retard30':
      return invoices.filter(i => i.resteDu > 0.01 && i.agingDays > 30 && !i.isAvoir).sort((a, b) => b.agingDays - a.agingDays);
    default:
      return invoices;
  }
}

export function FinancialKpiDrillDialog({ tileId, analysis, open, onClose }: Props) {
  const config = tileId ? TILE_CONFIG[tileId] : null;

  const filteredInvoices = useMemo(() => {
    if (!tileId || !analysis) return [];
    return filterInvoices(analysis.allInvoices, tileId);
  }, [tileId, analysis]);

  const totalResteDu = useMemo(() => filteredInvoices.reduce((s, i) => s + Math.max(0, i.resteDu), 0), [filteredInvoices]);

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm mb-3">
          <span className="text-muted-foreground">{filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''}</span>
          {totalResteDu > 0 && (
            <span className="font-semibold text-destructive">Reste dû : {formatEuros(totalResteDu)}</span>
          )}
        </div>

        <div className="overflow-auto max-h-[60vh] rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="text-xs">Facture</TableHead>
                <TableHead className="text-xs">Tiers</TableHead>
                <TableHead className="text-xs">Dossier</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">TTC</TableHead>
                <TableHead className="text-xs text-right">Réglé</TableHead>
                <TableHead className="text-xs text-right">Reste</TableHead>
                <TableHead className="text-xs">Âge</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Aucune facture correspondante
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map(inv => {
                  const st = STATUS_STYLES[inv.paymentStatus] || STATUS_STYLES.pending;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs font-medium">{inv.numeroFacture}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]">{inv.entityLabel}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]">{inv.projectLabel}</TableCell>
                      <TableCell className="text-xs tabular-nums">{inv.dateEmission ? formatDate(inv.dateEmission) : '—'}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{formatEuros(inv.montantTTC)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{formatEuros(inv.montantRegle)}</TableCell>
                      <TableCell className={cn('text-xs text-right tabular-nums font-semibold',
                        inv.resteDu > 0.01 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                      )}>
                        {formatEuros(inv.resteDu)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">{inv.agingDays}j</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[9px] px-1 py-0', st.cls)}>
                          {st.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
