/**
 * BankTransactionsTable — Tableau premium des transactions bancaires
 */

import { useState } from 'react';
import { Search, Filter, ArrowDownRight, ArrowUpRight, ListFilter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BankTransaction } from '@/apogee-connect/types/treasury';
import { RECONCILIATION_LABELS, RECONCILIATION_COLORS } from '@/apogee-connect/types/treasury';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  transactions: BankTransaction[];
  count: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  reconciliationFilter: string;
  onReconciliationFilterChange: (v: string) => void;
  page: number;
  onPageChange: (p: number) => void;
  pageSize: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
}

export function BankTransactionsTable({
  transactions, count, isLoading,
  search, onSearchChange,
  typeFilter, onTypeFilterChange,
  reconciliationFilter, onReconciliationFilterChange,
  page, onPageChange, pageSize,
}: Props) {
  const totalPages = Math.ceil(count / pageSize);

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 shadow-sm overflow-hidden">
      {/* Header + filters */}
      <div className="p-4 border-b border-border/40 space-y-3">
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Transactions</h3>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un libellé..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Sens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="credit">Crédit</SelectItem>
              <SelectItem value="debit">Débit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={reconciliationFilter} onValueChange={onReconciliationFilterChange}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Rapprochement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="unmatched">Non rapproché</SelectItem>
              <SelectItem value="suggested">Suggestion</SelectItem>
              <SelectItem value="matched">Rapproché</SelectItem>
              <SelectItem value="manual_match">Manuel</SelectItem>
              <SelectItem value="ignored">Ignoré</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ListFilter className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Aucune transaction</p>
          <p className="text-xs mt-1">Les transactions apparaîtront après synchronisation bancaire</p>
        </div>
      ) : (
        <>
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[90px] text-xs">Date</TableHead>
                  <TableHead className="text-xs">Libellé</TableHead>
                  <TableHead className="text-right text-xs w-[120px]">Montant</TableHead>
                  <TableHead className="text-xs w-[100px]">Catégorie</TableHead>
                  <TableHead className="text-xs w-[120px]">Rapprochement</TableHead>
                  <TableHead className="text-xs w-[80px]">Pointage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id} className="group">
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {format(new Date(tx.booking_date), 'dd/MM/yy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate" title={tx.label}>
                      <div className="flex items-center gap-1.5">
                        {tx.transaction_type === 'credit' ? (
                          <ArrowDownRight className="h-3 w-3 text-emerald-500 shrink-0" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3 text-red-400 shrink-0" />
                        )}
                        <span className="truncate">{tx.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right text-sm font-semibold tabular-nums ${tx.transaction_type === 'credit' ? 'text-emerald-600' : 'text-foreground'}`}>
                      {tx.transaction_type === 'credit' ? '+' : ''}{fmt(Number(tx.amount))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate">
                      {tx.internal_category ?? tx.provider_category ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${RECONCILIATION_COLORS[tx.reconciliation_status]}`}>
                        {RECONCILIATION_LABELS[tx.reconciliation_status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tx.pointed_at ? format(new Date(tx.pointed_at), 'dd/MM', { locale: fr }) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} / {totalPages} · {count} résultats
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
                  Précédent
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
