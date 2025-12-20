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
  EpiRequest,
  EPI_REQUEST_STATUSES,
  EPI_REQUEST_PRIORITIES,
  useApproveEpiRequest,
  useRejectEpiRequest,
} from "@/hooks/epi/useEpiRequests";
import { Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EpiRequestsTableProps {
  requests: EpiRequest[];
  agencyId: string;
  currentUserId: string;
  compact?: boolean;
}

export function EpiRequestsTable({
  requests,
  agencyId,
  currentUserId,
  compact = false,
}: EpiRequestsTableProps) {
  const approveRequest = useApproveEpiRequest();
  const rejectRequest = useRejectEpiRequest();

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune demande
      </div>
    );
  }

  const handleApprove = (requestId: string) => {
    approveRequest.mutate({ requestId, reviewerId: currentUserId });
  };

  const handleReject = (requestId: string) => {
    rejectRequest.mutate({ requestId, reviewerId: currentUserId });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>EPI</TableHead>
          {!compact && <TableHead>Demandeur</TableHead>}
          <TableHead>Priorité</TableHead>
          <TableHead>Statut</TableHead>
          {!compact && <TableHead>Date</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => {
          const status = EPI_REQUEST_STATUSES.find((s) => s.value === req.status);
          const priority = EPI_REQUEST_PRIORITIES.find((p) => p.value === req.priority);
          const isPending = req.status === "pending";

          return (
            <TableRow key={req.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{req.catalog_item?.name}</p>
                  {req.size && (
                    <p className="text-xs text-muted-foreground">Taille {req.size}</p>
                  )}
                </div>
              </TableCell>
              {!compact && (
                <TableCell>
                  {req.requester
                    ? `${req.requester.first_name} ${req.requester.last_name}`
                    : "—"}
                </TableCell>
              )}
              <TableCell>
                <Badge className={priority?.color}>{priority?.label}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={status?.color}>{status?.label}</Badge>
              </TableCell>
              {!compact && (
                <TableCell>
                  {format(new Date(req.created_at), "dd/MM/yy", { locale: fr })}
                </TableCell>
              )}
              <TableCell className="text-right">
                {isPending && (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApprove(req.id)}
                      disabled={approveRequest.isPending}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      {approveRequest.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReject(req.id)}
                      disabled={rejectRequest.isPending}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {rejectRequest.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
