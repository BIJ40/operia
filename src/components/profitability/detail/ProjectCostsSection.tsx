/**
 * ProjectCostsSection — Display and manage project costs with inline editing.
 * v2: Double-click inline editing for amounts, colorful summary cards.
 */
import { useState, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, X, Trash2, Plus, Pencil } from 'lucide-react';
import { formatCurrency, PROJECT_COST_TYPE_LABELS } from '../constants';
import { cn } from '@/lib/utils';
import type { ProjectCost } from '@/types/projectProfitability';

interface ProjectCostsSectionProps {
  costs: ProjectCost[];
  costPurchasesAll: number;
  costSubcontractingAll: number;
  costOtherAll: number;
  costPurchasesValidated: number;
  costSubcontractingValidated: number;
  costOtherValidated: number;
  onValidate?: (id: string, status: 'draft' | 'validated') => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  onEdit?: (cost: ProjectCost) => void;
}

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  manual: { label: 'Manuel', className: 'bg-muted text-muted-foreground' },
  invoice_upload: { label: 'Facture', className: 'bg-blue-50 text-blue-700 border-blue-200' },
};

/** Inline editable cell for amounts — activated on double-click */
function EditableAmountCell({
  value,
  onSave,
}: {
  value: number;
  onSave: (newValue: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = () => {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const handleSave = () => {
    const num = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(num) && num >= 0) {
      onSave(num);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') setEditing(false);
    else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-7 w-24 text-right text-sm tabular-nums"
        autoFocus
      />
    );
  }

  return (
    <span
      className="cursor-pointer tabular-nums hover:text-primary hover:underline underline-offset-2 transition-colors"
      onDoubleClick={handleDoubleClick}
      title="Double-cliquez pour modifier"
    >
      {formatCurrency(value)}
    </span>
  );
}

export function ProjectCostsSection({
  costs,
  costPurchasesAll,
  costSubcontractingAll,
  costOtherAll,
  costPurchasesValidated,
  costSubcontractingValidated,
  costOtherValidated,
  onValidate,
  onDelete,
  onAdd,
  onEdit,
}: ProjectCostsSectionProps) {
  const totalAll = costPurchasesAll + costSubcontractingAll + costOtherAll;
  const totalValidated = costPurchasesValidated + costSubcontractingValidated + costOtherValidated;
  const ecart = totalAll - totalValidated;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-muted-foreground text-xs">Coûts saisis</p>
          <p className="font-semibold text-lg tabular-nums">{formatCurrency(totalAll)}</p>
        </div>
        <div className={cn('p-3 rounded-lg border', totalValidated > 0 ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-muted/50 border-border')}>
          <p className="text-muted-foreground text-xs">Coûts validés</p>
          <p className={cn('font-semibold text-lg tabular-nums', totalValidated > 0 ? 'text-emerald-700 dark:text-emerald-400' : '')}>{formatCurrency(totalValidated)}</p>
        </div>
        <div className={cn('p-3 rounded-lg border', ecart > 0 ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-muted/50 border-border')}>
          <p className="text-muted-foreground text-xs">Écart</p>
          <p className={cn('font-semibold text-lg tabular-nums', ecart > 0 ? 'text-amber-700 dark:text-amber-400' : '')}>{formatCurrency(ecart)}</p>
        </div>
      </div>

      {/* Quick add hint */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground italic">
          💡 Double-cliquez sur un montant pour le modifier rapidement
        </p>
        {onAdd && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter un coût
          </Button>
        )}
      </div>

      {/* Costs table */}
      {costs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Aucun coût enregistré — cliquez "Ajouter" pour saisir les fournitures
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant HT</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.map((cost) => {
              const source = SOURCE_LABELS[cost.source] ?? SOURCE_LABELS.manual;
              return (
                <TableRow key={cost.id} className="hover:bg-orange-50/40 dark:hover:bg-orange-950/10 transition-colors">
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {PROJECT_COST_TYPE_LABELS[cost.cost_type] ?? cost.cost_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cost.description || '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {onEdit ? (
                      <EditableAmountCell
                        value={cost.amount_ht}
                        onSave={(newValue) => {
                          if (newValue !== cost.amount_ht) {
                            onEdit({ ...cost, amount_ht: newValue });
                          }
                        }}
                      />
                    ) : (
                      formatCurrency(cost.amount_ht)
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${source.className}`}>
                      {source.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cost.validation_status === 'validated' ? (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                        Validé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                        Brouillon
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onEdit && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(cost)} title="Modifier">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                      {onValidate && cost.validation_status === 'draft' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onValidate(cost.id, 'validated')} title="Valider">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                      )}
                      {onValidate && cost.validation_status === 'validated' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onValidate(cost.id, 'draft')} title="Repasser en brouillon">
                          <X className="h-3.5 w-3.5 text-amber-600" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(cost.id)} title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
