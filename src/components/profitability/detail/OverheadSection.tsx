/**
 * OverheadSection — Display + manage agency overhead rules.
 * Validation is status-only (no validated_by/validated_at on this table).
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { formatCurrency, OVERHEAD_COST_TYPE_LABELS } from '../constants';
import type { AgencyOverheadRule, CostValidation } from '@/types/projectProfitability';

interface OverheadSectionProps {
  rules: AgencyOverheadRule[];
  totalOverhead: number;
  hasNonProrated: boolean;
  onAdd?: () => void;
  onEdit?: (rule: AgencyOverheadRule) => void;
  onDelete?: (id: string) => void;
  onValidate?: (id: string, status: CostValidation) => void;
}

const ALLOCATION_MODE_LABELS: Record<string, string> = {
  per_project: 'Par dossier',
  percentage_ca: '% du CA',
  per_hour: 'Par heure',
  fixed: 'Fixe',
};

export function OverheadSection({
  rules, totalOverhead, hasNonProrated,
  onAdd, onEdit, onDelete, onValidate,
}: OverheadSectionProps) {
  return (
    <div className="space-y-3">
      {hasNonProrated && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-sm text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4 shrink-0" />
          <span>Charges estimées — non proratisées à la durée du dossier</span>
        </div>
      )}

      {onAdd && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter une règle
          </Button>
        </div>
      )}

      {rules.length === 0 ? (
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
              <TableHead>Statut</TableHead>
              {(onEdit || onDelete || onValidate) && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
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
                <TableCell>
                  {rule.validation_status === 'validated' ? (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">Validé</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Brouillon</Badge>
                  )}
                </TableCell>
                {(onEdit || onDelete || onValidate) && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onEdit && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(rule)} title="Modifier">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                      {onValidate && rule.validation_status === 'draft' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onValidate(rule.id, 'validated')} title="Valider">
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      )}
                      {onValidate && rule.validation_status === 'validated' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onValidate(rule.id, 'draft')} title="Repasser en brouillon">
                          <X className="h-3.5 w-3.5 text-amber-600" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(rule.id)} title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
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
