/**
 * Drawer de détail d'un ticket Apogée - Version restructurée
 * Une seule page principale + onglet Documents joints
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileManager } from '@/components/files/FileManager';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
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
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Upload,
  FileText,
  Download,
  Trash2,
  Sparkles,
  CheckCircle2,
  Flame,
  Snowflake,
  History,
  GitBranch,
  Pencil,
  X,
  Check,
  Maximize2,
  Minimize2,
  Mail,
  Loader2,
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
import { useMyTicketRole, useAllowedTransitions, useTicketHistory } from '../hooks/useTicketPermissions';
import { TicketTimelineTab } from './TicketTimelineTab';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { TagSelector } from './TagSelector';
import { RoadmapEditor } from './RoadmapEditor';
import { TicketSupportExchanges } from './TicketSupportExchanges';
import { QuickReplyMenu } from './QuickReplyMenu';
import { PecButton } from './PecButton';
import type { ApogeeTicket, ApogeeModule, ApogeePriority, ApogeeTicketStatus, AuthorType, ReportedBy } from '../types';

interface TicketDetailDrawerProps {
  ticket: ApogeeTicket | null;
  open: boolean;
  onClose: () => void;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  statuses: ApogeeTicketStatus[];
  onUpdate: (updates: Partial<ApogeeTicket> & { id: string }) => void;
  onDelete?: (id: string) => void;
  // Navigation entre tickets
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const AUTHOR_COLORS: Record<AuthorType, string> = {
  HC: 'bg-helpconfort-blue text-white',
  APOGEE: 'bg-purple-600 text-white',
};

// Options pour le champ Origine (ReportedBy)
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
  const { user, isAdmin, isSupport } = useAuth();
  const { data: roleInfo } = useMyTicketRole();
  const canManage = roleInfo?.canManage ?? false;
  const isDeveloper = roleInfo?.ticketRole === 'developer';
  // Developers can edit h_min/h_max and owner_side even without canManage
  const canEditDevFields = canManage || isDeveloper;
  
  // Transitions autorisées selon le rôle
  const { data: allowedTransitions = [] } = useAllowedTransitions(ticket?.kanban_status || '');
  const markAsViewed = useMarkTicketAsViewed();
  const { comments, addComment, updateComment } = useApogeeTicket(ticket?.id || null);
  
  // Compter les fichiers directement depuis le storage (même source que FileManager)
  const storagePath = ticket?.id || '';
  const { data: filesCount = 0 } = useQuery({
    // IMPORTANT: clé différente de FileManager pour éviter collision de cache (count = number vs liste = FileItem[])
    queryKey: ['files-count', 'apogee-ticket-attachments', storagePath],
    queryFn: async () => {
      if (!storagePath) return 0;
      const { data, error } = await supabase.storage
        .from('apogee-ticket-attachments')
        .list(storagePath);
      if (error) return 0;
      // Filtrer les placeholders et dossiers vides
      const realFiles = (data || []).filter(f => 
        f.name && !f.name.startsWith('.') && f.id
      );
      return realFiles.length;
    },
    enabled: !!ticket?.id,
  });
  const [newComment, setNewComment] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSendingCommentEmail, setIsSendingCommentEmail] = useState(false);

  // Auto-déterminer le type d'auteur selon le rôle
  // Developer = APOGEE, Tester/Franchiseur = HC
  const autoCommentType: AuthorType = isDeveloper ? 'APOGEE' : 'HC';

  // Draft persistence in localStorage
  const draftKey = ticket?.id ? `ticket-draft-${ticket.id}` : null;

  // Load draft from localStorage when ticket changes
  useEffect(() => {
    if (draftKey && open) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setNewComment(savedDraft);
      }
    }
    // Reset comment when switching tickets
    if (!open) {
      setNewComment('');
      setEditingCommentId(null);
      setEditingCommentBody('');
      setIsExpanded(false);
    }
  }, [draftKey, open]);

  // Save draft to localStorage on change
  useEffect(() => {
    if (draftKey && open) {
      if (newComment.trim()) {
        localStorage.setItem(draftKey, newComment);
      } else {
        localStorage.removeItem(draftKey);
      }
    }
  }, [newComment, draftKey, open]);

  // Marquer le ticket comme vu à l'ouverture + désactiver l'urgence support si agent
  useEffect(() => {
    if (open && ticket?.id) {
      markAsViewed.mutate(ticket.id);
      
      // Si agent support ouvre un ticket urgent, désactiver le clignotement rouge et logger l'action
      if ((isSupport || isAdmin) && ticket.is_urgent_support === true && user?.id) {
        supabase
          .from('apogee_tickets')
          .update({ is_urgent_support: false })
          .eq('id', ticket.id)
          .then(async ({ error }) => {
            if (!error) {
              // Mettre à jour le ticket localement pour éviter le clignotement persistant
              onUpdate({ id: ticket.id, is_urgent_support: false });
              
              // Récupérer le nom de l'agent depuis le profil
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', user.id)
                .single();
              
              const agentName = profile?.first_name && profile?.last_name 
                ? `${profile.first_name} ${profile.last_name}` 
                : (user.email || 'Agent support');
              
              // Logger dans l'historique que le ticket a été vu par un agent support
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

  // États locaux pour les champs éditables (évite les re-render à chaque frappe)
  const [localTitle, setLocalTitle] = useState(ticket?.element_concerne || '');
  const [localDescription, setLocalDescription] = useState(ticket?.description || '');
  const [localHMin, setLocalHMin] = useState(ticket?.h_min?.toString() || '');
  const [localHMax, setLocalHMax] = useState(ticket?.h_max?.toString() || '');

  // Synchroniser les états locaux quand le ticket change (ID ou données)
  useEffect(() => {
    if (ticket) {
      setLocalTitle(ticket.element_concerne || '');
      setLocalDescription(ticket.description || '');
      setLocalHMin(ticket.h_min?.toString() || '');
      setLocalHMax(ticket.h_max?.toString() || '');
    }
  }, [ticket?.id, ticket?.element_concerne, ticket?.description, ticket?.h_min, ticket?.h_max]);

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

  // Statuts disponibles pour le sélecteur (filtrer selon permissions)
  const availableStatuses = useMemo(() => {
    if (isAdmin) return statuses;
    if (!ticket) return statuses;
    // Inclure le statut actuel + les transitions autorisées
    return statuses.filter(s => 
      s.id === ticket.kanban_status || 
      allowedTransitions.includes(s.id)
    );
  }, [statuses, ticket, isAdmin, allowedTransitions]);

  // Couleur du statut actuel
  const currentStatusColor = useMemo(() => {
    const status = statuses.find(s => s.id === ticket?.kanban_status);
    return status?.color || '#6b7280';
  }, [statuses, ticket?.kanban_status]);

  // Early return MUST be after all hooks
  if (!ticket) return null;

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
    if (draftKey) localStorage.removeItem(draftKey);
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

  const startEditComment = (comment: typeof comments[0]) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentBody('');
  };

  const handleFieldUpdate = (field: string, value: any) => {
    onUpdate({ id: ticket.id, [field]: value });
  };

  // Gestion du changement de statut avec contrôle des transitions
  const handleStatusChange = (newStatus: string) => {
    if (!ticket) return;
    
    const isAllowed = isAdmin || allowedTransitions.includes(newStatus);
    if (!isAllowed && newStatus !== ticket.kanban_status) {
      errorToast("Vous n'êtes pas autorisé à effectuer cette transition");
      return;
    }
    
    // Le logging est géré par la mutation centrale appelée via onUpdate
    // (évite les doublons dans l'historique)
    handleFieldUpdate('kanban_status', newStatus);
  };

  // Formater la référence ticket
  const ticketRef = `APO-${String(ticket.ticket_number || 0).padStart(3, '0')}`;

  // Note: handleFileUpload removed - FileManager handles uploads directly

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent 
        className={`w-full overflow-hidden flex flex-col p-0 transition-all duration-300 ${isExpanded ? 'sm:max-w-6xl' : 'sm:max-w-3xl'}`}
        hideCloseButton
      >
        {/* Header fixe */}
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            {/* Boutons gauche: Agrandir + Fermer */}
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Réduire le panneau" : "Agrandir le panneau"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 space-y-2">
              {/* Référence ticket */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-sm font-semibold">
                  {ticketRef}
                </Badge>
              </div>
              
              {/* Badges de statut */}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={ticket.kanban_status}
                  onValueChange={handleStatusChange}
                  disabled={!canManage}
                >
                  <SelectTrigger 
                    className="h-9 w-auto min-w-[140px] text-sm font-medium gap-2"
                    style={{ 
                      backgroundColor: `${currentStatusColor}20`,
                      borderColor: currentStatusColor
                    }}
                  >
                    <GitBranch className="h-4 w-4" style={{ color: currentStatusColor }} />
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
                  <Badge className="bg-blue-500 text-white">
                    {ticket.apogee_modules?.label || ticket.module}
                  </Badge>
                )}
                <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
                {ticket.owner_side && (
                  <Badge variant="outline">{ticket.owner_side}</Badge>
                )}
                {ticket.needs_completion && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    À compléter
                  </Badge>
                )}
              </div>
              
              {/* Qualification IA */}
              <div className="flex flex-wrap items-center gap-2">
                {ticket.is_qualified ? (
                  <>
                    <Badge className="bg-green-600 text-white flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Qualifié
                    </Badge>
                    {ticket.ticket_type && (
                      <Badge variant="outline" className="capitalize">
                        {ticket.ticket_type}
                      </Badge>
                    )}
                    {ticket.theme && (
                      <Badge variant="secondary" className="text-xs">
                        {ticket.theme}
                      </Badge>
                    )}
                  </>
                ) : null}
              </div>
            </div>
            
            {/* Navigation + Suppression */}
            <div className="flex flex-col items-end gap-1">
              {/* Navigation entre tickets */}
              {(onNavigatePrevious || onNavigateNext) && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={onNavigatePrevious}
                    disabled={!hasPrevious}
                    title="Ticket précédent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={onNavigateNext}
                    disabled={!hasNext}
                    title="Ticket suivant"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Bouton supprimer - en dessous de la navigation */}
              {onDelete && canManage && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                      title="Supprimer le ticket"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="text-xs">Supprimer</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce ticket ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le ticket "{ticket.element_concerne.slice(0, 50)}..." sera définitivement supprimé.
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
            </div>
          </div>
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

                {/* PARAMÈTRES en ligne */}
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
                      // Ticket créé depuis le support: affichage badge spécial
                      <div className="h-9 mt-1 px-3 py-2 rounded-md border bg-purple-50 text-sm flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                          📩 Support
                        </span>
                        {ticket.reported_by && <span className="text-muted-foreground">• {ticket.reported_by}</span>}
                      </div>
                    ) : ticket.created_from === 'email' ? (
                      // Ticket créé depuis un email: affichage badge email + expéditeur
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
                      // Ticket créé manuellement: affichage en lecture seule
                      <div className="h-9 mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm">
                        {ticket.reported_by || '—'}
                      </div>
                    ) : (
                      // Ticket importé: sélecteur modifiable
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
                          if (newValue !== ticket.h_min) {
                            handleFieldUpdate('h_min', newValue);
                          }
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
                          if (newValue !== ticket.h_max) {
                            handleFieldUpdate('h_max', newValue);
                          }
                        }}
                        className="h-9"
                        min={0}
                        step={0.5}
                        disabled={!canEditDevFields}
                      />
                    </div>
                  </div>
                </div>

                {/* PRIORITÉ */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Flame className="h-4 w-4" />
                    Priorité
                  </label>
                  <div className="mt-2 flex items-center gap-4">
                    <HeatPriorityBadge priority={ticket.heat_priority} size="default" showLabel />
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = Math.max(0, (ticket.heat_priority ?? 3) - 1);
                        onUpdate({ id: ticket.id, heat_priority: newValue });
                      }}
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
                      onClick={() => {
                        const newValue = Math.min(12, (ticket.heat_priority ?? 3) + 1);
                        onUpdate({ id: ticket.id, heat_priority: newValue });
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Augmenter la priorité"
                      disabled={!canManage}
                    >
                      <Flame className="h-5 w-5 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* PORTEUR DU PROJET */}
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
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tags
                  </label>
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
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Roadmap
                  </label>
                  <div className="mt-2">
                    <RoadmapEditor
                      enabled={ticket.roadmap_enabled}
                      month={ticket.roadmap_month}
                      year={ticket.roadmap_year}
                      onChange={(enabled, month, year) => {
                        onUpdate({
                          id: ticket.id,
                          roadmap_enabled: enabled,
                          roadmap_month: month,
                          roadmap_year: year,
                        });
                      }}
                      disabled={!canManage}
                    />
                  </div>
                </div>

                {/* QUALIFICATION IA */}
                {ticket.is_qualified && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Qualification IA
                      </label>
                      <div className="mt-2 space-y-3">
                        {/* Notes internes */}
                        {ticket.notes_internes && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Notes internes</p>
                            <p className="text-sm whitespace-pre-wrap">{ticket.notes_internes}</p>
                          </div>
                        )}
                        {/* Infos qualification */}
                        <p className="text-xs text-muted-foreground">
                          Qualifié le {ticket.qualified_at && format(new Date(ticket.qualified_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </>
                )}

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
                    <div className="flex gap-2 items-start">
                      <Badge className={autoCommentType === 'HC' ? 'bg-helpconfort-blue text-white' : 'bg-purple-600 text-white'}>
                        {autoCommentType === 'HC' ? 'HC' : 'Apogée'}
                      </Badge>
                      <Textarea
                        placeholder="Ajouter un commentaire..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                        className="flex-1 resize-none"
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

                  {/* Liste des commentaires */}
                  <div className="space-y-3">
                    {visibleComments.map((comment) => {
                      const isEditing = editingCommentId === comment.id;
                      const canEdit = comment.created_by_user_id === user?.id;
                      
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
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEditComment}
                                  >
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

          {/* Onglet Timeline - Historique complet */}
          <TicketTimelineTab ticketId={ticket.id} statuses={statuses} />

          {/* Onglet Historique Qualification */}
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

          {/* Onglet Documents */}
          <TabsContent value="documents" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6">
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

          {/* Onglet Échanges Support */}
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
