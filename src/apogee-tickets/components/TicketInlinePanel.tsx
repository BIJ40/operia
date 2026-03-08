/**
 * Panel inline pour afficher un ticket dans un onglet
 * Similaire au Drawer mais affiché inline avec auto-save debounced
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileManager } from '@/components/files/FileManager';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  Send, 
  ChevronDown,
  ChevronUp,
  Paperclip,
  Trash2,
  CheckCircle2,
  History,
  Pencil,
  X,
  Check,
  Mail,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApogeeTicket } from '../hooks/useApogeeTickets';
import { supabase } from '@/integrations/supabase/client';
import { useMarkTicketAsViewed } from '../hooks/useTicketViews';
import { HeatPrioritySelector } from './HeatPrioritySelector';
import { ModuleSelector } from './ModuleSelector';
import { OrigineBadge } from './OrigineBadge';
import { OwnerSideSlider, ownerSideToSliderValue, sliderValueToOwnerSide } from './OwnerSideSlider';

import { useAuth } from '@/contexts/AuthContext';
import { useMyTicketRole, useAllowedTransitions } from '../hooks/useTicketPermissions';
import { TicketTimelineTab } from './TicketTimelineTab';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { TagSelector } from './TagSelector';
import { RoadmapEditor } from './RoadmapEditor';
import { TicketSupportExchanges } from './TicketSupportExchanges';
import { QuickReplyMenu } from './QuickReplyMenu';
import { PecButton } from './PecButton';
import { StatusSelector } from './StatusSelector';
import type { ApogeeTicket, ApogeeModule, ApogeePriority, ApogeeTicketStatus, AuthorType } from '../types';

interface TicketInlinePanelProps {
  ticket: ApogeeTicket;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  statuses: ApogeeTicketStatus[];
  onQueueChange: (ticketId: string, updates: Partial<ApogeeTicket>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const AUTHOR_COLORS: Record<AuthorType, string> = {
  HC: 'bg-helpconfort-blue text-white',
  APOGEE: 'bg-purple-600 text-white',
};


const MAX_VISIBLE_COMMENTS = 3;

export function TicketInlinePanel({
  ticket,
  modules,
  priorities,
  statuses,
  onQueueChange,
  onDelete,
  onClose,
}: TicketInlinePanelProps) {
  const { user } = useAuthCore();
  const { isAdmin, isSupport } = usePermissions();
  const { data: roleInfo } = useMyTicketRole();
  const canManage = roleInfo?.canManage ?? false;
  const isDeveloper = roleInfo?.ticketRole === 'developer';
  const canEditDevFields = canManage || isDeveloper;
  
  const { data: allowedTransitions = [] } = useAllowedTransitions(ticket.kanban_status || '');
  const markAsViewed = useMarkTicketAsViewed();
  const { comments, addComment, updateComment } = useApogeeTicket(ticket.id);
  
  // File count
  const storagePath = ticket.id || '';
  const { data: filesCount = 0 } = useQuery({
    queryKey: ['files-count', 'apogee-ticket-attachments', storagePath],
    queryFn: async () => {
      if (!storagePath) return 0;
      const { data, error } = await supabase.storage
        .from('apogee-ticket-attachments')
        .list(storagePath);
      if (error) return 0;
      const realFiles = (data || []).filter(f => f.name && !f.name.startsWith('.') && f.id);
      return realFiles.length;
    },
    enabled: !!ticket.id,
  });

  const [newComment, setNewComment] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [isSendingCommentEmail, setIsSendingCommentEmail] = useState(false);
  
  // Mode édition pour titre/description (verrouillé par défaut)
  const [isEditingContent, setIsEditingContent] = useState(false);

  const autoCommentType: AuthorType = isDeveloper ? 'APOGEE' : 'HC';
  const draftKey = `ticket-draft-${ticket.id}`;

  // Load draft
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) setNewComment(savedDraft);
  }, [draftKey]);

  // Save draft
  useEffect(() => {
    if (newComment.trim()) {
      localStorage.setItem(draftKey, newComment);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [newComment, draftKey]);

  // Mark as viewed
  useEffect(() => {
    markAsViewed.mutate(ticket.id);
    
    if ((isSupport || isAdmin) && ticket.is_urgent_support === true && user?.id) {
      supabase
        .from('apogee_tickets')
        .update({ is_urgent_support: false })
        .eq('id', ticket.id)
        .then(async ({ error }) => {
          if (!error) {
            onQueueChange(ticket.id, { is_urgent_support: false });
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', user.id)
              .single();
            
            const agentName = profile?.first_name && profile?.last_name 
              ? `${profile.first_name} ${profile.last_name}` 
              : (user.email || 'Agent support');
            
            await supabase
              .from('apogee_ticket_history')
              .insert({
                ticket_id: ticket.id,
                user_id: user.id,
                action_type: 'viewed_by_support',
                old_value: null,
                new_value: agentName,
                metadata: { agent_id: user.id, agent_email: user.email },
              });
          }
        });
    }
  }, [ticket.id]);

  // Local state for editable fields (debounced updates)
  const [localTitle, setLocalTitle] = useState(ticket.element_concerne || '');
  const [localDescription, setLocalDescription] = useState(ticket.description || '');
  const [localHMin, setLocalHMin] = useState(ticket.h_min?.toString() || '');
  const [localHMax, setLocalHMax] = useState(ticket.h_max?.toString() || '');

  // Sync local state when ticket changes
  useEffect(() => {
    setLocalTitle(ticket.element_concerne || '');
    setLocalDescription(ticket.description || '');
    setLocalHMin(ticket.h_min?.toString() || '');
    setLocalHMax(ticket.h_max?.toString() || '');
  }, [ticket.id, ticket.element_concerne, ticket.description, ticket.h_min, ticket.h_max]);

  // Flush unsaved local fields on unmount
  const localHMinRef = useRef(localHMin);
  const localHMaxRef = useRef(localHMax);
  localHMinRef.current = localHMin;
  localHMaxRef.current = localHMax;

  useEffect(() => {
    return () => {
      const pendingUpdates: Partial<ApogeeTicket> = {};
      const hMinVal = localHMinRef.current ? parseFloat(localHMinRef.current) : null;
      const hMaxVal = localHMaxRef.current ? parseFloat(localHMaxRef.current) : null;
      if (hMinVal !== ticket.h_min) pendingUpdates.h_min = hMinVal;
      if (hMaxVal !== ticket.h_max) pendingUpdates.h_max = hMaxVal;
      if (Object.keys(pendingUpdates).length > 0) {
        onQueueChange(ticket.id, pendingUpdates);
      }
    };
  }, [ticket.id]);

  // Auto-save on blur for text fields
  const handleTitleBlur = () => {
    if (localTitle !== ticket.element_concerne) {
      onQueueChange(ticket.id, { element_concerne: localTitle });
    }
  };

  const handleDescriptionBlur = () => {
    if (localDescription !== (ticket.description || '')) {
      onQueueChange(ticket.id, { description: localDescription || null });
    }
  };

  const handleHMinBlur = () => {
    const newValue = localHMin ? parseFloat(localHMin) : null;
    if (newValue !== ticket.h_min) {
      onQueueChange(ticket.id, { h_min: newValue });
    }
  };

  const handleHMaxBlur = () => {
    const newValue = localHMax ? parseFloat(localHMax) : null;
    if (newValue !== ticket.h_max) {
      onQueueChange(ticket.id, { h_max: newValue });
    }
  };

  // Field update handler (for immediate updates like selects)
  const handleFieldUpdate = (field: string, value: unknown) => {
    onQueueChange(ticket.id, { [field]: value });
  };

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [comments]);

  const visibleComments = useMemo(() => {
    if (showAllComments) return sortedComments;
    return sortedComments.slice(0, MAX_VISIBLE_COMMENTS);
  }, [sortedComments, showAllComments]);

  const hasMoreComments = sortedComments.length > MAX_VISIBLE_COMMENTS;

  const availableStatuses = useMemo(() => {
    if (isAdmin) return statuses;
    return statuses.filter(s => 
      s.id === ticket.kanban_status || 
      allowedTransitions.includes(s.id)
    );
  }, [statuses, ticket, isAdmin, allowedTransitions]);


  const handleStatusChange = (newStatus: string) => {
    const isAllowed = isAdmin || allowedTransitions.includes(newStatus);
    if (!isAllowed && newStatus !== ticket.kanban_status) {
      errorToast("Vous n'êtes pas autorisé à effectuer cette transition");
      return;
    }
    
    // Le logging est fait automatiquement par useApogeeTickets.updateTicketKanbanStatus
    // Ne PAS logger ici pour éviter les doublons
    handleFieldUpdate('kanban_status', newStatus);
  };

  const ticketRef = `APO-${String(ticket.ticket_number || 0).padStart(3, '0')}`;

  const showCommentMailButton = ticket.created_from === 'email';

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    const authorName = user?.email?.split('@')[0] || 'Utilisateur';
    
    await addComment.mutateAsync({
      ticket_id: ticket.id,
      author_type: autoCommentType,
      author_name: authorName,
      body: newComment.trim(),
      is_internal: false,
      created_by_user_id: user?.id,
    });
    
    setNewComment('');
    localStorage.removeItem(draftKey);
  };

  const handleAddCommentWithEmail = async () => {
    if (!newComment.trim()) return;
    const msg = newComment.trim();
    setIsSendingCommentEmail(true);
    try {
      const authorName = user?.email?.split('@')[0] || 'Utilisateur';
      await addComment.mutateAsync({
        ticket_id: ticket.id,
        author_type: autoCommentType,
        author_name: authorName,
        body: msg,
        is_internal: false,
        created_by_user_id: user?.id,
      });
      const { error } = await supabase.functions.invoke('reply-ticket-email', {
        body: { ticket_id: ticket.id, message: msg },
      });
      if (error) throw error;
      successToast('Réponse envoyée par email au demandeur');
      setNewComment('');
      localStorage.removeItem(draftKey);
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

  const startEditComment = (comment: typeof comments[0]) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentBody('');
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════
          BLOC: HEADER DU TICKET
          Contient: numéro, statut kanban, module, priorité, corbeille, fermer
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="p-3 border-b-2 border-primary/20 bg-gradient-to-r from-muted/50 to-muted/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Numéro du ticket */}
            <Badge variant="outline" className="font-mono text-sm font-bold bg-background shadow-sm px-3 py-1">
              {ticketRef}
            </Badge>
            
            {/* Statut Kanban (style tag) */}
            <StatusSelector
              status={ticket.kanban_status}
              availableStatuses={availableStatuses}
              onChange={handleStatusChange}
              disabled={!canManage}
            />
            
            {/* Tag Module (cliquable) */}
            <ModuleSelector
              moduleId={ticket.module}
              modules={modules}
              onChange={(v) => handleFieldUpdate('module', v)}
              disabled={!canManage}
              size="default"
            />
            
            {/* Tag Priorité (cliquable) */}
            <HeatPrioritySelector
              priority={ticket.heat_priority}
              onChange={(v) => handleFieldUpdate('heat_priority', v)}
              disabled={!canManage}
              size="default"
            />
            
            {/* Tag Origine (lecture seule) */}
            <OrigineBadge origine={ticket.reported_by} size="default" />
            
            {/* Badge Roadmap si activé */}
            {ticket.roadmap_enabled && (
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Roadmap: {ticket.roadmap_month ? String(ticket.roadmap_month).padStart(2, '0') : '--'}/{ticket.roadmap_year ? String(ticket.roadmap_year).slice(-2) : '--'}
              </Badge>
            )}
          </div>
          
          {/* Actions: Crayon (édition), Corbeille & Fermer */}
          <div className="flex items-center gap-1">
            {/* Bouton crayon pour éditer titre/description */}
            {canManage && (
              <Button 
                size="sm" 
                variant={isEditingContent ? "secondary" : "ghost"} 
                className={`h-8 w-8 p-0 ${isEditingContent ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setIsEditingContent(!isEditingContent)}
                title={isEditingContent ? "Verrouiller l'édition" : "Modifier titre/description"}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            
            {onDelete && canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce ticket ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        onDelete(ticket.id);
                        onClose();
                      }}
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Badges de qualification */}
        {ticket.is_qualified && (
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-primary/10">
            <Badge className="bg-green-600 text-white flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Qualifié
            </Badge>
            {ticket.ticket_type && (
              <Badge variant="outline" className="capitalize text-xs">
                {ticket.ticket_type}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BLOC: ONGLETS DE NAVIGATION
          Contient: Ticket, Historique, Docs, Support
         ═══════════════════════════════════════════════════════════════════ */}
      <Tabs defaultValue="main" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-3 pb-0 border-b bg-muted/20">
          <TabsList className="w-auto h-10 p-1 bg-muted/60 rounded-lg shadow-inner">
            <TabsTrigger value="main" className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium px-4">
              Ticket
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium px-4">
              <History className="h-3.5 w-3.5" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium px-4">
              <Paperclip className="h-3.5 w-3.5" />
              Docs ({filesCount})
            </TabsTrigger>
            {ticket.support_initiator_user_id && (
              <TabsTrigger value="support-exchanges" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium px-4">
                <Send className="h-3.5 w-3.5" />
                Support
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Main Tab */}
        <TabsContent value="main" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* ═══════════════════════════════════════════════════════════
                  LIGNE: TITRE + TAGS + ROADMAP (sur une même ligne)
                 ═══════════════════════════════════════════════════════════ */}
              <div className="flex items-end gap-3">
                {/* Titre (50% de largeur) - Mode consultation/édition */}
                <div className="w-1/2 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Titre</label>
                  {isEditingContent ? (
                    <Input
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      className="text-sm font-semibold"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm font-semibold py-2 px-3 bg-muted/40 rounded-md border border-transparent min-h-[38px] flex items-center">
                      {localTitle || <span className="text-muted-foreground italic">Sans titre</span>}
                    </p>
                  )}
                </div>
                
                {/* Tags */}
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Tags</label>
                  <TagSelector
                    selectedTags={ticket.impact_tags || []}
                    onTagsChange={(tags) => handleFieldUpdate('impact_tags', tags)}
                    disabled={!canEditDevFields}
                    compact
                  />
                </div>
                
                {/* Roadmap */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Roadmap</label>
                  <RoadmapEditor
                    enabled={ticket.roadmap_enabled}
                    month={ticket.roadmap_month}
                    year={ticket.roadmap_year}
                    onChange={(enabled, month, year) => onQueueChange(ticket.id, {
                      roadmap_enabled: enabled,
                      roadmap_month: month,
                      roadmap_year: year,
                    })}
                    disabled={!canEditDevFields}
                    compact
                  />
                </div>
              </div>

              {/* Description - Mode consultation/édition */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
                {isEditingContent ? (
                  <Textarea
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    rows={3}
                    placeholder="Description..."
                    className="mt-1 resize-none"
                  />
                ) : (
                  <div className="mt-1 py-2 px-3 bg-muted/40 rounded-md border border-transparent min-h-[80px] text-sm whitespace-pre-wrap">
                    {localDescription || <span className="text-muted-foreground italic">Aucune description</span>}
                  </div>
                )}
              </div>

              {/* Parameters row: Estimation, Porteur */}
              <div className="flex items-end gap-3 flex-wrap">
                <div className="w-32">
                  <label className="text-xs text-muted-foreground">Estim. (h)</label>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={localHMin}
                      onChange={(e) => setLocalHMin(e.target.value)}
                      onBlur={handleHMinBlur}
                      className="h-8 text-xs w-14 px-1.5"
                      min={0}
                      step={0.5}
                      disabled={!canEditDevFields}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={localHMax}
                      onChange={(e) => setLocalHMax(e.target.value)}
                      onBlur={handleHMaxBlur}
                      className="h-8 text-xs w-14 px-1.5"
                      min={0}
                      step={0.5}
                      disabled={!canEditDevFields}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-[320px] max-w-[560px]" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <label className="text-xs text-muted-foreground">Porteur</label>
                  <OwnerSideSlider
                    value={ownerSideToSliderValue(ticket.owner_side)}
                    onChange={(v) => handleFieldUpdate('owner_side', sliderValueToOwnerSide(v))}
                    disabled={!canEditDevFields}
                    compact
                  />
                </div>
              </div>


              <Separator />

              {/* Comments */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase mb-2 block">
                  Échanges ({comments.length})
                </label>

                {/* New comment */}
                <div className="bg-muted/30 rounded-lg p-3 mb-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <Badge className={autoCommentType === 'HC' ? 'bg-helpconfort-blue text-white' : 'bg-purple-600 text-white'}>
                      {autoCommentType === 'HC' ? 'HC' : 'Apogée'}
                    </Badge>
                    <Textarea
                      placeholder="Ajouter un commentaire..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                      className="flex-1 resize-none text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {ticket.created_from === 'email' && (
                        <QuickReplyMenu
                          context={{
                            requesterName: (ticket.initiator_profile as any)?.first_name || (ticket.reported_by as string) || undefined,
                            ticketRef: ticketRef,
                            subject: ticket.element_concerne,
                          }}
                          onSelect={(msg) => setNewComment(msg)}
                        />
                      )}
                      <PecButton
                        ticketId={ticket.id}
                        ticketCreatedFrom={ticket.created_from}
                        requesterName={(ticket.initiator_profile as any)?.first_name || (ticket.reported_by as string) || undefined}
                        subject={ticket.element_concerne}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddComment} disabled={!newComment.trim() || addComment.isPending || isSendingCommentEmail} size="sm" variant={showCommentMailButton ? "outline" : "default"}>
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Répondre
                      </Button>
                      {showCommentMailButton && (
                        <Button onClick={handleAddCommentWithEmail} disabled={!newComment.trim() || addComment.isPending || isSendingCommentEmail} size="sm" className="gap-1">
                          {isSendingCommentEmail ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Mail className="h-3.5 w-3.5" />
                          )}
                          Répondre + Mail
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comments list */}
                <div className="space-y-2">
                  {visibleComments.map((comment) => {
                    const isEditing = editingCommentId === comment.id;
                    const canEdit = comment.created_by_user_id === user?.id;
                    
                    return (
                      <div key={comment.id} className="flex gap-2 p-2 bg-background border rounded-lg text-sm">
                        <Badge className={`${AUTHOR_COLORS[comment.author_type]} h-5 shrink-0 text-xs`}>
                          {comment.author_name || comment.author_type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingCommentBody}
                                onChange={(e) => setEditingCommentBody(e.target.value)}
                                rows={2}
                                className="resize-none text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={cancelEditComment} className="h-6 text-xs">
                                  Annuler
                                </Button>
                                <Button size="sm" onClick={handleEditComment} disabled={!editingCommentBody.trim()} className="h-6 text-xs">
                                  Enregistrer
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap break-words">{comment.body}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), "dd MMM 'à' HH:mm", { locale: fr })}
                                </p>
                                {canEdit && (
                                  <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => startEditComment(comment)}>
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
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Aucun échange
                    </p>
                  )}

                  {hasMoreComments && (
                    <Button variant="ghost" className="w-full text-xs" onClick={() => setShowAllComments(!showAllComments)}>
                      {showAllComments ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Voir {sortedComments.length - MAX_VISIBLE_COMMENTS} de plus
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Timeline Tab */}
        <TicketTimelineTab ticketId={ticket.id} statuses={statuses} />

        {/* Documents Tab */}
        <TabsContent value="documents" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <FileManager
                bucketName="apogee-ticket-attachments"
                recordId={ticket.id}
                basePath=""
                maxFileSize={10}
                className="border-0 shadow-none"
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Support exchanges Tab */}
        {ticket.support_initiator_user_id && (
          <TabsContent value="support-exchanges" className="flex-1 overflow-hidden m-0">
            <div className="h-full p-4">
              <TicketSupportExchanges
                ticketId={ticket.id}
                initiatorUserId={ticket.support_initiator_user_id}
                initiatorProfile={ticket.initiator_profile}
                isSupport={true}
                ticketCreatedFrom={ticket.created_from}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
