/**
 * LaborCostSection — Labor cost detail by technician.
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatHours } from '../constants';
import type { ProfitabilityResult } from '@/types/projectProfitability';

interface LaborCostSectionProps {
  laborDetail: ProfitabilityResult['laborDetail'];
  totalCostLabor: number;
}

export function LaborCostSection({ laborDetail, totalCostLabor }: LaborCostSectionProps) {
  if (laborDetail.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucune donnée de main d'œuvre disponible
      </p>
    );
  }

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {laborDetail.map((ld) => (
            <TableRow key={ld.technicianId}>
              <TableCell className="font-medium">
                {ld.technicianId === '__unknown__' ? 'Non assigné' : `Tech. ${ld.technicianId}`}
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end text-sm font-medium">
        Total MO : {formatCurrency(totalCostLabor)}
      </div>
    </div>
  );
}
