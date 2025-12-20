import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EpiAssignment, EPI_ASSIGNMENT_STATUSES } from "@/hooks/epi/useEpiAssignments";
import { EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";

interface EpiAssignmentsTableProps {
  assignments: EpiAssignment[];
  agencyId: string;
}

export function EpiAssignmentsTable({ assignments, agencyId }: EpiAssignmentsTableProps) {
  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune attribution
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Technicien</TableHead>
          <TableHead>EPI</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Taille</TableHead>
          <TableHead>Attribué le</TableHead>
          <TableHead>Renouvellement</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((ass) => {
          const status = EPI_ASSIGNMENT_STATUSES.find((s) => s.value === ass.status);
          const category = EPI_CATEGORIES.find((c) => c.value === ass.catalog_item?.category);

          const renewalDays = ass.expected_renewal_at
            ? differenceInDays(new Date(ass.expected_renewal_at), new Date())
            : null;
          const isOverdue = renewalDays !== null && renewalDays < 0;
          const isSoon = renewalDays !== null && renewalDays >= 0 && renewalDays <= 30;

          return (
            <TableRow key={ass.id}>
              <TableCell>
                {ass.collaborator
                  ? `${ass.collaborator.first_name} ${ass.collaborator.last_name}`
                  : "—"}
              </TableCell>
              <TableCell className="font-medium">
                {ass.catalog_item?.name}
              </TableCell>
              <TableCell>{category?.label}</TableCell>
              <TableCell>{ass.size || "—"}</TableCell>
              <TableCell>
                {format(new Date(ass.assigned_at), "dd/MM/yyyy", { locale: fr })}
              </TableCell>
              <TableCell>
                {ass.expected_renewal_at ? (
                  <div className="flex items-center gap-1">
                    {(isOverdue || isSoon) && (
                      <AlertTriangle
                        className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-orange-500"}`}
                      />
                    )}
                    <span className={isOverdue ? "text-red-600 font-medium" : isSoon ? "text-orange-600" : ""}>
                      {format(new Date(ass.expected_renewal_at), "dd/MM/yyyy", { locale: fr })}
                    </span>
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <Badge className={status?.color}>{status?.label}</Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
