/**
 * TicketDetailDrawer — Comments section
 * Handles comment display, creation, editing, and email replies
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ChevronDown, ChevronUp, Pencil, X, Check, Mail, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { QuickReplyMenu } from '../QuickReplyMenu';
import { PecButton } from '../PecButton';
import { AUTHOR_COLORS, MAX_VISIBLE_COMMENTS, formatTicketRef } from './constants';
import type { AuthorType } from '../../types';

interface Comment {
  id: string;
  body: string;
  author_type: AuthorType;
  author_name: string | null;
  created_at: string;
  updated_at: string | null;
  created_by_user_id: string | null;
  source_field: string | null;
}

interface TicketCommentsSectionProps {
  ticketId: string;
  ticketNumber: number | undefined;
  ticketElementConcerne: string;
  ticketCreatedFrom: string;
  ticketInitiatorProfile: any;
  ticketReportedBy: string | null;
  comments: Comment[];
  sortedComments: Comment[];
  currentUserId: string | undefined;
  currentUserEmail: string | undefined;
  autoCommentType: AuthorType;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  draftKey: string | null;
  addComment: {
    mutateAsync: (data: any) => Promise<any>;
    isPending: boolean;
  };
  updateComment: {
    mutateAsync: (data: any) => Promise<any>;
    isPending: boolean;
  };
}

export function TicketCommentsSection({
  ticketId,
  ticketNumber,
  ticketElementConcerne,
  ticketCreatedFrom,
  ticketInitiatorProfile,
  ticketReportedBy,
  comments,
  sortedComments,
  currentUserId,
  currentUserEmail,
  autoCommentType,
  newComment,
  onNewCommentChange,
  draftKey,
  addComment,
  updateComment,
}: TicketCommentsSectionProps) {
  const [showAllComments, setShowAllComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [isSendingCommentEmail, setIsSendingCommentEmail] = useState(false);

  const visibleComments = showAllComments 
    ? sortedComments 
    : sortedComments.slice(0, MAX_VISIBLE_COMMENTS);
  
  const hasMoreComments = sortedComments.length > MAX_VISIBLE_COMMENTS;
  const showCommentMailButton = ticketCreatedFrom === 'email';
  const ticketRef = formatTicketRef(ticketNumber);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const authorName = currentUserEmail?.split('@')[0] || 'Utilisateur';
    await addComment.mutateAsync({
      ticket_id: ticketId,
      author_type: autoCommentType,
      author_name: authorName,
      body: newComment.trim(),
      is_internal: false,
      created_by_user_id: currentUserId,
    });
    onNewCommentChange('');
    if (draftKey) localStorage.removeItem(draftKey);
  };

  const handleAddCommentWithEmail = async () => {
    if (!newComment.trim()) return;
    const msg = newComment.trim();
    setIsSendingCommentEmail(true);
    try {
      const authorName = currentUserEmail?.split('@')[0] || 'Utilisateur';
      await addComment.mutateAsync({
        ticket_id: ticketId,
        author_type: autoCommentType,
        author_name: authorName,
        body: msg,
        is_internal: false,
        created_by_user_id: currentUserId,
      });
      const { error } = await supabase.functions.invoke('reply-ticket-email', {
        body: { ticket_id: ticketId, message: msg },
      });
      if (error) throw error;
      successToast('Réponse envoyée par email au demandeur');
      onNewCommentChange('');
      if (draftKey) localStorage.removeItem(draftKey);
    } catch (err: any) {
      errorToast(err?.message || "Erreur lors de l'envoi email");
    } finally {
      setIsSendingCommentEmail(false);
    }
  };

  const handleEditComment = async () => {
    if (!editingCommentId || !editingCommentBody.trim()) return;
    await updateComment.mutateAsync({
      commentId: editingCommentId,
      body: editingCommentBody.trim(),
    });
    setEditingCommentId(null);
    setEditingCommentBody('');
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentBody('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Échanges ({comments.length})
        </label>
      </div>

      {/* New comment form */}
      <div className="bg-muted/30 rounded-lg p-3 mb-4 space-y-2">
        <div className="flex gap-2 items-start">
          <Badge className={autoCommentType === 'HC' ? 'bg-helpconfort-blue text-white' : 'bg-purple-600 text-white'}>
            {autoCommentType === 'HC' ? 'HC' : 'Apogée'}
          </Badge>
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
            rows={2}
            className="flex-1 resize-none"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {ticketCreatedFrom === 'email' && (
              <QuickReplyMenu
                context={{
                  requesterName: ticketInitiatorProfile?.first_name || ticketReportedBy || undefined,
                  ticketRef,
                  subject: ticketElementConcerne,
                }}
                onSelect={(msg) => onNewCommentChange(msg)}
              />
            )}
            <PecButton
              ticketId={ticketId}
              ticketCreatedFrom={ticketCreatedFrom}
              requesterName={ticketInitiatorProfile?.first_name || ticketReportedBy || undefined}
              subject={ticketElementConcerne}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addComment.isPending || isSendingCommentEmail}
              size="sm"
              variant={showCommentMailButton ? "outline" : "default"}
            >
              <Send className="h-4 w-4 mr-1" />
              Répondre
            </Button>
            {showCommentMailButton && (
              <Button
                onClick={handleAddCommentWithEmail}
                disabled={!newComment.trim() || addComment.isPending || isSendingCommentEmail}
                size="sm"
                className="gap-1"
              >
                {isSendingCommentEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Répondre + Mail
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Comment list */}
      <div className="space-y-3">
        {visibleComments.map((comment) => {
          const isEditing = editingCommentId === comment.id;
          const canEdit = comment.created_by_user_id === currentUserId;
          
          return (
            <div key={comment.id} className="flex gap-3 p-3 bg-background border rounded-lg">
              <Badge className={`${AUTHOR_COLORS[comment.author_type]} h-6 shrink-0`}>
                {comment.author_name || comment.author_type}
              </Badge>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingCommentBody}
                      onChange={(e) => setEditingCommentBody(e.target.value)}
                      rows={2}
                      className="resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={cancelEditComment}>
                        <X className="h-4 w-4 mr-1" />
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleEditComment}
                        disabled={!editingCommentBody.trim() || updateComment.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        {comment.updated_at && (
                          <span className="ml-2 text-helpconfort-orange font-medium">(modifié)</span>
                        )}
                        {comment.source_field && (
                          <span className="ml-2 opacity-50">({comment.source_field})</span>
                        )}
                      </p>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-muted-foreground hover:text-foreground"
                          onClick={() => startEditComment(comment)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun échange pour le moment
          </p>
        )}

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
  );
}
