/**
 * Drawer de détail d'un ticket Apogée - Version restructurée
 * Une seule page principale + onglet Documents joints
 */

import { useState, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Clock, 
  Send, 
  ChevronDown,
  ChevronUp,
  Paperclip,
  Upload,
  X,
  FileText,
  Download,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApogeeTicket } from '../hooks/useApogeeTickets';
import { useTicketAttachments } from '../hooks/useTicketAttachments';
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

const MAX_VISIBLE_COMMENTS = 3;

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
  const { attachments, uploadAttachment, deleteAttachment, isUploading } = useTicketAttachments(ticket?.id || null);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<AuthorType>('HC');
  const [showAllComments, setShowAllComments] = useState(false);

  // Trier les commentaires du plus récent au plus ancien
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [comments]);

  // Commentaires visibles selon l'état "voir plus"
  const visibleComments = useMemo(() => {
    if (showAllComments) return sortedComments;
    return sortedComments.slice(0, MAX_VISIBLE_COMMENTS);
  }, [sortedComments, showAllComments]);

  const hasMoreComments = sortedComments.length > MAX_VISIBLE_COMMENTS;

  if (!ticket) return null;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    await addComment.mutateAsync({
      ticket_id: ticket.id,
      author_type: commentType,
      body: newComment.trim(),
      is_internal: false,
    });
    
    setNewComment('');
  };

  const handleFieldUpdate = (field: string, value: any) => {
    onUpdate({ id: ticket.id, [field]: value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAttachment(file);
      e.target.value = '';
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-hidden flex flex-col p-0">
        {/* Header fixe */}
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Badges de statut */}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={ticket.kanban_status}
                  onValueChange={(v) => handleFieldUpdate('kanban_status', v)}
                >
                  <SelectTrigger className="h-7 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ticket.module && (
                  <Badge className="bg-blue-500 text-white">
                    {ticket.apogee_modules?.label || ticket.module}
                  </Badge>
                )}
                {ticket.priority && (
                  <Badge className="bg-orange-500 text-white">
                    {ticket.priority}
                  </Badge>
                )}
                {ticket.owner_side && (
                  <Badge variant="outline">{ticket.owner_side}</Badge>
                )}
                {ticket.needs_completion && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    À compléter
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="main" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-2 w-auto justify-start">
            <TabsTrigger value="main">Ticket</TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              Documents ({attachments.length})
            </TabsTrigger>
          </TabsList>

          {/* Onglet Principal */}
          <TabsContent value="main" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* TITRE */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Titre / Élément concerné
                  </label>
                  <Textarea
                    value={ticket.element_concerne}
                    onChange={(e) => handleFieldUpdate('element_concerne', e.target.value)}
                    rows={2}
                    className="mt-1 text-lg font-semibold resize-none"
                  />
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </label>
                  <Textarea
                    value={ticket.description || ''}
                    onChange={(e) => handleFieldUpdate('description', e.target.value || null)}
                    rows={6}
                    placeholder="Décrivez le ticket en détail..."
                    className="mt-1 resize-none"
                  />
                </div>

                {/* PARAMÈTRES en ligne */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Module</label>
                    <Select
                      value={ticket.module || ''}
                      onValueChange={(v) => handleFieldUpdate('module', v || null)}
                    >
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="—" />
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
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="—" />
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
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HC">Help Confort</SelectItem>
                        <SelectItem value="APOGEE">Apogée</SelectItem>
                        <SelectItem value="PARTAGE">Partagé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Estimation (h)</label>
                    <div className="flex gap-1 mt-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={ticket.h_min ?? ''}
                        onChange={(e) => handleFieldUpdate('h_min', e.target.value ? Number(e.target.value) : null)}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={ticket.h_max ?? ''}
                        onChange={(e) => handleFieldUpdate('h_max', e.target.value ? Number(e.target.value) : null)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ÉCHANGES */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Échanges ({comments.length})
                    </label>
                  </div>

                  {/* Formulaire nouveau commentaire */}
                  <div className="bg-muted/30 rounded-lg p-3 mb-4 space-y-2">
                    <div className="flex gap-2">
                      <Select
                        value={commentType}
                        onValueChange={(v) => setCommentType(v as AuthorType)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HC">HC</SelectItem>
                          <SelectItem value="APOGEE">Apogée</SelectItem>
                          <SelectItem value="DYN">Dynoco</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Ajouter un commentaire..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                        className="flex-1 resize-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addComment.isPending}
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Envoyer
                      </Button>
                    </div>
                  </div>

                  {/* Liste des commentaires */}
                  <div className="space-y-3">
                    {visibleComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-3 bg-background border rounded-lg">
                        <Badge className={`${AUTHOR_COLORS[comment.author_type]} h-6 shrink-0`}>
                          {comment.author_name || comment.author_type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(comment.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                            {comment.source_field && (
                              <span className="ml-2 opacity-50">({comment.source_field})</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}

                    {comments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun échange pour le moment
                      </p>
                    )}

                    {/* Bouton "Voir plus" / "Voir moins" */}
                    {hasMoreComments && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setShowAllComments(!showAllComments)}
                      >
                        {showAllComments ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Voir moins
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Voir {sortedComments.length - MAX_VISIBLE_COMMENTS} échange(s) de plus
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Infos source Excel (collapsible) */}
                {ticket.source_sheet && (
                  <>
                    <Separator />
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                          <span className="text-xs">Source: {ticket.source_sheet} (ligne {ticket.source_row_index})</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-2 text-sm">
                        {ticket.apogee_status_raw && (
                          <div>
                            <span className="text-xs font-medium text-purple-600">APOGÉE:</span>
                            <p className="text-muted-foreground">{ticket.apogee_status_raw}</p>
                          </div>
                        )}
                        {ticket.hc_status_raw && (
                          <div>
                            <span className="text-xs font-medium text-helpconfort-blue">HC:</span>
                            <p className="text-muted-foreground">{ticket.hc_status_raw}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Importé le {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Onglet Documents */}
          <TabsContent value="documents" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {/* Upload */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {isUploading ? 'Envoi en cours...' : 'Cliquez pour ajouter un fichier'}
                    </span>
                  </label>
                </div>

                {/* Liste des fichiers */}
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.file_size ? `${(att.file_size / 1024).toFixed(1)} Ko` : ''} 
                          {att.created_at && ` • ${format(new Date(att.created_at), 'dd/MM/yyyy', { locale: fr })}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(att.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteAttachment(att.id, att.file_path)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun document attaché
                    </p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
