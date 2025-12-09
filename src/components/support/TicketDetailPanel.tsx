/**
 * Panel de détail d'un ticket support
 */
import { useState, useRef } from 'react';
import { useUserTickets, Ticket } from '@/hooks/use-user-tickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TicketSourceBadge } from '@/components/tickets/TicketSourceBadge';
import { TicketCategoryBadge } from '@/components/tickets/TicketCategoryBadge';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';
import { HeatPriorityBadge } from '@/components/support/HeatPriorityBadge';
import { ArrowLeft, Send, Download, X, Paperclip, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CLOSE_REASONS = [
  { value: 'resolved_self', label: 'Résolu par moi-même' },
  { value: 'resolved_support', label: 'Résolu par le support' },
  { value: 'resolved_other', label: 'Résolu autrement' },
  { value: 'timeout', label: 'Délai dépassé / Plus d\'actualité' },
];

interface TicketDetailPanelProps {
  ticket: Ticket;
  onBack: () => void;
}

export function TicketDetailPanel({ ticket, onBack }: TicketDetailPanelProps) {
  const {
    attachments,
    messages,
    addMessage,
    downloadAttachment,
    closeTicket,
    uploadAttachment,
  } = useUserTickets();

  const [newMessage, setNewMessage] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await addMessage(ticket.id, newMessage);
    setNewMessage('');
  };

  const handleCloseTicket = async () => {
    if (!closeReason) return;
    setIsClosing(true);
    const reasonLabel = CLOSE_REASONS.find(r => r.value === closeReason)?.label || closeReason;
    await closeTicket(ticket.id, reasonLabel);
    setIsClosing(false);
    setShowCloseDialog(false);
    setCloseReason('');
    onBack();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    for (const file of Array.from(e.target.files)) {
      await uploadAttachment(ticket.id, file);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const normalizeStatus = (status: string) => status === 'waiting' ? 'waiting_user' : status;

  const getStatusBadge = (status: string) => {
    const normalized = normalizeStatus(status);
    const config: Record<string, { label: string; className: string }> = {
      new: { label: 'Nouveau', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      in_progress: { label: 'En cours', className: 'bg-orange-100 text-orange-800 border-orange-300' },
      waiting_user: { label: 'Attente réponse', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      resolved: { label: 'Résolu', className: 'bg-green-100 text-green-800 border-green-300' },
      closed: { label: 'Fermé', className: 'bg-gray-100 text-gray-800 border-gray-300' },
    };
    const { label, className } = config[normalized] || config.new;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  const isClosed = ['resolved', 'closed'].includes(ticket.status);

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à la liste
      </Button>

      <Card className="border-l-4 border-l-primary">
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-lg">{ticket.subject}</CardTitle>
              <div className="flex flex-wrap items-center gap-1">
                <ServiceBadge service={ticket.service} />
                <TicketSourceBadge source={ticket.source} />
                <TicketCategoryBadge category={ticket.category} />
                {getStatusBadge(ticket.status)}
                <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-xs text-muted-foreground">
                {format(new Date(ticket.created_at), 'PPp', { locale: fr })}
              </div>
              {!isClosed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCloseDialog(true)}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Fermer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">Pièces jointes</h3>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <Button
                    key={att.id}
                    size="sm"
                    variant="outline"
                    onClick={() => downloadAttachment(att)}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {att.file_name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Messages */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">Conversation</h3>
            <ScrollArea className="h-64 border rounded p-3">
              <div className="space-y-3">
                {messages.map((msg) => {
                  if (msg.is_system_message) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                          ℹ️ {msg.message}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={msg.id}
                      className={`p-2 rounded text-sm ${
                        msg.is_from_support ? 'bg-blue-50 ml-6' : 'bg-muted mr-6'
                      }`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {msg.is_from_support ? 'Support' : 'Vous'} •{' '}
                        {format(new Date(msg.created_at), 'Pp', { locale: fr })}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* New message */}
          {!isClosed && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Votre message..."
                  className="flex-1"
                  rows={2}
                />
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fermer le ticket</DialogTitle>
            <DialogDescription>
              Choisissez une raison pour fermer ce ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Raison de la fermeture</Label>
            <Select value={closeReason} onValueChange={setCloseReason}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Sélectionner une raison..." />
              </SelectTrigger>
              <SelectContent>
                {CLOSE_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCloseTicket}
              disabled={!closeReason || isClosing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isClosing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fermeture...
                </>
              ) : (
                'Confirmer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
