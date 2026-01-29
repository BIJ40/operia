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
  Flame,
  Snowflake,
  History,
  GitBranch,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApogeeTicket } from '../hooks/useApogeeTickets';
import { supabase } from '@/integrations/supabase/client';
import { useMarkTicketAsViewed } from '../hooks/useTicketViews';
import { HeatPriorityBadge } from './HeatPriorityBadge';
import { OwnerSideSlider, ownerSideToSliderValue, sliderValueToOwnerSide } from './OwnerSideSlider';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTicketRole, useAllowedTransitions, useLogTicketAction } from '../hooks/useTicketPermissions';
import { TicketTimelineTab } from './TicketTimelineTab';
import { errorToast } from '@/lib/toastHelpers';
import { TagSelector } from './TagSelector';
import { RoadmapEditor } from './RoadmapEditor';
import { TicketSupportExchanges } from './TicketSupportExchanges';
import type { ApogeeTicket, ApogeeModule, ApogeePriority, ApogeeTicketStatus, AuthorType, ReportedBy } from '../types';

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

const ORIGINE_OPTIONS: { value: ReportedBy; label: string }[] = [
  { value: 'JEROME', label: 'Jérôme' },
  { value: 'FLORIAN', label: 'Florian' },
  { value: 'ERIC', label: 'Éric' },
  { value: 'MARIE', label: 'Marie' },
  { value: 'MATHILDE', label: 'Mathilde' },
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'HUGO', label: 'Hugo (Apogée)' },
  { value: 'AUTRE', label: 'Autre' },
];

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
  const { user, isAdmin, isSupport } = useAuth();
  const { data: roleInfo } = useMyTicketRole();
  const canManage = roleInfo?.canManage ?? false;
  const isDeveloper = roleInfo?.ticketRole === 'developer';
  const canEditDevFields = canManage || isDeveloper;
  
  const { data: allowedTransitions = [] } = useAllowedTransitions(ticket.kanban_status || '');
  const logAction = useLogTicketAction();
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

  const currentStatusColor = useMemo(() => {
    const status = statuses.find(s => s.id === ticket.kanban_status);
    return status?.color || '#6b7280';
  }, [statuses, ticket.kanban_status]);

  const handleStatusChange = async (newStatus: string) => {
    const isAllowed = isAdmin || allowedTransitions.includes(newStatus);
    if (!isAllowed && newStatus !== ticket.kanban_status) {
      errorToast("Vous n'êtes pas autorisé à effectuer cette transition");
      return;
    }
    
    await logAction.mutateAsync({
      ticketId: ticket.id,
      actionType: 'status_change',
      oldValue: ticket.kanban_status,
      newValue: newStatus,
      metadata: { 
        ticket_ref: `APO-${String(ticket.ticket_number || 0).padStart(3, '0')}`,
        ticket_number: ticket.ticket_number
      }
    });
    
    handleFieldUpdate('kanban_status', newStatus);
  };

  const ticketRef = `APO-${String(ticket.ticket_number || 0).padStart(3, '0')}`;

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
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-sm font-semibold">
              {ticketRef}
            </Badge>
            <Select
              value={ticket.kanban_status}
              onValueChange={handleStatusChange}
              disabled={!canManage}
            >
              <SelectTrigger 
                className="h-8 w-auto min-w-[130px] text-sm font-medium gap-2"
                style={{ 
                  backgroundColor: `${currentStatusColor}20`,
                  borderColor: currentStatusColor
                }}
              >
                <GitBranch className="h-3.5 w-3.5" style={{ color: currentStatusColor }} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {availableStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: s.color || '#6b7280' }}
                      />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ticket.module && (
              <Badge className="bg-blue-500 text-white text-xs">
                {ticket.apogee_modules?.label || ticket.module}
              </Badge>
            )}
            <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
          </div>
          
          <div className="flex items-center gap-2">
            {onDelete && canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
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
            <Button size="sm" variant="ghost" className="h-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Qualification badges */}
        {ticket.is_qualified && (
          <div className="flex flex-wrap items-center gap-2">
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

      {/* Tabs Content */}
      <Tabs defaultValue="main" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 w-auto justify-start">
          <TabsTrigger value="main">Ticket</TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1">
            <History className="h-3 w-3" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            Docs ({filesCount})
          </TabsTrigger>
          {ticket.support_initiator_user_id && (
            <TabsTrigger value="support-exchanges" className="flex items-center gap-1">
              <Send className="h-3 w-3" />
              Support
            </TabsTrigger>
          )}
        </TabsList>

        {/* Main Tab */}
        <TabsContent value="main" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Title row with Tags/Roadmap top-right */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Titre</label>
                  <div className="flex items-center gap-3">
                    <TagSelector
                      selectedTags={ticket.impact_tags || []}
                      onTagsChange={(tags) => handleFieldUpdate('impact_tags', tags)}
                      disabled={!canEditDevFields}
                      compact
                    />
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
                <Input
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="text-sm font-semibold"
                  disabled={!canManage}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
                <Textarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  rows={3}
                  placeholder="Description..."
                  className="mt-1 resize-none"
                  disabled={!canManage}
                />
              </div>

              {/* Parameters row: Module, Origine, Estimation, Porteur */}
              <div className="flex items-end gap-3 flex-wrap">
                <div className="w-28">
                  <label className="text-xs text-muted-foreground">Module</label>
                  <Select
                    value={ticket.module || ''}
                    onValueChange={(v) => handleFieldUpdate('module', v || null)}
                    disabled={!canManage}
                  >
                    <SelectTrigger className="h-8 mt-1 text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <label className="text-xs text-muted-foreground">Origine</label>
                  {ticket.created_from === 'support' ? (
                    <div className="h-8 mt-1 px-2 py-1 rounded-md border bg-purple-50 text-xs flex items-center">
                      <span className="px-1 py-0.5 rounded bg-purple-100 text-purple-700 font-medium text-xs">Support</span>
                    </div>
                  ) : (
                    <Select
                      value={ticket.reported_by || ''}
                      onValueChange={(v) => handleFieldUpdate('reported_by', v || null)}
                      disabled={!canManage}
                    >
                      <SelectTrigger className="h-8 mt-1 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGINE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="w-24">
                  <label className="text-xs text-muted-foreground">Estim. (h)</label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={localHMin}
                      onChange={(e) => setLocalHMin(e.target.value)}
                      onBlur={handleHMinBlur}
                      className="h-8 text-xs w-11 px-1"
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
                      className="h-8 text-xs w-11 px-1"
                      min={0}
                      step={0.5}
                      disabled={!canEditDevFields}
                    />
                  </div>
                </div>
                <div className="w-[260px] shrink-0">
                  <label className="text-xs text-muted-foreground">Porteur</label>
                  <OwnerSideSlider
                    value={ownerSideToSliderValue(ticket.owner_side)}
                    onChange={(v) => handleFieldUpdate('owner_side', sliderValueToOwnerSide(v))}
                    disabled={!canEditDevFields}
                    compact
                  />
                </div>
              </div>

              {/* Priority slider */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  Priorité
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <HeatPriorityBadge priority={ticket.heat_priority} size="sm" showLabel />
                  <button
                    type="button"
                    onClick={() => handleFieldUpdate('heat_priority', Math.max(0, (ticket.heat_priority ?? 3) - 1))}
                    className="p-1 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                    disabled={!canManage}
                  >
                    <Snowflake className="h-4 w-4 text-blue-400" />
                  </button>
                  <div className="flex-1">
                    <Slider
                      value={[ticket.heat_priority ?? 3]}
                      min={0}
                      max={12}
                      step={1}
                      onValueChange={(v) => handleFieldUpdate('heat_priority', v[0])}
                      className="w-full"
                      disabled={!canManage}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFieldUpdate('heat_priority', Math.min(12, (ticket.heat_priority ?? 3) + 1))}
                    className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    disabled={!canManage}
                  >
                    <Flame className="h-4 w-4 text-red-500" />
                  </button>
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
                  <div className="flex justify-end">
                    <Button onClick={handleAddComment} disabled={!newComment.trim() || addComment.isPending} size="sm">
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Envoyer
                    </Button>
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
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
