import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTicketDuplicates, DuplicateTicketInfo } from "../hooks/useTicketDuplicates";
import { DuplicateCard } from "./DuplicateCard";
import { MergeTicketsDialog } from "./MergeTicketsDialog";
import type { ApogeeTicket, MergeTicketsPayload } from "../types";

interface TicketDuplicatesSectionProps {
  ticket: ApogeeTicket;
  onViewTicket: (ticketId: string) => void;
}

export function TicketDuplicatesSection({
  ticket,
  onViewTicket,
}: TicketDuplicatesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mergeDialog, setMergeDialog] = useState<{
    open: boolean;
    candidateTicket?: DuplicateTicketInfo;
  }>({ open: false });

  const {
    suggestions,
    isLoading,
    isScanning,
    scanForDuplicates,
    rejectSuggestion,
    isRejecting,
    mergeTickets,
    isMerging,
  } = useTicketDuplicates(ticket.id);

  // Auto-scan when section is opened for the first time
  useEffect(() => {
    if (isOpen && suggestions.length === 0 && !isLoading && !isScanning) {
      scanForDuplicates(ticket.id);
    }
  }, [isOpen]);

  // Filter to get only pending suggestions with candidate tickets
  const pendingSuggestions = suggestions.filter(
    (s) => s.status === "pending" && s.candidate_ticket
  );

  // Get the candidate ticket (the one that is NOT the current ticket)
  const getCandidateTicket = (suggestion: typeof suggestions[0]): DuplicateTicketInfo | undefined => {
    if (suggestion.ticket_id_source === ticket.id) {
      return suggestion.candidate_ticket;
    }
    return suggestion.source_ticket;
  };

  const handleMerge = (candidateTicket: DuplicateTicketInfo) => {
    setMergeDialog({ open: true, candidateTicket });
  };

  const handleConfirmMerge = (payload: MergeTicketsPayload) => {
    mergeTickets(payload, {
      onSuccess: () => {
        setMergeDialog({ open: false });
      },
    });
  };

  // Convert DuplicateTicketInfo to ApogeeTicket-like for merge dialog
  const candidateAsTicket = mergeDialog.candidateTicket ? {
    ...mergeDialog.candidateTicket,
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
    updated_at: mergeDialog.candidateTicket.created_at,
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
    description: mergeDialog.candidateTicket.description || null,
    impact_tags: mergeDialog.candidateTicket.impact_tags || null,
  } as ApogeeTicket : undefined;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-3 py-2 h-auto"
          >
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Doublons potentiels (IA)</span>
            </div>
            {pendingSuggestions.length > 0 && (
              <Badge variant="secondary">{pendingSuggestions.length}</Badge>
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-3 pt-2">
            {/* Actions */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => scanForDuplicates(ticket.id)}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Rescanner
              </Button>
            </div>

            {/* Loading state */}
            {(isLoading || isScanning) && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {isScanning ? "Analyse en cours..." : "Chargement..."}
                </span>
              </div>
            )}

            {/* No duplicates */}
            {!isLoading && !isScanning && pendingSuggestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun doublon potentiel détecté pour ce ticket.
              </p>
            )}

            {/* Duplicate cards */}
            {!isLoading &&
              !isScanning &&
              pendingSuggestions.map((suggestion) => {
                const candidateTicket = getCandidateTicket(suggestion);
                if (!candidateTicket) return null;

                return (
                  <DuplicateCard
                    key={suggestion.id}
                    ticket={candidateTicket}
                    similarity={suggestion.similarity}
                    onView={() => onViewTicket(candidateTicket.id)}
                    onMerge={() => handleMerge(candidateTicket)}
                    onReject={() => rejectSuggestion(suggestion.id)}
                    isRejecting={isRejecting}
                  />
                );
              })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Merge dialog */}
      {candidateAsTicket && (
        <MergeTicketsDialog
          open={mergeDialog.open}
          onOpenChange={(open) => setMergeDialog({ ...mergeDialog, open })}
          sourceTicket={ticket}
          candidateTicket={candidateAsTicket}
          onMerge={handleConfirmMerge}
          isMerging={isMerging}
        />
      )}
    </>
  );
}
