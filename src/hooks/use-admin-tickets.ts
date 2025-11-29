import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
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
  });

  const loadTickets = async () => {
    if (!canManageTickets) return;

    setIsLoading(true);
    try {
      // Charger d'abord tous les tickets pour les stats
      const { data: allData, error: allError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setAllTickets((allData || []) as Ticket[]);

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
        // Filter by demand type
        if (filters.source === 'live_chat') {
          query = query.eq('is_live_chat', true);
        } else if (filters.source === 'escalated') {
          query = query.eq('escalated_from_chat', true);
        } else if (filters.source === 'portal') {
          query = query.eq('is_live_chat', false).eq('escalated_from_chat', false);
        }
      }
      if (filters.agency !== 'all') {
        query = query.eq('agency_slug', filters.agency);
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets((data || []) as Ticket[]);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les tickets',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      // Marquer le ticket comme vu par le support (si pas déjà fait)
      const { error: viewedError } = await supabase
        .from('support_tickets')
        .update({ viewed_by_support_at: new Date().toISOString() })
        .eq('id', ticketId)
        .is('viewed_by_support_at', null);

      if (viewedError) {
        console.error('Error marking ticket as viewed:', viewedError);
      }

      // Load messages
      const { data: msgs, error: msgsError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;
      setMessages(msgs || []);

      // Mark unread user messages as read
      const unreadUserMessages = (msgs || []).filter(
        (msg: any) => !msg.is_from_support && !msg.read_at
      );

      if (unreadUserMessages.length > 0) {
        const { error: updateError } = await supabase
          .from('support_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadUserMessages.map((msg: any) => msg.id));

        if (updateError) {
          console.error('Error marking messages as read:', updateError);
        }
      }

      // Load attachments
      const { data: atts, error: attsError } = await supabase
        .from('support_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (attsError) throw attsError;
      setAttachments(atts || []);
    } catch (error) {
      console.error('Error loading ticket details:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails du ticket',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          resolved_at: status === 'resolved' ? new Date().toISOString() : null 
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Statut mis à jour',
        duration: 3000,
      });
      
      // Reload tickets and refresh selected ticket if it matches
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const { data } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
        if (data) setSelectedTicket(data as Ticket);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Priorité mise à jour',
        duration: 3000,
      });
      
      // Reload tickets and refresh selected ticket if it matches
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const { data } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
        if (data) setSelectedTicket(data as Ticket);
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la priorité',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const assignTicket = async (ticketId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: userId || null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: userId ? 'Ticket assigné' : 'Ticket désassigné',
        duration: 3000,
      });
      
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const { data } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
        if (data) setSelectedTicket(data as Ticket);
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'assigner le ticket",
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const takeTicket = async (ticketId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: userId,
          status: 'in_progress',
          viewed_by_support_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Vous avez pris en charge ce ticket',
        duration: 3000,
      });
      
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const { data } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
        if (data) setSelectedTicket(data as Ticket);
      }
    } catch (error) {
      console.error('Error taking ticket:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de prendre en charge le ticket",
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const addSupportMessage = async (ticketId: string, message: string, userId: string) => {
    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: userId,
        message,
        is_from_support: true,
      } as any);

      if (error) throw error;

      // Update ticket status to in_progress if it was new or waiting_user
      // Compatibilité avec l'ancien statut 'waiting'
      if (selectedTicket?.status === 'new' || selectedTicket?.status === 'waiting' || selectedTicket?.status === 'waiting_user') {
        await updateTicketStatus(ticketId, 'in_progress');
      }
    } catch (error) {
      console.error('Error adding message:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer le message",
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('support-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const reopenTicket = async (ticketId: string) => {
    try {
      // Utiliser le nouveau statut 'in_progress' pour réouverture
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'in_progress',
          resolved_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Ticket réouvert',
        duration: 3000,
      });
      
      // Reload tickets and refresh selected ticket if it matches
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const { data } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
        if (data) setSelectedTicket(data as Ticket);
      }
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de réouvrir le ticket',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const loadSupportUsers = async () => {
    try {
      // V2: Charger les utilisateurs avec enabled_modules.support
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, global_role, enabled_modules')
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
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

      // Also load franchiseur roles for these users
      const { data: franchiseurRoles } = await supabase
        .from('franchiseur_roles')
        .select('user_id, franchiseur_role')
        .in('user_id', userIds);

      // Merge franchiseur_role into profiles
      const usersWithRoles = supportProfiles.map(profile => ({
        ...profile,
        franchiseur_role: franchiseurRoles?.find(fr => fr.user_id === profile.id)?.franchiseur_role
      }));

      setSupportUsers(usersWithRoles as SupportUser[]);
    } catch (error) {
      console.error('Error loading support users:', error);
    }
  };

  const escalateTicket = async (
    ticketId: string, 
    targetLevel: number, 
    targetUserId: string,
    reason: string
  ) => {
    try {
      const currentTicket = tickets.find(t => t.id === ticketId) || selectedTicket;
      if (!currentTicket) throw new Error('Ticket not found');

      // Get current user info with franchiseur role
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();
      
      const { data: currentUserFranchiseurRole } = await supabase
        .from('franchiseur_roles')
        .select('franchiseur_role')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      // Get target user info with franchiseur role
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', targetUserId)
        .single();
        
      const { data: targetUserFranchiseurRole } = await supabase
        .from('franchiseur_roles')
        .select('franchiseur_role')
        .eq('user_id', targetUserId)
        .maybeSingle();

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

      const { error } = await supabase
        .from('support_tickets')
        .update({
          support_level: targetLevel || currentTicket.support_level,
          assigned_to: targetUserId,
          escalation_history: [...currentHistory, escalationEntry],
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('notify-escalation', {
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
        });
      } catch (emailError) {
        console.error('Error sending escalation email:', emailError);
        // Don't fail the escalation if email fails
      }

      toast({
        title: 'Succès',
        description: `Ticket escaladé`,
        duration: 3000,
      });

      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const { data } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
        if (data) setSelectedTicket(data as Ticket);
      }
    } catch (error) {
      console.error('Error escalating ticket:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'escalader le ticket",
        variant: 'destructive',
        duration: 3000,
      });
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
    getStats,
  };
};
