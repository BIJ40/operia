import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logError, logWarn } from '@/lib/logger';
import { safeQuery, safeMutation, safeInvoke } from '@/lib/safeQuery';
import { errorToast, successToast, warningToast } from '@/lib/toastHelpers';
import { Ticket, Attachment } from './use-user-tickets';

interface SupportUser {
  id: string;
  first_name: string;
  last_name: string;
  global_role: string | null;
  enabled_modules: any;
  franchiseur_role?: string;
}

// P1-03: Configuration pagination serveur
const DEFAULT_PAGE_SIZE = 50;

export const useAdminTickets = () => {
  const { canManageTickets, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]); // Liste complète pour les stats
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  
  // P1-03: État pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    source: 'all',
    agency: 'all',
    heatPriorityMin: 0,
    heatPriorityMax: 12,
    assignment: 'all', // 'all' | 'mine' | 'unassigned'
  });

  const loadTickets = async () => {
    if (!canManageTickets) return;

    setIsLoading(true);
    
    // Charger d'abord tous les tickets pour les stats (sans pagination)
    const allResult = await safeQuery<any[]>(
      supabase
        .from('support_tickets')
        .select('*, user_profile:profiles!support_tickets_user_id_fkey(first_name, last_name, email)')
        .order('created_at', { ascending: false }),
      'ADMIN_TICKETS_LOAD_ALL'
    );

    if (!allResult.success) {
      errorToast(allResult.error!);
      setIsLoading(false);
      return;
    }
    setAllTickets(allResult.data || []);

    // P1-03: Construire la requête filtrée avec count exact
    let countQuery = supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('support_tickets')
      .select('*, user_profile:profiles!support_tickets_user_id_fkey(first_name, last_name, email)')
      .order('created_at', { ascending: false });

    // Apply filters to both queries
    const applyFilters = (q: any) => {
      if (filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters.category !== 'all') {
        q = q.eq('category', filters.category);
      }
      if (filters.source !== 'all') {
        if (filters.source === 'chat_ai') {
          q = q.eq('type', 'chat_ai');
        } else if (filters.source === 'chat_human') {
          q = q.eq('type', 'chat_human');
        } else if (filters.source === 'ticket') {
          q = q.eq('type', 'ticket');
        }
      }
      if (filters.agency !== 'all') {
        q = q.eq('agency_slug', filters.agency);
      }
      if (filters.heatPriorityMin > 0) {
        q = q.gte('heat_priority', filters.heatPriorityMin);
      }
      if (filters.heatPriorityMax < 12) {
        q = q.lte('heat_priority', filters.heatPriorityMax);
      }
      if (filters.assignment === 'mine' && user?.id) {
        q = q.eq('assigned_to', user.id);
      } else if (filters.assignment === 'unassigned') {
        q = q.is('assigned_to', null);
      }
      return q;
    };

    countQuery = applyFilters(countQuery);
    dataQuery = applyFilters(dataQuery);

    // P1-03: Appliquer la pagination serveur
    const from = page * pageSize;
    const to = from + pageSize - 1;
    dataQuery = dataQuery.range(from, to);

    // Exécuter count et data en parallèle
    const [countResult, dataResult] = await Promise.all([
      safeQuery<any>(countQuery, 'ADMIN_TICKETS_COUNT'),
      safeQuery<Ticket[]>(dataQuery, 'ADMIN_TICKETS_LOAD_FILTERED'),
    ]);

    if (countResult.success) {
      setTotalCount((countResult as any).count ?? 0);
    }

    if (!dataResult.success) {
      errorToast(dataResult.error!);
      setTickets([]);
    } else {
      setTickets(dataResult.data || []);
    }
    
    setIsLoading(false);
  };

  const loadTicketDetails = async (ticketId: string) => {
    // Marquer le ticket comme vu par le support (si pas déjà fait)
    const viewedResult = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ viewed_by_support_at: new Date().toISOString() })
        .eq('id', ticketId)
        .is('viewed_by_support_at', null),
      'ADMIN_TICKETS_MARK_VIEWED'
    );

    if (!viewedResult.success) {
      logWarn('[ADMIN-TICKETS] Error marking ticket as viewed', viewedResult.error);
    }

    // Load messages
    const msgsResult = await safeQuery<any[]>(
      supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      'ADMIN_TICKETS_LOAD_MESSAGES'
    );

    if (!msgsResult.success) {
      errorToast(msgsResult.error!);
      setMessages([]);
      return;
    }
    
    const msgs = msgsResult.data || [];
    setMessages(msgs);

    // Mark unread user messages as read
    const unreadUserMessages = msgs.filter(
      (msg: any) => !msg.is_from_support && !msg.read_at
    );

    if (unreadUserMessages.length > 0) {
      const markReadResult = await safeMutation(
        supabase
          .from('support_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadUserMessages.map((msg: any) => msg.id)),
        'ADMIN_TICKETS_MARK_READ'
      );

      if (!markReadResult.success) {
        logWarn('[ADMIN-TICKETS] Error marking messages as read', markReadResult.error);
      }
    }

    // Load attachments
    const attsResult = await safeQuery<Attachment[]>(
      supabase
        .from('support_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      'ADMIN_TICKETS_LOAD_ATTACHMENTS'
    );

    if (!attsResult.success) {
      errorToast(attsResult.error!);
      setAttachments([]);
      return;
    }
    
    setAttachments(attsResult.data || []);
  };

  const refreshSelectedTicket = async (ticketId: string) => {
    const result = await safeQuery<Ticket>(
      supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle(),
      'ADMIN_TICKETS_REFRESH'
    );

    if (result.success && result.data) {
      setSelectedTicket(result.data);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const shouldSetResolvedAt = ['resolved', 'closed'].includes(status);

    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          resolved_at: shouldSetResolvedAt ? new Date().toISOString() : null,
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_UPDATE_STATUS'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Statut mis à jour.');
    
    // Reload tickets and refresh selected ticket if it matches
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
  };

  const updateTicketPriority = async (ticketId: string, heatPriority: number) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          heat_priority: heatPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_UPDATE_PRIORITY'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Priorité mise à jour.');
    
    // Reload tickets and refresh selected ticket if it matches
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
  };

  const assignTicket = async (ticketId: string, userId: string) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          assigned_to: userId || null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', ticketId),
      'ADMIN_TICKETS_ASSIGN'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast(userId ? 'Ticket assigné.' : 'Ticket désassigné.');
    
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
  };

  const takeTicket = async (ticketId: string, userId: string) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          assigned_to: userId,
          status: 'in_progress',
          viewed_by_support_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', ticketId),
      'ADMIN_TICKETS_TAKE'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Vous avez pris en charge ce ticket.');
    
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
  };

  const addSupportMessage = async (ticketId: string, message: string, userId: string) => {
    const result = await safeMutation(
      supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: userId,
        message,
        is_from_support: true,
      } as any),
      'ADMIN_TICKETS_ADD_MESSAGE'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    // Auto-assigner + mettre à jour le statut si nécessaire
    const updateData: any = { updated_at: new Date().toISOString() };
    
    // Auto-assigner au premier agent qui répond si pas encore assigné
    if (!selectedTicket?.assigned_to) {
      updateData.assigned_to = userId;
      updateData.viewed_by_support_at = new Date().toISOString();
    }

    // Update status: new/waiting/waiting_user → in_progress
    if (['new', 'waiting', 'waiting_user'].includes(selectedTicket?.status || '')) {
      updateData.status = 'in_progress';
    }

    if (Object.keys(updateData).length > 1) {
      await safeMutation(
        supabase.from('support_tickets').update(updateData).eq('id', ticketId),
        'ADMIN_TICKETS_AUTO_UPDATE'
      );
      
      // Refresh local state
      if (selectedTicket) {
        await refreshSelectedTicket(ticketId);
      }
    }
    
    await loadTickets();
    await loadTicketDetails(ticketId);
  };

  // Storage: on garde try/catch local (pas safeQuery)
  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('support-attachments')
        .download(attachment.file_path);

      if (error) {
        logError('[ADMIN-TICKETS] Storage download error', error);
        errorToast('Impossible de télécharger le fichier');
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logError('[ADMIN-TICKETS] Error downloading attachment', error);
      errorToast('Impossible de télécharger le fichier');
    }
  };

  const reopenTicket = async (ticketId: string) => {
    // Utiliser le nouveau statut 'in_progress' pour réouverture
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          status: 'in_progress',
          resolved_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_REOPEN'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Ticket réouvert.');
    
    // Reload tickets and refresh selected ticket if it matches
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
  };

  const loadSupportUsers = async () => {
    // V2: Charger les utilisateurs avec enabled_modules.support
    const profilesResult = await safeQuery<any[]>(
      supabase
        .from('profiles')
        .select('id, first_name, last_name, global_role, enabled_modules')
        .eq('is_active', true),
      'ADMIN_TICKETS_LOAD_PROFILES'
    );

    if (!profilesResult.success) {
      logError('[ADMIN-TICKETS] Error loading support users', profilesResult.error);
      setSupportUsers([]);
      return;
    }

    const profiles = profilesResult.data || [];
    if (profiles.length === 0) {
      setSupportUsers([]);
      return;
    }

    // Filtrer les profils qui ont accès support activé
    const supportProfiles = profiles.filter(p => {
      const modules = p.enabled_modules as any;
      if (!modules?.support?.enabled) return false;
      const options = modules.support.options || {};
      return options.agent === true || options.admin === true;
    });

    const userIds = supportProfiles.map(p => p.id);

    if (userIds.length === 0) {
      setSupportUsers([]);
      return;
    }

    // Derive franchiseur_role from global_role (V2)
    const deriveFranchiseurRole = (globalRole: string | null): string => {
      if (!globalRole) return 'animateur';
      if (globalRole === 'superadmin' || globalRole === 'platform_admin') return 'dg';
      if (globalRole === 'franchisor_admin') return 'directeur';
      return 'animateur';
    };

    // Merge derived franchiseur_role into profiles
    const usersWithRoles = supportProfiles.map(profile => ({
      ...profile,
      franchiseur_role: deriveFranchiseurRole(profile.global_role)
    }));

    setSupportUsers(usersWithRoles as SupportUser[]);
  };

  const escalateTicket = async (
    ticketId: string, 
    targetLevel: number, 
    targetUserId: string,
    reason: string
  ) => {
    const currentTicket = tickets.find(t => t.id === ticketId) || selectedTicket;
    if (!currentTicket) {
      errorToast("Ticket non trouvé");
      return;
    }

    // Helper to derive franchiseur role from global_role
    const deriveFranchiseurRole = (globalRole: string | null): string => {
      if (!globalRole) return 'animateur';
      if (globalRole === 'superadmin' || globalRole === 'platform_admin') return 'dg';
      if (globalRole === 'franchisor_admin') return 'directeur';
      return 'animateur';
    };

    // Get current user info with global_role
    const currentUserResult = await safeQuery<any>(
      supabase
        .from('profiles')
        .select('first_name, last_name, global_role')
        .eq('id', user?.id)
        .maybeSingle(),
      'ADMIN_TICKETS_ESCALATE_CURRENT_USER'
    );

    // Get target user info with global_role
    const targetUserResult = await safeQuery<any>(
      supabase
        .from('profiles')
        .select('first_name, last_name, global_role')
        .eq('id', targetUserId)
        .maybeSingle(),
      'ADMIN_TICKETS_ESCALATE_TARGET_USER'
    );

    const currentUser = currentUserResult.data;
    const targetUser = targetUserResult.data;

    let fromRole = undefined;
    let toRole = undefined;

    // For HelpConfort, derive roles from global_role (V2)
    if (currentTicket.service === 'HelpConfort') {
      fromRole = deriveFranchiseurRole(currentUser?.global_role);
      toRole = deriveFranchiseurRole(targetUser?.global_role);
    }

    const escalationEntry = {
      timestamp: new Date().toISOString(),
      from_level: currentTicket.support_level || 1,
      to_level: targetLevel,
      from_role: fromRole,
      to_role: toRole,
      escalated_by: user?.id,
      escalated_by_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Inconnu',
      escalated_to: targetUserId,
      escalated_to_name: targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : 'Non assigné',
      reason,
    };

    const currentHistory = Array.isArray(currentTicket.escalation_history) 
      ? currentTicket.escalation_history 
      : [];

    const escalateResult = await safeMutation(
      supabase
        .from('support_tickets')
        .update({
          support_level: targetLevel || currentTicket.support_level,
          assigned_to: targetUserId,
          escalation_history: [...currentHistory, escalationEntry],
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_ESCALATE'
    );

    if (!escalateResult.success) {
      errorToast(escalateResult.error!);
      return;
    }

    // Send email notification via edge function
    const notifyResult = await safeInvoke(
      supabase.functions.invoke('notify-escalation', {
        body: {
          ticket_id: ticketId,
          ticket_subject: currentTicket.subject,
          ticket_service: currentTicket.service || 'Non défini',
          from_level: currentTicket.support_level || 1,
          to_level: targetLevel,
          from_role: fromRole,
          to_role: toRole,
          escalated_by_name: escalationEntry.escalated_by_name,
          escalated_to_id: targetUserId,
          escalated_to_name: escalationEntry.escalated_to_name,
          reason,
        },
      }),
      'ADMIN_TICKETS_NOTIFY_ESCALATION'
    );

    if (!notifyResult.success) {
      // Don't fail the escalation if email fails, just warn
      warningToast('Ticket escaladé mais notification email échouée');
    } else {
      successToast('Ticket escaladé');
    }

    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
  };

  // Statistiques
  const getStats = () => {
    const total = allTickets.length;
    const newTickets = allTickets.filter((t) => t.status === 'new').length;
    // Inclut 'waiting' legacy pour données DB existantes
    const waitingUser = allTickets.filter((t) => ['waiting_user', 'waiting'].includes(t.status)).length;
    const inProgress = allTickets.filter((t) => t.status === 'in_progress').length;
    const resolved = allTickets.filter((t) => t.status === 'resolved').length;
    const closed = allTickets.filter((t) => t.status === 'closed').length;

    return { total, newTickets, waitingUser, inProgress, resolved, closed };
  };

  // Convertir un chat (AI ou humain) en ticket formel
  const convertChatToTicket = async (ticketId: string) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({
          type: 'ticket',
          status: 'new',
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', ticketId),
      'ADMIN_TICKETS_CONVERT_CHAT'
    );

    if (!result.success) {
      errorToast(result.error!);
      return false;
    }

    successToast('Converti en ticket');
    
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
    return true;
  };

  // SU prend la main sur un chat_ai → devient chat_human
  // SUPPORT_V2: Ajoute un message système visible par l'utilisateur
  const takeOverChat = async (ticketId: string, userId: string) => {
    // 1. Mettre à jour le ticket
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({
          type: 'chat_human',
          assigned_to: userId,
          status: 'in_progress',
          viewed_by_support_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', ticketId),
      'ADMIN_TICKETS_TAKE_OVER_CHAT'
    );

    if (!result.success) {
      errorToast(result.error!);
      return false;
    }

    // 2. SUPPORT_V2: Ajouter le message système "Un conseiller a rejoint la conversation"
    const systemMessageResult = await safeMutation(
      supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: userId,
        message: 'Un conseiller a rejoint la conversation.',
        is_from_support: true,
        is_system_message: true,
      } as any),
      'ADMIN_TICKETS_SYSTEM_MESSAGE_JOINED'
    );

    if (!systemMessageResult.success) {
      logWarn('[ADMIN-TICKETS] Failed to add system message for takeover', systemMessageResult.error);
      // Continue anyway - the takeover itself succeeded
    }

    successToast('Vous avez pris la main sur ce chat');
    
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
      await loadTicketDetails(ticketId); // Recharger les messages
    }
    return true;
  };

  // P1-03: Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  useEffect(() => {
    loadTickets();
    loadSupportUsers();
  }, [filters, page, pageSize]);

  // Real-time subscriptions for live updates (SUPPORT_V2)
  useEffect(() => {
    if (!canManageTickets) return;

    // Subscribe to ticket changes
    const ticketsChannel = supabase
      .channel('admin-tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          // Reload tickets on any change
          loadTickets();
          // If the changed ticket is the selected one, refresh it
          if (selectedTicket && payload.new && (payload.new as any).id === selectedTicket.id) {
            refreshSelectedTicket(selectedTicket.id);
          }
        }
      )
      .subscribe();

    // Subscribe to message changes for the selected ticket
    const messagesChannel = supabase
      .channel('admin-messages-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          // If new message is for selected ticket, reload messages
          if (selectedTicket && (payload.new as any).ticket_id === selectedTicket.id) {
            loadTicketDetails(selectedTicket.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [canManageTickets, selectedTicket?.id, filters, page, pageSize, user?.id]);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketDetails(selectedTicket.id);
    }
  }, [selectedTicket]);

  // Delete ticket (N5+ only - checked in UI)
  const deleteTicket = async (ticketId: string) => {
    // First delete related messages
    await safeMutation(
      supabase.from('support_messages').delete().eq('ticket_id', ticketId),
      'ADMIN_TICKETS_DELETE_MESSAGES'
    );
    
    // Then delete the ticket
    const result = await safeMutation(
      supabase.from('support_tickets').delete().eq('id', ticketId),
      'ADMIN_TICKETS_DELETE'
    );

    if (!result.success) {
      errorToast(result.error!);
      return false;
    }

    successToast('Ticket supprimé');
    setSelectedTicket(null);
    await loadTickets();
    return true;
  };

  return {
    tickets,
    selectedTicket,
    setSelectedTicket,
    attachments,
    messages,
    isLoading,
    filters,
    setFilters,
    supportUsers,
    loadTickets,
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
    // P1-03: Pagination controls
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
};