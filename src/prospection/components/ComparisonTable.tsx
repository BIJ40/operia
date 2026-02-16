/**
 * ComparisonTable - Tableau comparatif multi-apporteurs
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import type { AggregatedKPIs } from '../engine/aggregators';

interface ComparisonItem {
  apporteur_id: string;
  label: string;
  kpis: AggregatedKPIs;
}

interface Props {
  items: ComparisonItem[];
}

interface KPIColumn {
  key: string;
  label: string;
  getValue: (k: AggregatedKPIs) => number | null;
  format: (v: number | null) => string;
  higherIsBetter: boolean;
}

const COLUMNS: KPIColumn[] = [
  { key: 'dossiers', label: 'Dossiers', getValue: k => k.dossiers_received, format: v => v != null ? String(v) : '—', higherIsBetter: true },
  { key: 'ca', label: 'CA HT', getValue: k => k.ca_ht, format: v => v != null ? `${new Intl.NumberFormat('fr-FR').format(Math.round(v))}€` : '—', higherIsBetter: true },
  { key: 'devis', label: 'Devis', getValue: k => k.devis_total, format: v => v != null ? String(v) : '—', higherIsBetter: true },
  { key: 'transfo', label: 'Taux transfo', getValue: k => k.taux_transfo_devis, format: v => v != null ? `${v.toFixed(1)}%` : '—', higherIsBetter: true },
  { key: 'panier', label: 'Panier moyen', getValue: k => k.panier_moyen, format: v => v != null ? `${Math.round(v)}€` : '—', higherIsBetter: true },
  { key: 'factures', label: 'Factures', getValue: k => k.factures, format: v => v != null ? String(v) : '—', higherIsBetter: true },
];

export function ComparisonTable({ items }: Props) {
  if (items.length === 0) return null;

  // Find leader for each column
  const leaders = COLUMNS.map(col => {
    let bestIdx = -1;
    let bestVal = -Infinity;
    items.forEach((item, i) => {
      const val = col.getValue(item.kpis);
      if (val != null && val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    });
    return bestIdx;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Comparatif KPIs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Apporteur</TableHead>
                {COLUMNS.map(col => (
                  <TableHead key={col.key} className="text-right">{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, rowIdx) => (
                <TableRow key={item.apporteur_id}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  {COLUMNS.map((col, colIdx) => {
                    const val = col.getValue(item.kpis);
                    const isLeader = leaders[colIdx] === rowIdx;
                    return (
                      <TableCell key={col.key} className="text-right">
                        <span className={isLeader ? 'font-bold text-green-600' : ''}>
                          {col.format(val)}
                        </span>
                        {isLeader && <Trophy className="w-3 h-3 inline ml-1 text-amber-500" />}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
