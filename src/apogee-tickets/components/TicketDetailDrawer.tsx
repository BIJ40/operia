/**
 * Drawer de détail d'un ticket Apogée
 */

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock, 
  User, 
  FileText, 
  MessageSquare, 
  Send, 
  ExternalLink,
  Calendar,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApogeeTicket } from '../hooks/useApogeeTickets';
import type { ApogeeTicket, ApogeeModule, ApogeePriority, ApogeeTicketStatus, AuthorType } from '../types';

interface TicketDetailDrawerProps {
  ticket: ApogeeTicket | null;
  open: boolean;
  onClose: () => void;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  statuses: ApogeeTicketStatus[];
  onUpdate: (updates: Partial<ApogeeTicket> & { id: string }) => void;
}

const AUTHOR_COLORS: Record<AuthorType, string> = {
  HC: 'bg-helpconfort-blue text-white',
  APOGEE: 'bg-purple-600 text-white',
  DYN: 'bg-amber-500 text-white',
  AUTRE: 'bg-gray-500 text-white',
};

export function TicketDetailDrawer({
  ticket,
  open,
  onClose,
  modules,
  priorities,
  statuses,
  onUpdate,
}: TicketDetailDrawerProps) {
  const { comments, addComment } = useApogeeTicket(ticket?.id || null);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<AuthorType>('HC');
  const [isInternal, setIsInternal] = useState(false);

  if (!ticket) return null;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    await addComment.mutateAsync({
      ticket_id: ticket.id,
      author_type: commentType,
      body: newComment.trim(),
      is_internal: isInternal,
    });
    
    setNewComment('');
  };

  const handleFieldUpdate = (field: string, value: any) => {
    onUpdate({ id: ticket.id, [field]: value });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left flex items-start gap-2">
            <span className="flex-1">{ticket.element_concerne}</span>
          </SheetTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {ticket.module && (
              <Badge className="bg-blue-500 text-white">
                {ticket.apogee_modules?.label || ticket.module}
              </Badge>
            )}
            {ticket.priority && (
              <Badge className="bg-orange-500 text-white">
                Prio: {ticket.priority}
              </Badge>
            )}
            {ticket.owner_side && (
              <Badge variant="outline">{ticket.owner_side}</Badge>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="comments">
              Échanges ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="source">Source Excel</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Onglet Détails */}
            <TabsContent value="details" className="space-y-4 m-0">
              {/* Champs éditables */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Paramètres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Module</label>
                      <Select
                        value={ticket.module || ''}
                        onValueChange={(v) => handleFieldUpdate('module', v || null)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Priorité</label>
                      <Select
                        value={ticket.priority || ''}
                        onValueChange={(v) => handleFieldUpdate('priority', v || null)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Propriétaire</label>
                      <Select
                        value={ticket.owner_side || ''}
                        onValueChange={(v) => handleFieldUpdate('owner_side', v || null)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HC">Help Confort</SelectItem>
                          <SelectItem value="APOGEE">Apogée</SelectItem>
                          <SelectItem value="PARTAGE">Partagé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Statut</label>
                      <Select
                        value={ticket.kanban_status}
                        onValueChange={(v) => handleFieldUpdate('kanban_status', v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {ticket.description && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Estimations */}
              {(ticket.h_min || ticket.h_max) && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Estimation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {ticket.h_min || '?'} - {ticket.h_max || '?'} heures
                    </p>
                    {ticket.hca_code && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Code HCA: {ticket.hca_code}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Statuts bruts */}
              {(ticket.apogee_status_raw || ticket.hc_status_raw) && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Tracking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {ticket.apogee_status_raw && (
                      <div>
                        <span className="text-xs font-medium text-purple-600">APOGÉE:</span>
                        <p className="text-sm">{ticket.apogee_status_raw}</p>
                      </div>
                    )}
                    {ticket.hc_status_raw && (
                      <div>
                        <span className="text-xs font-medium text-helpconfort-blue">HC:</span>
                        <p className="text-sm">{ticket.hc_status_raw}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Onglet Commentaires */}
            <TabsContent value="comments" className="space-y-4 m-0">
              {/* Timeline des commentaires */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Badge className={`${AUTHOR_COLORS[comment.author_type]} h-6 shrink-0`}>
                      {comment.author_name || comment.author_type}
                    </Badge>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        {comment.source_field && (
                          <span className="ml-2 opacity-50">({comment.source_field})</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun commentaire
                  </p>
                )}
              </div>

              <Separator />

              {/* Nouveau commentaire */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select
                    value={commentType}
                    onValueChange={(v) => setCommentType(v as AuthorType)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HC">HC</SelectItem>
                      <SelectItem value="APOGEE">Apogée</SelectItem>
                      <SelectItem value="DYN">Dynoco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Ajouter un commentaire..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addComment.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </TabsContent>

            {/* Onglet Source Excel */}
            <TabsContent value="source" className="space-y-4 m-0">
              {ticket.source_sheet ? (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Origine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>Feuille:</strong> {ticket.source_sheet}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        <strong>Ligne:</strong> {ticket.source_row_index}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Importé le {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Ticket créé manuellement
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Créé le {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
