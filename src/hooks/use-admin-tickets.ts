import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Ticket, Attachment } from './use-user-tickets';

export const useAdminTickets = () => {
  const { canManageTickets } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    source: 'all',
    agency: 'all',
  });

  const loadTickets = async () => {
    if (!canManageTickets()) return;

    setIsLoading(true);
    try {
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
        query = query.eq('source', filters.source);
      }
      if (filters.agency !== 'all') {
        query = query.eq('agency_slug', filters.agency);
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
      // Load messages
      const { data: msgs, error: msgsError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;
      setMessages(msgs || []);

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
          resolved_at: status === 'resolved' ? new Date().toISOString() : null 
        } as any)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Statut mis à jour',
        duration: 3000,
      });
      loadTickets();
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
        .update({ priority } as any)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Priorité mise à jour',
        duration: 3000,
      });
      loadTickets();
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
        .update({ assigned_to: userId } as any)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Ticket assigné',
        duration: 3000,
      });
      loadTickets();
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

  const addSupportMessage = async (ticketId: string, message: string, userId: string) => {
    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: userId,
        message,
        is_from_support: true,
      } as any);

      if (error) throw error;

      // Update ticket status to in_progress if it was waiting
      if (selectedTicket?.status === 'waiting') {
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

  const getStats = () => {
    const total = tickets.length;
    const waiting = tickets.filter((t) => t.status === 'waiting').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;

    return { total, waiting, inProgress, resolved };
  };

  useEffect(() => {
    loadTickets();
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
    loadTickets,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addSupportMessage,
    downloadAttachment,
    getStats,
  };
};
