import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTickets } from '@/hooks/use-user-tickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TicketSourceBadge } from '@/components/tickets/TicketSourceBadge';
import { TicketCategoryBadge } from '@/components/tickets/TicketCategoryBadge';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';
import { Plus, Send, Download, ArrowLeft, Home, X, Paperclip, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';

const CLOSE_REASONS = [
  { value: 'resolved_self', label: 'Résolu par moi-même' },
  { value: 'resolved_support', label: 'Résolu par le support' },
  { value: 'resolved_other', label: 'Résolu autrement' },
  { value: 'timeout', label: 'Délai dépassé / Plus d\'actualité' },
];

// Route protégée par RoleGuard dans App.tsx
export default function UserTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tickets,
    selectedTicket,
    setSelectedTicket,
    attachments,
    messages,
    isLoading,
    isCreating,
    createTicket,
    addMessage,
    downloadAttachment,
    closeTicket,
    uploadAttachment,
  } = useUserTickets();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    service: 'apogee',
    category: 'question',
    priority: 'normal',
    description: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Close dialog state
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  
  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateTicket = async () => {
    const trimmedSubject = newTicket.subject.trim();
    const trimmedDescription = newTicket.description.trim();
    
    if (!trimmedSubject || trimmedSubject.length < 3) {
      return;
    }
    
    if (!trimmedDescription) {
      return;
    }

    const ticket = await createTicket(
      trimmedSubject,
      newTicket.service,
      newTicket.category,
      trimmedDescription,
      files,
      newTicket.priority
    );

    if (ticket) {
      setNewTicket({ subject: '', service: 'apogee', category: 'question', priority: 'normal', description: '' });
      setFiles([]);
      setShowCreateForm(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    await addMessage(selectedTicket.id, newMessage);
    setNewMessage('');
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || !closeReason) return;
    
    setIsClosing(true);
    const reasonLabel = CLOSE_REASONS.find(r => r.value === closeReason)?.label || closeReason;
    await closeTicket(selectedTicket.id, reasonLabel);
    setIsClosing(false);
    setShowCloseDialog(false);
    setCloseReason('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTicket || !e.target.files?.length) return;
    
    setIsUploading(true);
    for (const file of Array.from(e.target.files)) {
      await uploadAttachment(selectedTicket.id, file);
    }
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Normalise les statuts legacy
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

  // Utiliser les nouvelles priorités cohérentes avec supportService.ts
  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      mineur: { label: '🟢 Mineur', className: 'bg-gray-100 text-gray-800 border-gray-300' },
      normal: { label: '⚪ Normal', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      important: { label: '🟠 Important', className: 'bg-orange-100 text-orange-800 border-orange-300' },
      urgent: { label: '🔴 Urgent', className: 'bg-red-100 text-red-800 border-red-300' },
      bloquant: { label: '⛔ Bloquant', className: 'bg-red-200 text-red-900 border-red-400' },
      // Legacy values mapping
      low: { label: '🟢 Mineur', className: 'bg-gray-100 text-gray-800 border-gray-300' },
      high: { label: '🟠 Important', className: 'bg-orange-100 text-orange-800 border-orange-300' },
    };

    const { label, className } = config[priority] || config.normal;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedTicket(null)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{selectedTicket.subject}</CardTitle>
                  <div className="flex items-center gap-2">
                    <ServiceBadge service={selectedTicket.service} />
                    <TicketSourceBadge source={selectedTicket.source} />
                    <TicketCategoryBadge category={selectedTicket.category} />
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm text-muted-foreground">
                    Créé le {format(new Date(selectedTicket.created_at), 'PPp', { locale: fr })}
                  </div>
                  {/* Close button - only for open tickets */}
                  {!['resolved', 'closed'].includes(selectedTicket.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCloseDialog(true)}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Fermer le ticket
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Attachments */}
              {attachments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Pièces jointes</h3>
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span className="text-sm">{att.file_name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadAttachment(att)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Messages */}
              <div>
                <h3 className="font-semibold mb-2">Conversation</h3>
                <ScrollArea className="h-96 border rounded p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      // SUPPORT_V2: Affichage distinct pour les messages système
                      if (msg.is_system_message) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-xs border border-blue-200 dark:border-blue-800">
                              <span>ℹ️ {msg.message}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`p-3 rounded ${
                            msg.is_from_support
                              ? 'bg-blue-50 ml-8'
                              : 'bg-muted mr-8'
                          }`}
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {msg.is_from_support ? 'Support' : 'Vous'} •{' '}
                            {format(new Date(msg.created_at), 'PPp', { locale: fr })}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* New message and file upload - only for open tickets */}
              {!['resolved', 'closed'].includes(selectedTicket.status) && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Votre message..."
                      className="flex-1"
                    />
                    <div className="flex flex-col gap-2">
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
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
                  <p className="text-xs text-muted-foreground">
                    Vous pouvez ajouter des pièces jointes en cliquant sur 📎
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close ticket dialog */}
          <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fermer le ticket</DialogTitle>
                <DialogDescription>
                  Choisissez une raison pour fermer ce ticket. Cette action est définitive.
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
                    'Confirmer la fermeture'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-6">
        {showCreateForm ? (
          <Button
            variant="ghost"
            onClick={() => setShowCreateForm(false)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux tickets
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTES.home)}
            className="mb-4"
          >
            <Home className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        )}
        
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Support / Tickets</h1>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau ticket
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Créer un nouveau ticket</CardTitle>
              <CardDescription>
                Décrivez votre problème ou votre question
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Service concerné *</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'apogee' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'apogee'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🖥️ Apogée
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'helpconfort' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'helpconfort'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🏠 HelpConfort
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'apporteurs' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'apporteurs'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🤝 Apporteurs
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'conseil' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'conseil'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    💡 Conseil
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, service: 'autre' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.service === 'autre'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    ❓ Autre
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Catégories alignées avec supportService.ts */}
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="amelioration">Amélioration</SelectItem>
                    <SelectItem value="blocage">Blocage</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Niveau d'urgence *</Label>
                {/* Utiliser les nouvelles priorités : mineur, normal, important, urgent, bloquant */}
                <div className="grid grid-cols-5 gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, priority: 'mineur' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.priority === 'mineur'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🟢 Mineur
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, priority: 'normal' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.priority === 'normal'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    ⚪ Normal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, priority: 'important' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.priority === 'important'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🟠 Important
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, priority: 'urgent' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.priority === 'urgent'
                        ? 'border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    🔴 Urgent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicket({ ...newTicket, priority: 'bloquant' })}
                    className={`rounded-2xl border-l-4 transition-all ${
                      newTicket.priority === 'bloquant'
                        ? 'border-l-accent bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg hover:shadow-xl'
                        : 'border-l-border hover:border-l-accent hover:shadow-md'
                    }`}
                  >
                    ⛔ Bloquant
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Sujet *</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Titre de votre demande (minimum 3 caractères)"
                  required
                  minLength={3}
                />
                {newTicket.subject.trim().length > 0 && newTicket.subject.trim().length < 3 && (
                  <p className="text-sm text-destructive mt-1">Le sujet doit contenir au moins 3 caractères</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Décrivez votre problème en détail"
                  rows={5}
                  required
                />
              </div>

              <div>
                <Label htmlFor="files">Pièces jointes (optionnel)</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateTicket}
                  disabled={
                    isCreating || 
                    newTicket.subject.trim().length < 3 || 
                    !newTicket.description.trim()
                  }
                >
                  {isCreating ? 'Création...' : 'Créer le ticket'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun ticket. Créez-en un pour commencer.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{ticket.subject}</CardTitle>
                        {ticket.unreadCount && ticket.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white hover:bg-red-600">
                            {ticket.unreadCount} nouveau{ticket.unreadCount > 1 ? 'x' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <ServiceBadge service={ticket.service} />
                        <TicketSourceBadge source={ticket.source} />
                        <TicketCategoryBadge category={ticket.category} />
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(ticket.created_at), 'PPp', { locale: fr })}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
