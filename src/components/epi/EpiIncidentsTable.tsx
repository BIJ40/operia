import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EpiIncident,
  EPI_INCIDENT_STATUSES,
  EPI_INCIDENT_TYPES,
  EPI_INCIDENT_SEVERITIES,
  useResolveEpiIncident,
} from "@/hooks/epi/useEpiIncidents";
import { Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EpiIncidentsTableProps {
  incidents: EpiIncident[];
  agencyId: string;
  currentUserId: string;
  compact?: boolean;
}

export function EpiIncidentsTable({
  incidents,
  agencyId,
  currentUserId,
  compact = false,
}: EpiIncidentsTableProps) {
  const resolveIncident = useResolveEpiIncident();

  if (incidents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun incident
      </div>
    );
  }

  const handleResolve = (incidentId: string) => {
    resolveIncident.mutate({
      incidentId,
      handlerId: currentUserId,
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>EPI</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Gravité</TableHead>
          <TableHead>Statut</TableHead>
          {!compact && <TableHead>Signalé par</TableHead>}
          {!compact && <TableHead>Date</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((inc) => {
          const status = EPI_INCIDENT_STATUSES.find((s) => s.value === inc.status);
          const type = EPI_INCIDENT_TYPES.find((t) => t.value === inc.incident_type);
          const severity = EPI_INCIDENT_SEVERITIES.find((s) => s.value === inc.severity);
          const isOpen = inc.status === "open";

          return (
            <TableRow key={inc.id}>
              <TableCell>
                <p className="font-medium">
                  {inc.catalog_item?.name || "EPI non identifié"}
                </p>
              </TableCell>
              <TableCell>
                <span>
                  {type?.icon} {type?.label}
                </span>
              </TableCell>
              <TableCell>
                <Badge className={severity?.color}>{severity?.label}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={status?.color}>{status?.label}</Badge>
              </TableCell>
              {!compact && (
                <TableCell>
                  {inc.reporter
                    ? `${inc.reporter.first_name} ${inc.reporter.last_name}`
                    : "—"}
                </TableCell>
              )}
              {!compact && (
                <TableCell>
                  {format(new Date(inc.created_at), "dd/MM/yy", { locale: fr })}
                </TableCell>
              )}
              <TableCell className="text-right">
                {isOpen && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolve(inc.id)}
                    disabled={resolveIncident.isPending}
                  >
                    {resolveIncident.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Résoudre
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
