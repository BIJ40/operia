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
  EpiMonthlyAck,
  EPI_ACK_STATUSES,
  useValidateAckN2,
} from "@/hooks/epi/useEpiAcknowledgements";
import { Check, Loader2, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EpiAcksTableProps {
  acks: EpiMonthlyAck[];
  agencyId: string;
  currentUserId: string;
}

export function EpiAcksTable({ acks, agencyId, currentUserId }: EpiAcksTableProps) {
  const validateAck = useValidateAckN2();

  if (acks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Aucune attestation pour ce mois</p>
      </div>
    );
  }

  const handleValidate = (ackId: string) => {
    validateAck.mutate({ ackId, signerId: currentUserId });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Technicien</TableHead>
          <TableHead>Mois</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Signé N1</TableHead>
          <TableHead>Validé N2</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {acks.map((ack) => {
          const status = EPI_ACK_STATUSES.find((s) => s.value === ack.status);
          const canValidate = ack.status === "signed_by_n1";

          return (
            <TableRow key={ack.id}>
              <TableCell className="font-medium">
                {ack.collaborator
                  ? `${ack.collaborator.first_name} ${ack.collaborator.last_name}`
                  : "—"}
              </TableCell>
              <TableCell>
                {format(new Date(ack.month), "MMMM yyyy", { locale: fr })}
              </TableCell>
              <TableCell>
                <Badge className={status?.color}>{status?.label}</Badge>
              </TableCell>
              <TableCell>
                {ack.signed_by_n1_at
                  ? format(new Date(ack.signed_by_n1_at), "dd/MM/yy HH:mm", { locale: fr })
                  : "—"}
              </TableCell>
              <TableCell>
                {ack.signed_by_n2_at
                  ? format(new Date(ack.signed_by_n2_at), "dd/MM/yy HH:mm", { locale: fr })
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                {canValidate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleValidate(ack.id)}
                    disabled={validateAck.isPending}
                  >
                    {validateAck.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Valider
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
