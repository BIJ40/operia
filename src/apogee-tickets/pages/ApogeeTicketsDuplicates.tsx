import { useState } from "react";
import { Copy, Eye, GitMerge, X, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePendingDuplicates, useTicketDuplicates, DuplicateTicketInfo } from "../hooks/useTicketDuplicates";
import { MergeTicketsDialog } from "../components/MergeTicketsDialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { ApogeeTicket, MergeTicketsPayload } from "../types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { successToast } from "@/lib/toastHelpers";
import { useApogeeTicket } from "../hooks/useApogeeTickets";

export default function ApogeeTicketsDuplicates() {
  const { suggestions, isLoading, refetch, batchScan } = usePendingDuplicates();
  const { rejectSuggestion, isRejecting, mergeTickets, isMerging } = useTicketDuplicates();
  
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [mergeDialog, setMergeDialog] = useState<{
    open: boolean;
    sourceTicket?: DuplicateTicketInfo;
    candidateTicket?: DuplicateTicketInfo;
  }>({ open: false });

  // Fetch selected ticket for drawer
  const { ticket: selectedTicket } = useApogeeTicket(selectedTicketId || undefined);

  const handleBatchScan = async () => {
    setIsBatchScanning(true);
    try {
      const result = await batchScan();
      successToast(`Scan terminé : ${result.scanned} tickets analysés`);
    } finally {
      setIsBatchScanning(false);
    }
  };

  const handleMerge = (sourceTicket: DuplicateTicketInfo, candidateTicket: DuplicateTicketInfo) => {
    setMergeDialog({ open: true, sourceTicket, candidateTicket });
  };

  const handleConfirmMerge = (payload: MergeTicketsPayload) => {
    mergeTickets(payload, {
      onSuccess: () => {
        setMergeDialog({ open: false });
        refetch();
      },
    });
  };

  const getSimilarityColor = (similarity: number) => {
    const percent = similarity * 100;
    if (percent >= 95) return "bg-destructive text-destructive-foreground";
    if (percent >= 90) return "bg-orange-500 text-white";
    if (percent >= 85) return "bg-yellow-500 text-black";
    return "bg-muted text-muted-foreground";
  };

  // Convert DuplicateTicketInfo to ApogeeTicket-like for merge dialog
  const toApogeeTicket = (info?: DuplicateTicketInfo): ApogeeTicket | undefined => {
    if (!info) return undefined;
    return {
      ...info,
      source_sheet: null,
      source_row_index: null,
      external_key: null,
      priority: null,
      action_type: null,
      owner_side: null,
      h_min: null,
      h_max: null,
      hca_code: null,
      apogee_status_raw: null,
      hc_status_raw: null,
      module_area: null,
      severity: null,
      needs_completion: false,
      created_by_user_id: null,
      created_from: 'MANUAL' as const,
      updated_at: info.created_at,
      theme: null,
      ticket_type: null,
      qualif_status: null,
      notes_internes: null,
      is_qualified: false,
      qualified_at: null,
      qualified_by: null,
      heat_priority: null,
      original_title: null,
      original_description: null,
      reported_by: null,
      last_modified_by_user_id: null,
      last_modified_at: null,
      description: info.description || null,
      impact_tags: info.impact_tags || null,
    } as ApogeeTicket;
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/10 via-background to-background">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Revue des doublons potentiels
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              onClick={handleBatchScan}
              disabled={isBatchScanning}
            >
              {isBatchScanning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Scanner tous les tickets
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Copy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun doublon potentiel en attente de revue.</p>
              <p className="text-sm mt-2">
                Cliquez sur "Scanner tous les tickets" pour lancer une analyse.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Ticket source</TableHead>
                    <TableHead>Ticket candidat</TableHead>
                    <TableHead className="w-24 text-center">Similarité</TableHead>
                    <TableHead className="w-32">Détecté</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((suggestion) => (
                    <TableRow key={suggestion.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <span className="font-mono font-medium text-primary">
                            APO-{String(suggestion.source_ticket?.ticket_number || 0).padStart(3, "0")}
                          </span>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {suggestion.source_ticket?.element_concerne}
                          </p>
                          {suggestion.source_ticket?.module && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {suggestion.source_ticket.module}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-mono font-medium text-primary">
                            APO-{String(suggestion.candidate_ticket?.ticket_number || 0).padStart(3, "0")}
                          </span>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {suggestion.candidate_ticket?.element_concerne}
                          </p>
                          {suggestion.candidate_ticket?.module && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {suggestion.candidate_ticket.module}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getSimilarityColor(suggestion.similarity)}>
                          {Math.round(suggestion.similarity * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(suggestion.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedTicketId(suggestion.ticket_id_source)}
                            title="Voir source"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleMerge(
                                suggestion.source_ticket!,
                                suggestion.candidate_ticket!
                              )
                            }
                            title="Fusionner"
                            className="text-primary hover:text-primary"
                          >
                            <GitMerge className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => rejectSuggestion(suggestion.id)}
                            disabled={isRejecting}
                            title="Ignorer"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            {suggestions.length} suggestion{suggestions.length > 1 ? "s" : ""} en attente de revue
          </div>
        </CardContent>
      </Card>

      {/* Ticket detail drawer - simplified preview */}
      {selectedTicket && (
        <Sheet open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
          <SheetContent className="w-full sm:max-w-xl">
            <div className="space-y-4">
              <div>
                <span className="font-mono text-lg font-bold text-primary">
                  APO-{String(selectedTicket.ticket_number).padStart(3, "0")}
                </span>
                <h2 className="text-xl font-semibold mt-2">{selectedTicket.element_concerne}</h2>
              </div>
              {selectedTicket.description && (
                <p className="text-muted-foreground">{selectedTicket.description}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {selectedTicket.module && <Badge variant="outline">{selectedTicket.module}</Badge>}
                <Badge>{selectedTicket.kanban_status}</Badge>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Merge dialog */}
      {mergeDialog.sourceTicket && mergeDialog.candidateTicket && (
        <MergeTicketsDialog
          open={mergeDialog.open}
          onOpenChange={(open) => setMergeDialog({ ...mergeDialog, open })}
          sourceTicket={toApogeeTicket(mergeDialog.sourceTicket)!}
          candidateTicket={toApogeeTicket(mergeDialog.candidateTicket)!}
          onMerge={handleConfirmMerge}
          isMerging={isMerging}
        />
      )}
    </div>
  );
}
