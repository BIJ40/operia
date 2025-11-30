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

export const useAdminTickets = () => {
  const { canManageTickets, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]); // Liste complète pour les stats
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    source: 'all',
    agency: 'all',
    priority: 'all',
    assignment: 'all', // 'all' | 'mine' | 'unassigned'
  });

  const loadTickets = async () => {
    if (!canManageTickets) return;

    setIsLoading(true);
    
    // Charger d'abord tous les tickets pour les stats
    const allResult = await safeQuery<Ticket[]>(
      supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false }),
      'ADMIN_TICKETS_LOAD_ALL'
    );

    if (!allResult.success) {
      errorToast(allResult.error!);
      setIsLoading(false);
      return;
    }
    setAllTickets(allResult.data || []);

    // Puis charger les tickets filtrés
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters.source !== 'all') {
      // Filter by demand type (V2.5)
      if (filters.source === 'chat_ai') {
        query = query.eq('type', 'chat_ai');
      } else if (filters.source === 'chat_human') {
        query = query.eq('type', 'chat_human');
      } else if (filters.source === 'ticket') {
        query = query.eq('type', 'ticket');
      }
    }
    if (filters.agency !== 'all') {
      query = query.eq('agency_slug', filters.agency);
    }
    if (filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }
    
    // Filtre par assignation
    if (filters.assignment === 'mine' && user?.id) {
      query = query.eq('assigned_to', user.id);
    } else if (filters.assignment === 'unassigned') {
      query = query.is('assigned_to', null);
    }

    const filteredResult = await safeQuery<Ticket[]>(query, 'ADMIN_TICKETS_LOAD_FILTERED');

    if (!filteredResult.success) {
      errorToast(filteredResult.error!);
      setTickets([]);
    } else {
      setTickets(filteredResult.data || []);
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
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          resolved_at: status === 'resolved' ? new Date().toISOString() : null 
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_UPDATE_STATUS'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Statut mis à jour');
    
    // Reload tickets and refresh selected ticket if it matches
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: string) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_UPDATE_PRIORITY'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Priorité mise à jour');
    
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

    successToast(userId ? 'Ticket assigné' : 'Ticket désassigné');
    
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

    successToast('Vous avez pris en charge ce ticket');
    
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

    // Update ticket status to in_progress if it was new or waiting_user
    // Compatibilité avec l'ancien statut 'waiting'
    if (selectedTicket?.status === 'new' || selectedTicket?.status === 'waiting' || selectedTicket?.status === 'waiting_user') {
      await updateTicketStatus(ticketId, 'in_progress');
    }
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

    successToast('Ticket réouvert');
    
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

    // Also load franchiseur roles for these users
    const franchiseurResult = await safeQuery<any[]>(
      supabase
        .from('franchiseur_roles')
        .select('user_id, franchiseur_role')
        .in('user_id', userIds),
      'ADMIN_TICKETS_LOAD_FRANCHISEUR_ROLES'
    );

    const franchiseurRoles = franchiseurResult.success ? franchiseurResult.data || [] : [];

    // Merge franchiseur_role into profiles
    const usersWithRoles = supportProfiles.map(profile => ({
      ...profile,
      franchiseur_role: franchiseurRoles.find(fr => fr.user_id === profile.id)?.franchiseur_role
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

    // Get current user info with franchiseur role
    const currentUserResult = await safeQuery<any>(
      supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .maybeSingle(),
      'ADMIN_TICKETS_ESCALATE_CURRENT_USER'
    );
    
    const currentUserFranchiseurResult = await safeQuery<any>(
      supabase
        .from('franchiseur_roles')
        .select('franchiseur_role')
        .eq('user_id', user?.id || '')
        .maybeSingle(),
      'ADMIN_TICKETS_ESCALATE_CURRENT_FR_ROLE'
    );

    // Get target user info with franchiseur role
    const targetUserResult = await safeQuery<any>(
      supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', targetUserId)
        .maybeSingle(),
      'ADMIN_TICKETS_ESCALATE_TARGET_USER'
    );
      
    const targetUserFranchiseurResult = await safeQuery<any>(
      supabase
        .from('franchiseur_roles')
        .select('franchiseur_role')
        .eq('user_id', targetUserId)
        .maybeSingle(),
      'ADMIN_TICKETS_ESCALATE_TARGET_FR_ROLE'
    );

    const currentUser = currentUserResult.data;
    const targetUser = targetUserResult.data;
    const currentUserFranchiseurRole = currentUserFranchiseurResult.data;
    const targetUserFranchiseurRole = targetUserFranchiseurResult.data;

    let fromRole = undefined;
    let toRole = undefined;

    // For HelpConfort, determine roles from franchiseur_roles table
    if (currentTicket.service === 'HelpConfort') {
      fromRole = currentUserFranchiseurRole?.franchiseur_role || 'animateur';
      toRole = targetUserFranchiseurRole?.franchiseur_role || 'directeur';
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

  // Statistiques utilisant les nouveaux statuts
  const getStats = () => {
    const total = allTickets.length;
    // 'new' = nouveaux tickets non pris en charge
    const newTickets = allTickets.filter((t) => t.status === 'new').length;
    // Compatibilité : compter 'waiting' et 'waiting_user' ensemble
    const waitingUser = allTickets.filter((t) => t.status === 'waiting_user' || t.status === 'waiting').length;
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
  const takeOverChat = async (ticketId: string, userId: string) => {
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

    successToast('Vous avez pris la main sur ce chat');
    
    await loadTickets();
    if (selectedTicket?.id === ticketId) {
      await refreshSelectedTicket(ticketId);
    }
    return true;
  };

  useEffect(() => {
    loadTickets();
    loadSupportUsers();
  }, [filters]);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketDetails(selectedTicket.id);
    }
  }, [selectedTicket]);

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
  };
};