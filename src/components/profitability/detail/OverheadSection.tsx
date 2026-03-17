/**
 * OverheadSection — Display agency overhead rules applied to the project.
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { formatCurrency, OVERHEAD_COST_TYPE_LABELS } from '../constants';
import type { AgencyOverheadRule } from '@/types/projectProfitability';

interface OverheadSectionProps {
  rules: AgencyOverheadRule[];
  totalOverhead: number;
  hasNonProrated: boolean;
}

const ALLOCATION_MODE_LABELS: Record<string, string> = {
  per_project: 'Par dossier',
  percentage_ca: '% du CA',
  per_hour: 'Par heure',
  fixed: 'Fixe',
};

export function OverheadSection({ rules, totalOverhead, hasNonProrated }: OverheadSectionProps) {
  const validated = rules.filter(r => r.validation_status === 'validated');

  return (
    <div className="space-y-3">
      {hasNonProrated && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-sm text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4 shrink-0" />
          <span>Charges estimées — non proratisées à la durée du dossier</span>
        </div>
      )}

      {validated.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Aucune charge agence configurée
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Montant HT</TableHead>
              <TableHead className="text-right">Valeur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validated.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  {OVERHEAD_COST_TYPE_LABELS[rule.cost_type] ?? rule.cost_type}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {ALLOCATION_MODE_LABELS[rule.allocation_mode] ?? rule.allocation_mode}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(rule.amount_ht)}</TableCell>
                <TableCell className="text-right">
                  {rule.allocation_mode === 'percentage_ca'
                    ? `${rule.allocation_value}%`
                    : rule.allocation_mode === 'per_hour'
                    ? `${formatCurrency(rule.allocation_value)}/h`
                    : formatCurrency(rule.allocation_value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex justify-end text-sm font-medium">
        Total charges : {formatCurrency(totalOverhead)}
      </div>
    </div>
  );
}
