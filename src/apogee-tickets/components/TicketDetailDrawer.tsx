/**
 * Drawer de détail d'un ticket Apogée - Version restructurée
 * Une seule page principale + onglet Documents joints
 * 
 * P3: Header and Comments sections extracted into ticket-detail/ sub-components
 */

import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  Send, ChevronDown, Paperclip, Flame, Snowflake, History, GitBranch 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApogeeTicket } from '../hooks/useApogeeTickets';
import { supabase } from '@/integrations/supabase/client';
import { useMarkTicketAsViewed } from '../hooks/useTicketViews';
import { HeatPriorityBadge } from './HeatPriorityBadge';
import { OwnerSideSlider, ownerSideToSliderValue, sliderValueToOwnerSide } from './OwnerSideSlider';
import { Slider } from '@/components/ui/slider';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useMyTicketRole, useAllowedTransitions } from '../hooks/useTicketPermissions';
import { TicketTimelineTab } from './TicketTimelineTab';
import { TicketAttachmentsManager } from './TicketAttachmentsManager';
import { errorToast } from '@/lib/toastHelpers';
import { TagSelector } from './TagSelector';
import { RoadmapEditor } from './RoadmapEditor';
import { TicketSupportExchanges } from './TicketSupportExchanges';
import { useTicketAttachments } from '../hooks/useTicketAttachments';
import { ORIGINE_OPTIONS } from './ticket-detail/constants';
import { TicketDrawerHeader } from './ticket-detail/TicketDrawerHeader';
import { TicketCommentsSection } from './ticket-detail/TicketCommentsSection';
import type { ApogeeTicket, ApogeeModule, ApogeePriority, ApogeeTicketStatus, AuthorType } from '../types';

interface TicketDetailDrawerProps {
  ticket: ApogeeTicket | null;
  open: boolean;
  onClose: () => void;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  statuses: ApogeeTicketStatus[];
  onUpdate: (updates: Partial<ApogeeTicket> & { id: string }) => void;
  onDelete?: (id: string) => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function TicketDetailDrawer({
  ticket,
  open,
  onClose,
  modules,
  priorities,
  statuses,
  onUpdate,
  onDelete,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
}: TicketDetailDrawerProps) {
  const { user } = useAuthCore();
  const { isAdmin, isSupport } = usePermissions();
  const { data: roleInfo } = useMyTicketRole();
  const canManage = roleInfo?.canManage ?? false;
  const isDeveloper = roleInfo?.ticketRole === 'developer';
  const canEditDevFields = canManage || isDeveloper;
  
  const { data: allowedTransitions = [] } = useAllowedTransitions(ticket?.kanban_status || '');
  const markAsViewed = useMarkTicketAsViewed();
  const { comments, addComment, updateComment } = useApogeeTicket(ticket?.id || null);
  const { attachments } = useTicketAttachments(ticket?.id || null);
  const filesCount = attachments.length;

  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const autoCommentType: AuthorType = isDeveloper ? 'APOGEE' : 'HC';
  const draftKey = ticket?.id ? `ticket-draft-${ticket.id}` : null;

  // Draft persistence
  useEffect(() => {
    if (draftKey && open) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) setNewComment(savedDraft);
    }
    if (!open) {
      setNewComment('');
      setIsExpanded(false);
    }
  }, [draftKey, open]);

  useEffect(() => {
    if (draftKey && open) {
      if (newComment.trim()) {
        localStorage.setItem(draftKey, newComment);
      } else {
        localStorage.removeItem(draftKey);
      }
    }
  }, [newComment, draftKey, open]);

  // Mark as viewed + disable urgent flag
  useEffect(() => {
    if (open && ticket?.id) {
      markAsViewed.mutate(ticket.id);
      
      if ((isSupport || isAdmin) && ticket.is_urgent_support === true && user?.id) {
        supabase
          .from('apogee_tickets')
          .update({ is_urgent_support: false })
          .eq('id', ticket.id)
          .then(async ({ error }) => {
            if (!error) {
              onUpdate({ id: ticket.id, is_urgent_support: false });
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
    }
  }, [open, ticket?.id, ticket?.is_urgent_support, isSupport, isAdmin, user?.id]);

  // Local editable field states
  const [localTitle, setLocalTitle] = useState(ticket?.element_concerne || '');
  const [localDescription, setLocalDescription] = useState(ticket?.description || '');
  const [localHMin, setLocalHMin] = useState(ticket?.h_min?.toString() || '');
  const [localHMax, setLocalHMax] = useState(ticket?.h_max?.toString() || '');

  useEffect(() => {
    if (ticket) {
      setLocalTitle(ticket.element_concerne || '');
      setLocalDescription(ticket.description || '');
      setLocalHMin(ticket.h_min?.toString() || '');
      setLocalHMax(ticket.h_max?.toString() || '');
    }
  }, [ticket?.id, ticket?.element_concerne, ticket?.description, ticket?.h_min, ticket?.h_max]);

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [comments]);

  const availableStatuses = useMemo(() => {
    if (isAdmin) return statuses;
    if (!ticket) return statuses;
    return statuses.filter(s => 
      s.id === ticket.kanban_status || 
      allowedTransitions.includes(s.id)
    );
  }, [statuses, ticket, isAdmin, allowedTransitions]);

  const currentStatusColor = useMemo(() => {
    const status = statuses.find(s => s.id === ticket?.kanban_status);
    return status?.color || '#6b7280';
  }, [statuses, ticket?.kanban_status]);

  if (!ticket) return null;

  const handleFieldUpdate = (field: string, value: any) => {
    onUpdate({ id: ticket.id, [field]: value });
  };

  const handleStatusChange = (newStatus: string) => {
    if (!ticket) return;
    const isAllowed = isAdmin || allowedTransitions.includes(newStatus);
    if (!isAllowed && newStatus !== ticket.kanban_status) {
      errorToast("Vous n'êtes pas autorisé à effectuer cette transition");
      return;
    }
    handleFieldUpdate('kanban_status', newStatus);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent 
        className={`w-full overflow-hidden flex flex-col p-0 transition-all duration-300 ${isExpanded ? 'sm:max-w-6xl' : 'sm:max-w-3xl'}`}
        hideCloseButton
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b">
          <TicketDrawerHeader
            ticket={ticket}
            statuses={statuses}
            availableStatuses={availableStatuses}
            currentStatusColor={currentStatusColor}
            canManage={canManage}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
            onClose={onClose}
            onStatusChange={handleStatusChange}
            onDelete={onDelete}
            onNavigatePrevious={onNavigatePrevious}
            onNavigateNext={onNavigateNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
        </SheetHeader>

        <Tabs defaultValue="main" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-2 w-auto justify-start">
            <TabsTrigger value="main">Ticket</TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1">
              <History className="h-3 w-3" />
              Historique
            </TabsTrigger>
            {ticket.is_qualified && ticket.original_title && (
              <TabsTrigger value="history" className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                Qualif. IA
              </TabsTrigger>
            )}
            <TabsTrigger value="documents" className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              Documents ({filesCount})
            </TabsTrigger>
            {ticket.support_initiator_user_id && (
              <TabsTrigger value="support-exchanges" className="flex items-center gap-1">
                <Send className="h-3 w-3" />
                Échanges Support
              </TabsTrigger>
            )}
          </TabsList>

          {/* Main Tab */}
          <TabsContent value="main" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* TITLE */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Titre / Élément concerné
                  </label>
                  <Textarea
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={() => {
                      if (localTitle !== ticket.element_concerne) {
                        handleFieldUpdate('element_concerne', localTitle);
                      }
                    }}
                    rows={2}
                    className="mt-1 text-lg font-semibold resize-none"
                    disabled={!canManage}
                  />
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </label>
                  <Textarea
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    onBlur={() => {
                      if (localDescription !== (ticket.description || '')) {
                        handleFieldUpdate('description', localDescription || null);
                      }
                    }}
                    rows={6}
                    placeholder="Décrivez le ticket en détail."
                    className="mt-1 resize-none"
                    disabled={!canManage}
                  />
                </div>

                {/* PARAMETERS */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Module</label>
                    <Select
                      value={ticket.module || ''}
                      onValueChange={(v) => handleFieldUpdate('module', v || null)}
                      disabled={!canManage}
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
                    <label className="text-xs text-muted-foreground">Origine</label>
                    {ticket.created_from === 'support' ? (
                      <div className="h-9 mt-1 px-3 py-2 rounded-md border bg-purple-50 text-sm flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                          📩 Support
                        </span>
                        {ticket.reported_by && <span className="text-muted-foreground">• {ticket.reported_by}</span>}
                      </div>
                    ) : ticket.created_from === 'email' ? (
                      <div className="h-auto mt-1 px-3 py-2 rounded-md border bg-teal-50 text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                            📧 Email
                          </span>
                        </div>
                        {ticket.initiator_profile?.email && (
                          <div className="text-xs text-muted-foreground">
                            De: <a href={`mailto:${ticket.initiator_profile.email}`} className="hover:underline text-teal-700">{ticket.initiator_profile.first_name ? `${ticket.initiator_profile.first_name} <${ticket.initiator_profile.email}>` : ticket.initiator_profile.email}</a>
                          </div>
                        )}
                      </div>
                    ) : ticket.created_from === 'MANUAL' ? (
                      <div className="h-9 mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm">
                        {ticket.reported_by || '—'}
                      </div>
                    ) : (
                      <Select
                        value={ticket.reported_by || ''}
                        onValueChange={(v) => handleFieldUpdate('reported_by', v || null)}
                        disabled={!canManage}
                      >
                        <SelectTrigger className="h-9 mt-1">
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
                  <div>
                    <label className="text-xs text-muted-foreground">Estimation (h)</label>
                    <div className="flex gap-1 mt-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={localHMin}
                        onChange={(e) => setLocalHMin(e.target.value)}
                        onBlur={() => {
                          const newValue = localHMin ? parseFloat(localHMin) : null;
                          if (newValue !== ticket.h_min) handleFieldUpdate('h_min', newValue);
                        }}
                        className="h-9"
                        min={0}
                        step={0.5}
                        disabled={!canEditDevFields}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={localHMax}
                        onChange={(e) => setLocalHMax(e.target.value)}
                        onBlur={() => {
                          const newValue = localHMax ? parseFloat(localHMax) : null;
                          if (newValue !== ticket.h_max) handleFieldUpdate('h_max', newValue);
                        }}
                        className="h-9"
                        min={0}
                        step={0.5}
                        disabled={!canEditDevFields}
                      />
                    </div>
                  </div>
                </div>

                {/* PRIORITY */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Flame className="h-4 w-4" />
                    Priorité
                  </label>
                  <div className="mt-2 flex items-center gap-4">
                    <HeatPriorityBadge priority={ticket.heat_priority} size="default" showLabel />
                    <button
                      type="button"
                      onClick={() => onUpdate({ id: ticket.id, heat_priority: Math.max(0, (ticket.heat_priority ?? 3) - 1) })}
                      className="p-1 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Diminuer la priorité"
                      disabled={!canManage}
                    >
                      <Snowflake className="h-5 w-5 text-blue-400" />
                    </button>
                    <div className="flex-1">
                      <Slider
                        value={[ticket.heat_priority ?? 3]}
                        min={0}
                        max={12}
                        step={1}
                        onValueChange={(v) => onUpdate({ id: ticket.id, heat_priority: v[0] })}
                        className="w-full"
                        trackClassName="bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500"
                        rangeClassName="bg-transparent"
                        disabled={!canManage}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdate({ id: ticket.id, heat_priority: Math.min(12, (ticket.heat_priority ?? 3) + 1) })}
                      className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Augmenter la priorité"
                      disabled={!canManage}
                    >
                      <Flame className="h-5 w-5 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* OWNER SIDE */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Porteur du projet
                  </label>
                  <div className="mt-2">
                    <OwnerSideSlider
                      value={ownerSideToSliderValue(ticket.owner_side)}
                      onChange={(v) => handleFieldUpdate('owner_side', sliderValueToOwnerSide(v))}
                      disabled={!canEditDevFields}
                    />
                  </div>
                </div>

                {/* TAGS */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</label>
                  <div className="mt-2">
                    <TagSelector
                      selectedTags={ticket.impact_tags || []}
                      onTagsChange={(tags) => handleFieldUpdate('impact_tags', tags)}
                      disabled={!canManage}
                    />
                  </div>
                </div>

                {/* ROADMAP */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Roadmap</label>
                  <div className="mt-2">
                    <RoadmapEditor
                      enabled={ticket.roadmap_enabled}
                      month={ticket.roadmap_month}
                      year={ticket.roadmap_year}
                      onChange={(enabled, month, year) => {
                        onUpdate({ id: ticket.id, roadmap_enabled: enabled, roadmap_month: month, roadmap_year: year });
                      }}
                      disabled={!canManage}
                    />
                  </div>
                </div>

                {/* AI QUALIFICATION */}
                {ticket.is_qualified && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Qualification IA
                      </label>
                      <div className="mt-2 space-y-3">
                        {ticket.notes_internes && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Notes internes</p>
                            <p className="text-sm whitespace-pre-wrap">{ticket.notes_internes}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Qualifié le {ticket.qualified_at && format(new Date(ticket.qualified_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* COMMENTS — Extracted */}
                <TicketCommentsSection
                  ticketId={ticket.id}
                  ticketNumber={ticket.ticket_number}
                  ticketElementConcerne={ticket.element_concerne}
                  ticketCreatedFrom={ticket.created_from}
                  ticketInitiatorProfile={ticket.initiator_profile}
                  ticketReportedBy={ticket.reported_by}
                  comments={comments}
                  sortedComments={sortedComments}
                  currentUserId={user?.id}
                  currentUserEmail={user?.email}
                  autoCommentType={autoCommentType}
                  newComment={newComment}
                  onNewCommentChange={setNewComment}
                  draftKey={draftKey}
                  addComment={addComment}
                  updateComment={updateComment}
                />

                {/* Excel source info */}
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

          {/* Timeline Tab */}
          <TicketTimelineTab ticketId={ticket.id} statuses={statuses} />

          {/* AI Qualification History Tab */}
          {ticket.is_qualified && ticket.original_title && (
            <TabsContent value="history" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-700 mb-4">
                      Textes originaux avant requalification IA
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Titre original
                        </label>
                        <p className="mt-1 p-3 bg-background border rounded-md text-sm">
                          {ticket.original_title || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Description originale
                        </label>
                        <p className="mt-1 p-3 bg-background border rounded-md text-sm whitespace-pre-wrap">
                          {ticket.original_description || '—'}
                        </p>
                      </div>
                    </div>
                    {ticket.qualified_at && (
                      <p className="text-xs text-amber-600 mt-4">
                        Qualifié le {format(new Date(ticket.qualified_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {/* Documents Tab */}
          <TabsContent value="documents" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                <TicketAttachmentsManager ticketId={ticket.id} />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Support Exchanges Tab */}
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
      </SheetContent>
    </Sheet>
  );
}
