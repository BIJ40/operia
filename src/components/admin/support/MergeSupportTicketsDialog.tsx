import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { GitMerge, Search, AlertTriangle, ArrowRight } from 'lucide-react';
import type { SupportTicket } from '@/hooks/use-admin-support';

interface MergeSupportTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTicket: SupportTicket;
  allTickets: SupportTicket[];
  onMerge: (mainTicketId: string, duplicateTicketId: string, options: MergeOptions) => Promise<void>;
  isMerging: boolean;
}

interface MergeOptions {
  mergeMessages: boolean;
  mergeAttachments: boolean;
}

export function MergeSupportTicketsDialog({
  open,
  onOpenChange,
  sourceTicket,
  allTickets,
  onMerge,
  isMerging,
}: MergeSupportTicketsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [mainTicketId, setMainTicketId] = useState<string>(sourceTicket.id);
  const [mergeOptions, setMergeOptions] = useState<MergeOptions>({
    mergeMessages: true,
    mergeAttachments: true,
  });

  // Filter tickets excluding the source ticket and already merged tickets
  const availableTickets = allTickets.filter(
    (t) =>
      t.id !== sourceTicket.id &&
      !t.merged_into_ticket_id &&
      (searchQuery === '' ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedTarget = availableTickets.find((t) => t.id === selectedTargetId);

  const handleMerge = async () => {
    if (!selectedTargetId) return;
    
    const duplicateId = mainTicketId === sourceTicket.id ? selectedTargetId : sourceTicket.id;
    await onMerge(mainTicketId, duplicateId, mergeOptions);
    
    // Reset state
    setSearchQuery('');
    setSelectedTargetId(null);
    setMainTicketId(sourceTicket.id);
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const TicketPreview = ({ ticket, isMain }: { ticket: SupportTicket; isMain: boolean }) => (
    <div
      className={`p-3 rounded-lg border-2 transition-all ${
        isMain ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm font-medium">
          #{ticket.id.substring(0, 8)}
        </span>
        {isMain && (
          <Badge variant="default" className="text-xs">
            Principal
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium line-clamp-1">{ticket.subject}</p>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span>{formatDate(ticket.created_at)}</span>
        <Badge variant="outline" className="text-xs">
          {ticket.status}
        </Badge>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-primary" />
            Fusionner les tickets
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un ticket à fusionner avec celui-ci, puis choisissez le ticket principal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source ticket info */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Ticket source</Label>
            <TicketPreview ticket={sourceTicket} isMain={mainTicketId === sourceTicket.id} />
          </div>

          {/* Search for target ticket */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Rechercher le ticket à fusionner
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par ID ou sujet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Available tickets list */}
          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
            {availableTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun ticket trouvé
              </p>
            ) : (
              availableTickets.slice(0, 10).map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTargetId(ticket.id)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedTargetId === ticket.id
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">#{ticket.id.substring(0, 8)}</span>
                    <Badge variant="outline" className="text-xs">
                      {ticket.status}
                    </Badge>
                  </div>
                  <p className="text-sm line-clamp-1 mt-1">{ticket.subject}</p>
                </div>
              ))
            )}
          </div>

          {/* Selected target preview and main ticket selection */}
          {selectedTarget && (
            <>
              <div>
                <Label className="text-sm font-medium mb-2 block">Ticket sélectionné</Label>
                <TicketPreview
                  ticket={selectedTarget}
                  isMain={mainTicketId === selectedTarget.id}
                />
              </div>

              {/* Direction indicator */}
              <div className="flex items-center justify-center gap-4 py-2">
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
              </div>

              {/* Choose main ticket */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Choisir le ticket principal (conservé)
                </Label>
                <RadioGroup
                  value={mainTicketId}
                  onValueChange={setMainTicketId}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={sourceTicket.id} id="source" />
                    <Label htmlFor="source" className="text-sm cursor-pointer">
                      #{sourceTicket.id.substring(0, 8)} - {sourceTicket.subject.substring(0, 40)}...
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={selectedTarget.id} id="target" />
                    <Label htmlFor="target" className="text-sm cursor-pointer">
                      #{selectedTarget.id.substring(0, 8)} - {selectedTarget.subject.substring(0, 40)}...
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Merge options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Options de fusion</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mergeMessages"
                    checked={mergeOptions.mergeMessages}
                    onCheckedChange={(checked) =>
                      setMergeOptions((prev) => ({ ...prev, mergeMessages: !!checked }))
                    }
                  />
                  <Label htmlFor="mergeMessages" className="text-sm cursor-pointer">
                    Fusionner les messages
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mergeAttachments"
                    checked={mergeOptions.mergeAttachments}
                    onCheckedChange={(checked) =>
                      setMergeOptions((prev) => ({ ...prev, mergeAttachments: !!checked }))
                    }
                  />
                  <Label htmlFor="mergeAttachments" className="text-sm cursor-pointer">
                    Fusionner les pièces jointes
                  </Label>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Cette action est irréversible. Le ticket doublon sera marqué comme fusionné
                  et ne sera plus visible dans le Kanban.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
            Annuler
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!selectedTargetId || isMerging}
            className="gap-2"
          >
            <GitMerge className="w-4 h-4" />
            {isMerging ? 'Fusion en cours...' : 'Fusionner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
