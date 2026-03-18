/**
 * ProjectCostsSection — Display and manage project costs with validation.
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Trash2, Plus, Pencil } from 'lucide-react';
import { formatCurrency, PROJECT_COST_TYPE_LABELS } from '../constants';
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
      {/* Summary: validated vs entered */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-muted-foreground text-xs">Coûts saisis</p>
          <p className="font-semibold">{formatCurrency(totalAll)}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
          <p className="text-muted-foreground text-xs">Coûts validés</p>
          <p className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(totalValidated)}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10">
          <p className="text-muted-foreground text-xs">Écart</p>
          <p className="font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(ecart)}</p>
        </div>
      </div>

      {/* Add button */}
      {onAdd && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter un coût
          </Button>
        </div>
      )}

      {/* Costs table */}
      {costs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Aucun coût enregistré pour ce dossier
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
                <TableRow key={cost.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {PROJECT_COST_TYPE_LABELS[cost.cost_type] ?? cost.cost_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cost.description || '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(cost.amount_ht)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${source.className}`}>
                      {source.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cost.validation_status === 'validated' ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
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
                          <Check className="h-3.5 w-3.5 text-green-600" />
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
