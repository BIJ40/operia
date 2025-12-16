import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersistedTab } from '@/hooks/usePersistedTab';
import { useSessionState } from '@/hooks/useSessionState';
import { useAdminTickets } from '@/hooks/use-admin-tickets';
import { Ticket } from '@/hooks/use-user-tickets';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TicketCategoryBadge } from '@/components/tickets/TicketCategoryBadge';
import { ServiceBadge } from '@/components/tickets/ServiceBadge';
import { HeatPriorityBadge } from '@/components/support/HeatPriorityBadge';
import { Loader2, Send, Download, AlertCircle, Clock, CheckCircle2, User, LayoutGrid, List, TicketPlus, MessageSquare, XCircle, Trash2, Monitor, Headphones, Kanban } from 'lucide-react';
import { useTransformToProjectTicket } from '@/hooks/admin-tickets/useTransformToProjectTicket';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { EscalateTicketDialog } from '@/components/admin/support/EscalateTicketDialog';
import { KanbanView } from '@/components/admin/support/KanbanView';
import { SupportLevelBadge } from '@/components/SupportLevelBadge';
import { ROUTES } from '@/config/routes';
import { ScreenShareSession } from '@/components/support/ScreenShareSession';
import { AgentUnifiedChat } from '@/components/admin/support/AgentUnifiedChat';
import { useSupportNotifications } from '@/hooks/use-support-notifications';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function AdminSupportTickets() {
  const { canManageTickets, user, globalRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    tickets,
    selectedTicket,
    setSelectedTicket,
    attachments,
    messages,
    isLoading,
    filters,
    setFilters,
    loadTickets,
    supportUsers,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    takeTicket,
    addSupportMessage,
    downloadAttachment,
    reopenTicket,
    escalateTicket,
    convertChatToTicket,
    takeOverChat,
    getStats,
    deleteTicket,
  } = useAdminTickets();

  const canDelete = globalRole === 'platform_admin' || globalRole === 'superadmin';
  
  // Hook pour les notifications et compteur de chat live
  const { liveChatCount } = useSupportNotifications();
  
  // Hook pour transformer en ticket projet
  const { transformToProjectTicket, isTransforming } = useTransformToProjectTicket();

  const [newMessage, setNewMessage] = useState('');
  const [viewMode, setViewMode] = useSessionState<'list' | 'kanban'>('support-view-mode', 'list');
  const [activeTab, setActiveTab] = usePersistedTab('actifs');
  const [isKanbanCollapsed, setIsKanbanCollapsed] = useSessionState<boolean>('support-kanban-collapsed', false);
  const [showScreenShare, setShowScreenShare] = useState(false);

  // Auto-switch to archives tab when selected ticket becomes resolved
  useEffect(() => {
    if (selectedTicket && ['resolved', 'closed'].includes(selectedTicket.status)) {
      setActiveTab('archives');
    }
  }, [selectedTicket?.status]);

  // Transformer supportUsers pour le format attendu par les composants
  const formattedSupportUsers = supportUsers.map(u => {
    const modules = u.enabled_modules as any;
    const options = modules?.support?.options || {};
    return {
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      first_name: u.first_name,
      last_name: u.last_name,
      // V2: Utiliser profiles.support_level avec fallback sur options.level
      support_level: (u as any).support_level ?? options.level ?? 1,
      service_competencies: options.skills ? 
        options.skills.reduce((acc: any, skill: string) => ({ ...acc, [skill]: true }), {}) : {},
    };
  });

  const getCardClassName = (status: string) => {
    const isActive = filters.status === status;
    return `cursor-pointer transition-all ${
      isActive 
        ? 'shadow-xl ring-2 ring-primary scale-105' 
        : 'hover:shadow-lg'
    }`;
  };

  const hasActiveFilters = () => {
    return filters.status !== 'all' || 
           filters.source !== 'all' || 
           filters.category !== 'all' || 
           filters.agency !== 'all' ||
           filters.heatPriorityMin > 0 ||
           filters.heatPriorityMax < 12 ||
           filters.assignment !== 'all';
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      source: 'all',
      category: 'all',
      agency: 'all',
      heatPriorityMin: 0,
      heatPriorityMax: 12,
      assignment: 'all',
    });
  };

  // Appliquer le filtre depuis la navigation header si présent
  useEffect(() => {
    const state = location.state as { filterStatus?: string } | null;
    if (state?.filterStatus) {
      setFilters(prev => ({ ...prev, status: state.filterStatus as any }));
      // Nettoyer le state pour éviter de réappliquer le filtre
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    if (!canManageTickets) {
      navigate('/');
    }
  }, [canManageTickets, navigate]);

  const stats = getStats();

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !user) return;
    
    await addSupportMessage(selectedTicket.id, newMessage, user.id);
    setNewMessage('');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock; className?: string }> = {
      new: { label: 'Nouveau', variant: 'default', icon: Clock, className: 'bg-blue-500 text-white' },
      in_progress: { label: 'En cours', variant: 'secondary', icon: AlertCircle, className: 'bg-orange-500 text-white' },
      waiting_user: { label: 'Att. user', variant: 'outline', icon: MessageSquare, className: 'bg-yellow-500 text-white' },
      resolved: { label: 'Résolu', variant: 'outline', icon: CheckCircle2, className: 'bg-green-500 text-white' },
      closed: { label: 'Fermé', variant: 'outline', icon: XCircle, className: 'bg-gray-500 text-white' },
    };
    const config = variants[status] || variants.new;
    const Icon = config.icon;
    return (
      <Badge className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Removed getPriorityBadge - now using HeatPriorityBadge component

  const getDemandTypeBadge = (ticket: Ticket) => {
    const isArchived = ['resolved', 'closed'].includes(ticket.status);

    switch (ticket.type) {
      case 'chat_ai':
        return (
          <Badge className="bg-blue-500 text-white">
            🟦 Chat IA
          </Badge>
        );
      case 'chat_human':
        return (
          <Badge className={`bg-green-500 text-white ${isArchived ? '' : 'animate-pulse'}`}>
            🟩 Chat Humain
          </Badge>
        );
      case 'ticket':
      default:
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
            🟧 Ticket
          </Badge>
        );
    }
  };

  if (!canManageTickets) {
    return null;
  }

  return (
    <div>
      <div className="space-y-4">
          {/* Barre de filtres horizontale avec boutons vue */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue>
                  {filters.category === 'all' ? 'Catégorie' : 
                   filters.category === 'bug' ? 'Bug' :
                   filters.category === 'improvement' ? 'Amélioration' :
                   filters.category === 'blocking' ? 'Blocage' :
                   filters.category === 'question' ? 'Question' : 'Autre'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="improvement">Amélioration</SelectItem>
                <SelectItem value="blocking">Blocage</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.source} onValueChange={(v) => setFilters({ ...filters, source: v })}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue>
                  {filters.source === 'all' ? 'Type' : 
                   filters.source === 'chat_ai' ? '🟦 Chat IA' :
                   filters.source === 'chat_human' ? '🟩 Chat Humain' : '🟧 Ticket'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="chat_ai">🟦 Chat IA</SelectItem>
                <SelectItem value="chat_human">🟩 Chat Humain</SelectItem>
                <SelectItem value="ticket">🟧 Ticket</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Heat: {filters.heatPriorityMin}-{filters.heatPriorityMax}</span>
            </div>

            <Select value={filters.assignment} onValueChange={(v) => setFilters({ ...filters, assignment: v })}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue>
                  {filters.assignment === 'all' ? 'Assignation' : 
                   filters.assignment === 'mine' ? '📌 Mes tickets' : '⏳ Non assignés'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="mine">📌 Mes tickets</SelectItem>
                <SelectItem value="unassigned">⏳ Non assignés</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters() && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs gap-1">
                <AlertCircle className="w-3 h-3" />
                Réinitialiser
              </Button>
            )}

            <div className="flex-1" />

            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-1 h-8"
            >
              <List className="w-4 h-4" />
              Liste
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-1 h-8"
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </Button>
          </div>

          {/* Stats Dashboard - ligne unique compacte */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <div 
              className={`group rounded-xl p-3 cursor-pointer transition-all duration-300
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
                border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue
                shadow-sm hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5
                ${filters.status === 'all' ? 'ring-2 ring-primary shadow-xl scale-105' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'all' })}
            >
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-bold">{stats.total}</div>
            </div>
            <div 
              className={`group rounded-xl p-3 cursor-pointer transition-all duration-300
                bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
                border border-helpconfort-blue/20 border-l-4 border-l-blue-500
                shadow-sm hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5
                ${filters.status === 'new' ? 'ring-2 ring-primary shadow-xl scale-105' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'new' })}
            >
              <div className="text-xs text-muted-foreground">Nouveaux</div>
              <div className="text-xl font-bold text-blue-600">{stats.newTickets}</div>
            </div>
            <div 
              className={`group rounded-xl p-3 cursor-pointer transition-all duration-300
                bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
                border border-helpconfort-blue/20 border-l-4 border-l-orange-500
                shadow-sm hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5
                ${filters.status === 'waiting_user' ? 'ring-2 ring-primary shadow-xl scale-105' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'waiting_user' })}
            >
              <div className="text-xs text-muted-foreground">Att. user</div>
              <div className="text-xl font-bold text-orange-600">{stats.waitingUser}</div>
            </div>
            <div 
              className={`group rounded-xl p-3 cursor-pointer transition-all duration-300
                bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
                border border-helpconfort-blue/20 border-l-4 border-l-yellow-500
                shadow-sm hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5
                ${filters.status === 'in_progress' ? 'ring-2 ring-primary shadow-xl scale-105' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'in_progress' })}
            >
              <div className="text-xs text-muted-foreground">En cours</div>
              <div className="text-xl font-bold text-yellow-600">{stats.inProgress}</div>
            </div>
            <div 
              className={`group rounded-xl p-3 cursor-pointer transition-all duration-300
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
                border border-helpconfort-blue/20 border-l-4 border-l-green-500
                shadow-sm hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5
                ${filters.status === 'resolved' ? 'ring-2 ring-primary shadow-xl scale-105' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'resolved' })}
            >
              <div className="text-xs text-muted-foreground">Résolus</div>
              <div className="text-xl font-bold text-green-600">{stats.resolved}</div>
            </div>
            <div 
              className={`group rounded-xl p-3 cursor-pointer transition-all duration-300
                bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
                border border-helpconfort-blue/20 border-l-4 border-l-gray-500
                shadow-sm hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5
                ${filters.status === 'closed' ? 'ring-2 ring-primary shadow-xl scale-105' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'closed' })}
            >
              <div className="text-xs text-muted-foreground">Fermés</div>
              <div className="text-xl font-bold text-gray-600">{stats.closed}</div>
            </div>
          </div>

          {viewMode === 'kanban' ? (
            <KanbanView 
              tickets={tickets} 
              onSelectTicket={(ticket) => setSelectedTicket(ticket as any)}
              onTicketsUpdate={() => {}}
              isCollapsed={isKanbanCollapsed}
              onToggleCollapse={() => setIsKanbanCollapsed(!isKanbanCollapsed)}
            />
          ) : (
          <div className="grid gap-6 md:grid-cols-5">
            {/* Tickets List */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'actifs' | 'archives' | 'live')} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-2">
                    <TabsTrigger value="live" className="gap-2 relative">
                      <Headphones className="w-4 h-4" />
                      <span className="hidden sm:inline">Live</span>
                      {liveChatCount > 0 && (
                        <Badge variant="destructive" className="ml-1 animate-pulse">
                          {liveChatCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="actifs" className="gap-2">
                      🔥 <span className="hidden sm:inline">Actifs</span>
                      <Badge variant="secondary" className="ml-1">
                        {tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="archives" className="gap-2">
                      📁 <span className="hidden sm:inline">Archives</span>
                      <Badge variant="outline" className="ml-1">
                        {tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  {/* Onglet Chat Live - Vue unifiée */}
                  <TabsContent value="live" className="mt-2">
                    <AgentUnifiedChat />
                  </TabsContent>

                  <TabsContent value="actifs" className="mt-2">
                    <ScrollArea className="h-[550px]">
                      {isLoading ? (
                        <div className="space-y-3 p-2">
                          {/* P2 FIX: Skeleton loaders instead of spinner */}
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse">
                              <div className="bg-muted rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="h-4 bg-muted-foreground/20 rounded w-24" />
                                  <div className="h-5 bg-muted-foreground/20 rounded w-16" />
                                </div>
                                <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                                <div className="flex gap-2">
                                  <div className="h-5 bg-muted-foreground/20 rounded w-14" />
                                  <div className="h-5 bg-muted-foreground/20 rounded w-20" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucune demande active</p>
                      ) : (
                        <div className="space-y-2">
                          {tickets
                            .filter(t => !['resolved', 'closed'].includes(t.status))
                            .sort((a, b) => {
                              // Chat humain en premier, puis chat IA, puis tickets
                              const typeOrder = { chat_human: 0, chat_ai: 1, ticket: 2 };
                              const aOrder = typeOrder[a.type as keyof typeof typeOrder] ?? 2;
                              const bOrder = typeOrder[b.type as keyof typeof typeOrder] ?? 2;
                              if (aOrder !== bOrder) return aOrder - bOrder;
                              // Puis par date de création (plus récent en premier)
                              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                            })
                            .map((ticket) => {
                              const isWaiting = ticket.status === 'new' && !ticket.assigned_to;
                              const isSelected = selectedTicket?.id === ticket.id;
                              return (
                              <Card
                                key={ticket.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                  isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                                } ${isWaiting ? 'animate-pulse-urgent' : ''}`}
                                onClick={() => setSelectedTicket(ticket)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold truncate">{ticket.subject || 'Sans sujet'}</p>
                                      {ticket.assigned_to && (
                                        <p className="text-xs text-primary font-medium mt-1">
                                          🎯 Assigné: {formattedSupportUsers.find(u => u.id === ticket.assigned_to)?.name || 'Agent'}
                                        </p>
                                      )}
                                    </div>
                                    {getStatusBadge(ticket.status)}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getDemandTypeBadge(ticket)}
                                    <SupportLevelBadge level={ticket.support_level || 1} />
                                    <ServiceBadge service={ticket.service} />
                                    {ticket.category && <TicketCategoryBadge category={ticket.category} />}
                                    <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                  </p>
                                  {ticket.agency_slug && (
                                    <Badge variant="outline" className="mt-2">
                                      {ticket.agency_slug}
                                    </Badge>
                                  )}
                                </CardContent>
                              </Card>
                              );
                            })}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="archives" className="mt-4">
                    <ScrollArea className="h-[550px]">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      ) : tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucune demande archivée</p>
                      ) : (
                        <div className="space-y-2">
                          {tickets
                            .filter(t => ['resolved', 'closed'].includes(t.status))
                            .sort((a, b) => new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime())
                            .map((ticket) => (
                              <Card
                                key={ticket.id}
                                className={`cursor-pointer transition-all hover:shadow-md opacity-75 ${
                                  selectedTicket?.id === ticket.id ? 'border-primary border-2 opacity-100' : ''
                                }`}
                                onClick={() => setSelectedTicket(ticket)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold truncate">{ticket.subject || 'Sans sujet'}</p>
                                    </div>
                                    {getStatusBadge(ticket.status)}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getDemandTypeBadge(ticket)}
                                    <ServiceBadge service={ticket.service} />
                                    {ticket.category && <TicketCategoryBadge category={ticket.category} />}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Clos le {format(new Date(ticket.resolved_at || ticket.created_at), 'dd MMM yyyy', { locale: fr })}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>

            {/* Ticket Detail */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>
                  {selectedTicket ? 'Détail de la demande' : 'Sélectionnez une demande'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedTicket ? (
                  <p className="text-center text-muted-foreground py-8">
                    Sélectionnez une demande dans la liste pour voir les détails
                  </p>
                ) : (
                  <Tabs defaultValue="conversation">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="conversation">Conversation</TabsTrigger>
                      <TabsTrigger value="details">Détails</TabsTrigger>
                      <TabsTrigger value="attachments">
                        Pièces jointes ({attachments.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="conversation" className="space-y-4">
                      {/* Controls */}
                      <div className="flex gap-2 flex-wrap items-center">
                        <EscalateTicketDialog
                          ticket={selectedTicket}
                          supportUsers={formattedSupportUsers}
                          onEscalate={(targetLevel, targetUserId, reason) => 
                            escalateTicket(selectedTicket.id, targetLevel, targetUserId, reason)
                          }
                        />

                        {/* Bouton pour prendre la main sur un chat_ai - seulement si non assigné */}
                        {selectedTicket.type === 'chat_ai' && !selectedTicket.assigned_to && (
                          <Button
                            onClick={() => user && takeOverChat(selectedTicket.id, user.id)}
                            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                          >
                            👋 Prendre la main
                          </Button>
                        )}

                        {/* Bouton pour convertir un chat en ticket */}
                        {(selectedTicket.type === 'chat_ai' || selectedTicket.type === 'chat_human') && (
                          <Button
                            variant="outline"
                            onClick={() => convertChatToTicket(selectedTicket.id)}
                            className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            <TicketPlus className="w-4 h-4" />
                            Convertir en ticket
                          </Button>
                        )}

                        {/* Bouton pour transformer en ticket Développement - grisé si déjà archivé */}
                        <Button
                          variant="outline"
                          onClick={async () => {
                            // 1. Récupérer le nom de l'utilisateur
                            const { data: profile } = await supabase
                              .from('profiles')
                              .select('first_name, last_name')
                              .eq('id', selectedTicket.user_id)
                              .maybeSingle();
                            
                            const userName = profile?.first_name 
                              ? `${profile.first_name}` 
                              : 'Utilisateur';
                            
                            // 2. Envoyer le message automatique
                            await addSupportMessage(
                              selectedTicket.id,
                              `Bonjour ${userName}, votre demande passe en développement. Merci !`,
                              user?.id || ''
                            );
                            
                            // 3. Transformer en ticket projet (ferme automatiquement le ticket support)
                            const projectTicketId = await transformToProjectTicket({
                              id: selectedTicket.id,
                              subject: selectedTicket.subject,
                              user_id: selectedTicket.user_id,
                              service: selectedTicket.service,
                              category: selectedTicket.category,
                              chatbot_conversation: selectedTicket.chatbot_conversation,
                            });
                            
                            if (projectTicketId) {
                              toast.success('Ticket transféré en développement et fermé');
                              await loadTickets();
                              setSelectedTicket(null);
                              navigate(`/projects/kanban?ticketId=${projectTicketId}`);
                            }
                          }}
                          disabled={isTransforming || ['resolved', 'closed'].includes(selectedTicket.status)}
                          className="gap-2 text-purple-600 border-purple-300 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isTransforming ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Kanban className="w-4 h-4" />
                          )}
                          {['resolved', 'closed'].includes(selectedTicket.status) ? 'Déjà traité' : 'Développement'}
                        </Button>

                        {/* Bouton pour voir le partage d'écran - toujours visible pour chat_human */}
                        {selectedTicket?.type === 'chat_human' && (
                          <Button
                            variant="default"
                            onClick={() => setShowScreenShare(true)}
                            className="gap-2 bg-helpconfort-blue hover:bg-helpconfort-blue/90 text-white"
                          >
                            <Monitor className="w-4 h-4" />
                            👁️ Voir l'écran
                          </Button>
                        )}

                        <Select
                          value={selectedTicket.assigned_to || 'none'}
                          onValueChange={(v) => assignTicket(selectedTicket.id, v === 'none' ? '' : v)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Non assigné" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Non assigné</SelectItem>
                            {formattedSupportUsers.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                👤 {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={selectedTicket.status}
                          onValueChange={(v) => updateTicketStatus(selectedTicket.id, v)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waiting">En attente</SelectItem>
                            <SelectItem value="in_progress">En cours</SelectItem>
                            <SelectItem value="resolved">Résolu</SelectItem>
                            <SelectItem value="unresolved">Non résolu</SelectItem>
                          </SelectContent>
                        </Select>

                        <HeatPriorityBadge priority={selectedTicket.heat_priority} />

                        {selectedTicket.status === 'resolved' && (
                          <div className="flex gap-2 ml-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reopenTicket(selectedTicket.id)}
                            >
                              Réouvrir
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Fermer définitivement
                            </Button>
                          </div>
                        )}
                        {selectedTicket.status === 'unresolved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reopenTicket(selectedTicket.id)}
                            className="ml-auto"
                          >
                            Réouvrir le ticket
                          </Button>
                        )}

                        {/* N5+ Delete button */}
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm('Supprimer définitivement ce ticket ?')) {
                                deleteTicket(selectedTicket.id);
                              }
                            }}
                            className="ml-auto"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Supprimer
                          </Button>
                        )}
                      </div>

                      <Separator />

                      {/* Messages */}
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.is_from_support ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  msg.is_from_support
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* New Message Input */}
                      {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'unresolved' && (
                        <div className="flex gap-2">
                          <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Répondre à la demande..."
                            className="flex-1"
                            rows={3}
                          />
                          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {selectedTicket.status === 'resolved' && (
                        <div className="bg-muted p-4 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Ce ticket est résolu.
                          </p>
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reopenTicket(selectedTicket.id)}
                            >
                              Réouvrir
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Fermer définitivement
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedTicket.status === 'closed' && (
                        <div className="bg-gray-100 p-4 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">
                            Ce ticket est fermé définitivement.
                          </p>
                        </div>
                      )}
                      {selectedTicket.status === 'unresolved' && (
                        <div className="bg-muted p-4 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Ce ticket est non résolu.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reopenTicket(selectedTicket.id)}
                          >
                            Réouvrir pour continuer la conversation
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="details" className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <label className="text-sm font-medium">Sujet</label>
                          <p className="text-sm text-muted-foreground">{selectedTicket.subject || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">ID Utilisateur</label>
                          <p className="text-sm text-muted-foreground">{selectedTicket.user_id}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Assigné à</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedTicket.assigned_to 
                              ? `👤 ${formattedSupportUsers.find(u => u.id === selectedTicket.assigned_to)?.name || 'Utilisateur inconnu'}`
                              : 'Non assigné'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Agence</label>
                          <p className="text-sm text-muted-foreground">{selectedTicket.agency_slug || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Type de demande</label>
                          <div className="mt-1">
                            {getDemandTypeBadge(selectedTicket)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Service</label>
                          <div className="mt-1">
                            <ServiceBadge service={selectedTicket.service} />
                          </div>
                        </div>
                        {selectedTicket.category && (
                          <div>
                            <label className="text-sm font-medium">Catégorie</label>
                            <div className="mt-1">
                              <TicketCategoryBadge category={selectedTicket.category} />
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium">Niveau de support</label>
                          <div className="mt-1">
                            <SupportLevelBadge level={selectedTicket.support_level || 1} showLabel />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Créé le</label>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(selectedTicket.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        {selectedTicket.resolved_at && (
                          <div>
                            <label className="text-sm font-medium">Résolu le</label>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(selectedTicket.resolved_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="attachments" className="space-y-4">
                      {attachments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucune pièce jointe</p>
                      ) : (
                        <div className="space-y-2">
                          {attachments.map((attachment) => (
                            <Card key={attachment.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{attachment.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(attachment.file_size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadAttachment(attachment)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Screen share viewer for agent */}
      {showScreenShare && selectedTicket && (
        <ScreenShareSession 
          ticketId={selectedTicket.id} 
          isAgent={true}
          onClose={() => setShowScreenShare(false)} 
        />
      )}
    </div>
  );
}
