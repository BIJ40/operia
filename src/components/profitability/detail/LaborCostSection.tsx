/**
 * LaborCostSection — Labor cost detail by technician.
 * v2: Better name resolution, shows default rate indicator (35€/h),
 * colorful estimated/real badges, clearer unknown tech handling.
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, AlertTriangle, Info } from 'lucide-react';
import { formatCurrency, formatHours } from '../constants';
import { DEFAULT_HOURLY_RATE } from '../hooks/useProjectApogeeData';
import { cn } from '@/lib/utils';
import type { ProfitabilityResult } from '@/types/projectProfitability';
import type { CollaboratorMinimal } from '@/repositories/profitabilityRepository';

interface LaborCostSectionProps {
  laborDetail: ProfitabilityResult['laborDetail'];
  totalCostLabor: number;
  collaboratorMap?: Map<string, CollaboratorMinimal>;
  onEditProfile?: (collaboratorId: string, collaboratorName: string) => void;
}

export function LaborCostSection({ laborDetail, totalCostLabor, collaboratorMap, onEditProfile }: LaborCostSectionProps) {
  if (laborDetail.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucune donnée de main d'œuvre disponible
      </p>
    );
  }

  const resolveTechnician = (techId: string) => {
    if (techId === '__unknown__') return { name: 'Non assigné', collaborator: null };
    const collab = collaboratorMap?.get(techId);
    if (collab) return { name: `${collab.last_name} ${collab.first_name}`, collaborator: collab };
    return { name: `Technicien #${techId}`, collaborator: null };
  };

  const hasEstimated = laborDetail.some(ld => ld.isEstimated);

  return (
    <div className="space-y-3">
      {hasEstimated && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-400">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Taux horaire estimé à {DEFAULT_HOURLY_RATE}€/h (charges comprises) pour les techniciens sans profil coût renseigné.
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Technicien</TableHead>
            <TableHead className="text-right">Heures</TableHead>
            <TableHead className="text-right">Taux horaire</TableHead>
            <TableHead className="text-right">Coût</TableHead>
            <TableHead>Source</TableHead>
            {onEditProfile && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {laborDetail.map((ld) => {
            const { name, collaborator } = resolveTechnician(ld.technicianId);
            const canEdit = !!collaborator && !!onEditProfile;
            const noMatch = ld.technicianId !== '__unknown__' && !collaborator;

            return (
              <TableRow key={ld.technicianId} className="hover:bg-muted/40 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {name}
                    {noMatch && (
                      <span title={`Collaborateur introuvable (ID Apogée: ${ld.technicianId}) — mapping manquant`}>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatHours(ld.hours)}</TableCell>
                <TableCell className={cn('text-right tabular-nums', ld.isEstimated ? 'text-amber-600 dark:text-amber-400' : '')}>
                  {formatCurrency(ld.hourlyRate)}/h
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(ld.cost)}</TableCell>
                <TableCell>
                  {ld.isEstimated ? (
                    <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 text-xs">
                      Estimé ({DEFAULT_HOURLY_RATE}€/h)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 text-xs">
                      Profil réel
                    </Badge>
                  )}
                </TableCell>
                {onEditProfile && (
                  <TableCell className="text-right">
                    {canEdit ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onEditProfile(collaborator!.id, name)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        {ld.isEstimated ? 'Compléter' : 'Modifier'}
                      </Button>
                    ) : noMatch ? (
                      <span className="text-xs text-muted-foreground">Mapping manquant</span>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex justify-end text-sm font-semibold">
        Total MO : {formatCurrency(totalCostLabor)}
      </div>
    </div>
  );
}
