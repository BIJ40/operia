import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { GitMerge, ArrowRight } from "lucide-react";
import type { ApogeeTicket, MergeTicketsPayload } from "../types";

interface MergeTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTicket: ApogeeTicket;
  candidateTicket: ApogeeTicket;
  onMerge: (payload: MergeTicketsPayload) => void;
  isMerging?: boolean;
}

export function MergeTicketsDialog({
  open,
  onOpenChange,
  sourceTicket,
  candidateTicket,
  onMerge,
  isMerging,
}: MergeTicketsDialogProps) {
  const [mainTicketId, setMainTicketId] = useState(sourceTicket.id);
  const [mergeComments, setMergeComments] = useState(true);
  const [mergeAttachments, setMergeAttachments] = useState(true);
  const [mergeTags, setMergeTags] = useState(true);

  const mainTicket = mainTicketId === sourceTicket.id ? sourceTicket : candidateTicket;
  const duplicateTicket = mainTicketId === sourceTicket.id ? candidateTicket : sourceTicket;

  const handleMerge = () => {
    onMerge({
      ticket_id_main: mainTicket.id,
      ticket_id_duplicate: duplicateTicket.id,
      merge_options: {
        merge_comments: mergeComments,
        merge_attachments: mergeAttachments,
        merge_tags: mergeTags,
      },
    });
  };

  const TicketPreview = ({ ticket, isMain }: { ticket: ApogeeTicket; isMain: boolean }) => (
    <div className={`p-4 rounded-lg border ${isMain ? "border-primary bg-primary/5" : "bg-muted/50"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-bold">
          APO-{String(ticket.ticket_number).padStart(3, "0")}
        </span>
        {isMain && <Badge className="bg-primary">Principal</Badge>}
        {!isMain && <Badge variant="outline">Doublon</Badge>}
      </div>
      <h4 className="font-medium mb-2 line-clamp-2">{ticket.element_concerne}</h4>
      {ticket.description && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
          {ticket.description}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {ticket.module && <Badge variant="secondary">{ticket.module}</Badge>}
        <Badge variant="outline">{ticket.kanban_status}</Badge>
        {ticket.impact_tags?.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Fusionner les tickets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Choisir le ticket principal (le doublon sera archivé)
            </Label>
            <RadioGroup
              value={mainTicketId}
              onValueChange={setMainTicketId}
              className="grid grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem
                  value={sourceTicket.id}
                  id="source"
                  className="absolute top-4 left-4"
                />
                <Label htmlFor="source" className="cursor-pointer block">
                  <TicketPreview
                    ticket={sourceTicket}
                    isMain={mainTicketId === sourceTicket.id}
                  />
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem
                  value={candidateTicket.id}
                  id="candidate"
                  className="absolute top-4 left-4"
                />
                <Label htmlFor="candidate" className="cursor-pointer block">
                  <TicketPreview
                    ticket={candidateTicket}
                    isMain={mainTicketId === candidateTicket.id}
                  />
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Merge direction indicator */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <span className="font-mono">
              APO-{String(duplicateTicket.ticket_number).padStart(3, "0")}
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className="font-mono font-bold text-primary">
              APO-{String(mainTicket.ticket_number).padStart(3, "0")}
            </span>
          </div>

          {/* Merge options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Options de fusion</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="merge-comments"
                  checked={mergeComments}
                  onCheckedChange={(checked) => setMergeComments(!!checked)}
                />
                <Label htmlFor="merge-comments" className="text-sm cursor-pointer">
                  Fusionner les commentaires
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="merge-attachments"
                  checked={mergeAttachments}
                  onCheckedChange={(checked) => setMergeAttachments(!!checked)}
                />
                <Label htmlFor="merge-attachments" className="text-sm cursor-pointer">
                  Fusionner les pièces jointes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="merge-tags"
                  checked={mergeTags}
                  onCheckedChange={(checked) => setMergeTags(!!checked)}
                />
                <Label htmlFor="merge-tags" className="text-sm cursor-pointer">
                  Fusionner les tags
                </Label>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Cette action est irréversible. Le ticket{" "}
              <strong>APO-{String(duplicateTicket.ticket_number).padStart(3, "0")}</strong>{" "}
              sera marqué comme doublon et archivé.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleMerge} disabled={isMerging}>
            {isMerging ? "Fusion en cours..." : "Confirmer la fusion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
