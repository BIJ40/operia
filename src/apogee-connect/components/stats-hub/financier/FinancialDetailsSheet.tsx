/**
 * FinancialDetailsDialog — Center modal drill-down for entity detail
 * V2: Dialog instead of Sheet, prev/next navigation arrows, sorting
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { formatEuros, formatDate } from '@/apogee-connect/utils/formatters';
import { cn } from '@/lib/utils';
import type { FinancialEntityStats, FinancialInvoice, InvoicePaymentStatus } from '@/apogee-connect/types/financial';
import { FileText, CalendarDays, Banknote, TrendingDown, Clock, Package, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

const STATUS_STYLES: Record<InvoicePaymentStatus, { label: string; cls: string }> = {
  paid: { label: 'Payé', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  partial: { label: 'Partiel', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  pending: { label: 'En attente', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  overdue_30: { label: '> 30j', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  overdue_60: { label: '> 60j', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  overdue_90: { label: '> 90j', cls: 'bg-destructive/15 text-destructive' },
  critical: { label: 'Critique', cls: 'bg-destructive/15 text-destructive' },
};

type InvoiceSortField = 'agingDays' | 'montantTTC' | 'resteDu' | 'dateEmission';

interface FinancialDetailsSheetProps {
  entity: FinancialEntityStats | null;
  open: boolean;
  onClose: () => void;
  /** All entities in current list for prev/next navigation */
  allEntities?: FinancialEntityStats[];
  onNavigate?: (entity: FinancialEntityStats) => void;
}

function SummaryCard({ icon, label, value, cls }: { icon: React.ReactNode; label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/40">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-bold tabular-nums', cls)}>{value}</p>
      </div>
    </div>
  );
}

export function FinancialDetailsSheet({ entity, open, onClose, allEntities, onNavigate }: FinancialDetailsSheetProps) {
  const [invoiceSort, setInvoiceSort] = useState<{ field: InvoiceSortField; dir: 'asc' | 'desc' }>({ field: 'agingDays', dir: 'desc' });

  // Navigation
  const currentIndex = useMemo(() => {
    if (!entity || !allEntities) return -1;
    return allEntities.findIndex(e => e.entityId === entity.entityId && e.entityType === entity.entityType);
  }, [entity, allEntities]);

  const canGoPrev = currentIndex > 0;
  const canGoNext = allEntities ? currentIndex < allEntities.length - 1 : false;

  const invoices = useMemo(() => {
    if (!entity) return [];
    return [...entity.invoices].sort((a, b) => {
      const aVal = invoiceSort.field === 'dateEmission'
        ? (a.dateEmission?.getTime() ?? 0)
        : a[invoiceSort.field];
      const bVal = invoiceSort.field === 'dateEmission'
        ? (b.dateEmission?.getTime() ?? 0)
        : b[invoiceSort.field];
      return invoiceSort.dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [entity, invoiceSort]);

  const toggleInvoiceSort = (field: InvoiceSortField) => {
    setInvoiceSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const InvSortHeader = ({ field, children }: { field: InvoiceSortField; children: React.ReactNode }) => (
    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleInvoiceSort(field)}>
      {children}
      <ArrowUpDown className={cn('h-2.5 w-2.5', invoiceSort.field === field ? 'text-foreground' : 'text-muted-foreground/40')} />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            {/* Prev/Next navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canGoPrev}
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {allEntities && currentIndex >= 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {currentIndex + 1}/{allEntities.length}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canGoNext}
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="truncate">{entity.entityLabel}</span>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {entity.entityType === 'apporteur' ? 'Apporteur' : 'Client'}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Détail financier de {entity.entityLabel}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          <SummaryCard icon={<Package className="h-4 w-4" />} label="Dossiers" value={String(entity.nbDossiers)} />
          <SummaryCard icon={<FileText className="h-4 w-4" />} label="Factures" value={String(entity.nbFactures)} />
          <SummaryCard icon={<Banknote className="h-4 w-4" />} label="Facturé TTC" value={formatEuros(entity.totalFactureTTC)} />
          <SummaryCard icon={<Banknote className="h-4 w-4" />} label="Encaissé" value={formatEuros(entity.totalEncaisse)} cls="text-emerald-600 dark:text-emerald-400" />
          <SummaryCard
            icon={<TrendingDown className="h-4 w-4" />}
            label="Reste dû"
            value={formatEuros(entity.resteDu)}
            cls={entity.resteDu > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}
          />
          <SummaryCard
            icon={<Clock className="h-4 w-4" />}
            label="Âge moyen encours"
            value={entity.ageMoyenEncours !== null ? `${entity.ageMoyenEncours} j` : 'N/A'}
          />
        </div>

        {/* Aging mini */}
        <Card className="p-3 mb-4">
          <p className="text-xs font-semibold mb-2">Aging de la dette</p>
          <div className="flex gap-2">
            {(['0_30', '31_60', '61_90', '90_plus'] as const).map(bucket => {
              const val = entity.aging[bucket];
              const colors = ['bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-destructive'];
              const labels = ['0–30 j', '31–60 j', '61–90 j', '90+ j'];
              const idx = ['0_30', '31_60', '61_90', '90_plus'].indexOf(bucket);
              return (
                <div key={bucket} className="flex-1 text-center">
                  <div className={cn('h-2 rounded-full mb-1', val > 0 ? colors[idx] : 'bg-muted')} />
                  <p className="text-[10px] text-muted-foreground">{labels[idx]}</p>
                  <p className="text-xs font-semibold tabular-nums">{formatEuros(val)}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Separator className="mb-4" />

        {/* Invoice List */}
        <p className="text-sm font-semibold mb-2">Détail des factures ({invoices.length})</p>
        <div className="overflow-auto max-h-[350px] rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="text-xs">Facture</TableHead>
                <TableHead className="text-xs">Dossier</TableHead>
                <TableHead className="text-xs"><InvSortHeader field="dateEmission">Date</InvSortHeader></TableHead>
                <TableHead className="text-xs text-right"><InvSortHeader field="montantTTC">TTC</InvSortHeader></TableHead>
                <TableHead className="text-xs text-right">Réglé</TableHead>
                <TableHead className="text-xs text-right"><InvSortHeader field="resteDu">Reste</InvSortHeader></TableHead>
                <TableHead className="text-xs"><InvSortHeader field="agingDays">Âge</InvSortHeader></TableHead>
                <TableHead className="text-xs">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucune facture</TableCell>
                </TableRow>
              ) : (
                invoices.map(inv => {
                  const st = STATUS_STYLES[inv.paymentStatus] || STATUS_STYLES.pending;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs font-medium">{inv.numeroFacture}</TableCell>
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
