/**
 * LaborCostSection — Labor cost detail by technician.
 * Allows editing cost profiles when technician is resolved to a collaborator.
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatHours } from '../constants';
import type { ProfitabilityResult } from '@/types/projectProfitability';
import type { CollaboratorMinimal } from '@/repositories/profitabilityRepository';

interface LaborCostSectionProps {
  laborDetail: ProfitabilityResult['laborDetail'];
  totalCostLabor: number;
  /** Map of apogee_user_id (string) → collaborator info */
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
    return { name: `Tech. ${techId}`, collaborator: null };
  };

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Technicien</TableHead>
            <TableHead className="text-right">Heures</TableHead>
            <TableHead className="text-right">Taux horaire</TableHead>
            <TableHead className="text-right">Coût</TableHead>
            <TableHead>Statut</TableHead>
            {onEditProfile && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {laborDetail.map((ld) => {
            const { name, collaborator } = resolveTechnician(ld.technicianId);
            const canEdit = !!collaborator && !!onEditProfile;
            const noMatch = ld.technicianId !== '__unknown__' && !collaborator;

            return (
              <TableRow key={ld.technicianId}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {name}
                    {noMatch && (
                      <span title="Collaborateur introuvable — mapping apogee_user_id manquant">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatHours(ld.hours)}</TableCell>
                <TableCell className="text-right">{formatCurrency(ld.hourlyRate)}/h</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(ld.cost)}</TableCell>
                <TableCell>
                  {ld.isEstimated ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                      Estimé
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                      Réel
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
                      <span className="text-xs text-muted-foreground">Introuvable</span>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex justify-end text-sm font-medium">
        Total MO : {formatCurrency(totalCostLabor)}
      </div>
    </div>
  );
}
