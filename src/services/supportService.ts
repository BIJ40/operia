/**
 * Service de gestion du support - Phase 2
 * Logique d'assignation automatique et filtrage par compétences
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// CONSTANTES - Statuts et Priorités
// ============================================

export const TICKET_STATUSES = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  WAITING_USER: 'waiting_user',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export const TICKET_STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  in_progress: 'En cours',
  waiting_user: 'Attente utilisateur',
  resolved: 'Résolu',
  closed: 'Fermé',
};

export const TICKET_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  in_progress: 'bg-orange-500',
  waiting_user: 'bg-yellow-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

export const TICKET_PRIORITIES = {
  MINEUR: 'mineur',
  NORMAL: 'normal',
  IMPORTANT: 'important',
  URGENT: 'urgent',
  BLOQUANT: 'bloquant',
} as const;

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  mineur: 'Mineur',
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
  bloquant: 'Bloquant',
};

export const TICKET_PRIORITY_COLORS: Record<string, string> = {
  mineur: 'bg-gray-400',
  normal: 'bg-blue-500',
  important: 'bg-orange-500',
  urgent: 'bg-red-500',
  bloquant: 'bg-red-700',
};

export const TICKET_PRIORITY_ORDER: Record<string, number> = {
  mineur: 1,
  normal: 2,
  important: 3,
  urgent: 4,
  bloquant: 5,
};

export const TICKET_SERVICES = {
  APOGEE: 'apogee',
  HELPCONFORT: 'helpconfort',
  APPORTEUR: 'apporteur',
  CONSEIL: 'conseil',
  AUTRE: 'autre',
} as const;

export const TICKET_SERVICE_LABELS: Record<string, string> = {
  apogee: 'Apogée',
  helpconfort: 'HelpConfort',
  apporteur: 'Apporteurs',
  conseil: 'Conseil / Formation',
  autre: 'Autre',
};

export const TICKET_CATEGORIES = {
  BUG: 'bug',
  AMELIORATION: 'amelioration',
  QUESTION: 'question',
  BLOCAGE: 'blocage',
  AUTRE: 'autre',
} as const;

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  amelioration: 'Amélioration',
  question: 'Question',
  blocage: 'Blocage',
  autre: 'Autre',
};

// ============================================
// TYPES
// ============================================

export type TicketStatus = typeof TICKET_STATUSES[keyof typeof TICKET_STATUSES];
export type TicketPriority = typeof TICKET_PRIORITIES[keyof typeof TICKET_PRIORITIES];
export type TicketService = typeof TICKET_SERVICES[keyof typeof TICKET_SERVICES];
export type TicketCategory = typeof TICKET_CATEGORIES[keyof typeof TICKET_CATEGORIES];

export interface SupportUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  support_level: number;
  service_competencies: Record<string, boolean> | null;
  is_available_for_chat?: boolean;
}

export interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  service?: TicketService | TicketService[];
  support_level?: number;
  assigned_to?: string | null;
  showUnassigned?: boolean;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Récupère tous les Support Users avec leurs compétences
 */
export async function getAllSupportUsers(): Promise<SupportUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, support_level, service_competencies')
    .not('support_level', 'is', null)
    .gt('support_level', 0);

  if (error) {
    console.error('Error fetching support users:', error);
    return [];
  }

  return (data || []).map(profile => ({
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    support_level: profile.support_level || 1,
    service_competencies: profile.service_competencies as Record<string, boolean> | null,
  }));
}

/**
 * Récupère les Support Users éligibles pour un ticket donné
 * Basé sur le niveau de support et les compétences de service
 */
export async function getEligibleSupportUsersForTicket(
  ticketService: string | null,
  targetLevel: number = 1
): Promise<SupportUser[]> {
  const allSupportUsers = await getAllSupportUsers();

  // Filtrer par niveau (exact ou supérieur si besoin d'escalade)
  const byLevel = allSupportUsers.filter(su => su.support_level === targetLevel);

  // Si pas de service spécifié, retourner tous les SU du niveau
  if (!ticketService) {
    return byLevel;
  }

  // Filtrer par compétences de service
  const eligible = byLevel.filter(su => {
    if (!su.service_competencies) return false;
    // Vérifier si le SU a la compétence pour ce service
    return su.service_competencies[ticketService] === true;
  });

  return eligible;
}

/**
 * Assigne automatiquement un ticket à un Support User éligible
 * Utilise une stratégie round-robin simple basée sur l'ID
 */
export async function autoAssignTicket(
  ticketId: string,
  ticketService: string | null,
  targetLevel: number = 1
): Promise<{ success: boolean; assignedTo: string | null; error?: string }> {
  try {
    const eligibleUsers = await getEligibleSupportUsersForTicket(ticketService, targetLevel);

    if (eligibleUsers.length === 0) {
      // Aucun SU éligible trouvé, laisser non assigné
      return { success: true, assignedTo: null };
    }

    // Stratégie round-robin simple : choisir un SU aléatoirement
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
    const selectedUser = eligibleUsers[randomIndex];

    // Mettre à jour le ticket avec l'assignation
    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: selectedUser.id,
        support_level: targetLevel,
      })
      .eq('id', ticketId);

    if (error) throw error;

    return { success: true, assignedTo: selectedUser.id };
  } catch (error) {
    console.error('Error auto-assigning ticket:', error);
    return { 
      success: false, 
      assignedTo: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Escalade un ticket vers le niveau supérieur
 */
export async function escalateTicket(
  ticketId: string,
  ticketService: string | null,
  currentLevel: number,
  targetUserId?: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const newLevel = Math.min(currentLevel + 1, 3);

    // Si un utilisateur cible est spécifié, l'utiliser directement
    let assignedTo = targetUserId;

    // Sinon, chercher un SU éligible au nouveau niveau
    if (!assignedTo) {
      const eligibleUsers = await getEligibleSupportUsersForTicket(ticketService, newLevel);
      if (eligibleUsers.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
        assignedTo = eligibleUsers[randomIndex].id;
      }
    }

    // Récupérer l'historique d'escalade existant
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('escalation_history')
      .eq('id', ticketId)
      .single();

    const existingHistory = (ticket?.escalation_history as any[]) || [];
    const newHistoryEntry = {
      from_level: currentLevel,
      to_level: newLevel,
      assigned_to: assignedTo,
      reason: reason || 'Escalade manuelle',
      timestamp: new Date().toISOString(),
    };

    // Mettre à jour le ticket
    const { error } = await supabase
      .from('support_tickets')
      .update({
        support_level: newLevel,
        assigned_to: assignedTo || null,
        escalation_history: [...existingHistory, newHistoryEntry],
        status: TICKET_STATUSES.IN_PROGRESS,
      })
      .eq('id', ticketId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error escalating ticket:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Construit une requête filtrée pour les tickets selon les critères SU
 */
export function buildTicketFilterQuery(
  filters: TicketFilters,
  userCompetencies?: Record<string, boolean> | null,
  userSupportLevel?: number
) {
  let query = supabase.from('support_tickets').select('*');

  // Filtre par statut
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  // Filtre par priorité
  if (filters.priority) {
    if (Array.isArray(filters.priority)) {
      query = query.in('priority', filters.priority);
    } else {
      query = query.eq('priority', filters.priority);
    }
  }

  // Filtre par service
  if (filters.service) {
    if (Array.isArray(filters.service)) {
      query = query.in('service', filters.service);
    } else {
      query = query.eq('service', filters.service);
    }
  }

  // Filtre par niveau de support
  if (filters.support_level !== undefined) {
    query = query.eq('support_level', filters.support_level);
  }

  // Filtre par assignation
  if (filters.assigned_to !== undefined) {
    if (filters.assigned_to === null) {
      query = query.is('assigned_to', null);
    } else {
      query = query.eq('assigned_to', filters.assigned_to);
    }
  }

  // Ordre par priorité (les plus urgents en premier) puis par date
  query = query.order('created_at', { ascending: false });

  return query;
}

/**
 * Récupère les tickets filtrés pour un Support User
 * Basé sur ses compétences et son niveau
 */
export async function getTicketsForSupportUser(
  userId: string,
  filters: TicketFilters = {}
): Promise<any[]> {
  try {
    // Récupérer le profil du SU
    const { data: profile } = await supabase
      .from('profiles')
      .select('support_level, service_competencies')
      .eq('id', userId)
      .single();

    if (!profile) {
      return [];
    }

    const supportLevel = profile.support_level || 1;
    const competencies = profile.service_competencies as Record<string, boolean> | null;

    // Construire la requête de base
    let query = supabase.from('support_tickets').select('*');

    // Appliquer les filtres
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority);
      } else {
        query = query.eq('priority', filters.priority);
      }
    }

    if (filters.service) {
      if (Array.isArray(filters.service)) {
        query = query.in('service', filters.service);
      } else {
        query = query.eq('service', filters.service);
      }
    }

    // Filtre par niveau : le SU voit les tickets de son niveau ou inférieurs
    query = query.lte('support_level', supportLevel);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Filtrer côté client par compétences de service si nécessaire
    let filteredData = data || [];
    
    if (competencies && Object.keys(competencies).length > 0) {
      const enabledServices = Object.entries(competencies)
        .filter(([_, enabled]) => enabled)
        .map(([service, _]) => service);

      if (enabledServices.length > 0) {
        filteredData = filteredData.filter(ticket => 
          !ticket.service || enabledServices.includes(ticket.service)
        );
      }
    }

    return filteredData;
  } catch (error) {
    console.error('Error fetching tickets for support user:', error);
    return [];
  }
}

/**
 * Met à jour le statut d'un ticket
 */
export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status: newStatus };

    // Si résolu ou fermé, ajouter la date de résolution
    if (newStatus === TICKET_STATUSES.RESOLVED || newStatus === TICKET_STATUSES.CLOSED) {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Met à jour la priorité d'un ticket
 */
export async function updateTicketPriority(
  ticketId: string,
  newPriority: TicketPriority
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({ priority: newPriority })
      .eq('id', ticketId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating ticket priority:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Envoie un message sur un ticket (avec support des notes internes)
 */
export async function sendTicketMessage(
  ticketId: string,
  senderId: string,
  message: string,
  isFromSupport: boolean,
  isInternalNote: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        message: message,
        is_from_support: isFromSupport,
        is_internal_note: isInternalNote,
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error sending ticket message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
