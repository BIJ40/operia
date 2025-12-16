/**
 * Service de gestion du support - Phase 2
 * Logique d'assignation automatique et filtrage par compétences
 */

import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';

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
  BUG_APP: 'bug_app',
  AUTRE: 'autre',
} as const;

export const TICKET_SERVICE_LABELS: Record<string, string> = {
  apogee: 'Apogée',
  helpconfort: 'HelpConfort',
  apporteur: 'Apporteurs',
  conseil: 'Conseil / Formation',
  bug_app: 'Bug Opéria',
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
// SLA - DEPRECATED (Support V2 sans SLA)
// ============================================
// Les champs due_at et sla_status existent en DB mais ne sont plus utilisés.
// La priorisation se fait via priority (dont 'urgent') et channel_type.

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
  heatPriorityMin?: number;
  heatPriorityMax?: number;
  service?: TicketService | TicketService[];
  support_level?: number;
  assigned_to?: string | null;
  showUnassigned?: boolean;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Récupère tous les Support Users V2 avec leurs compétences
 * Utilise enabled_modules.support au lieu des anciennes colonnes
 */
export async function getAllSupportUsers(): Promise<SupportUser[]> {
  const result = await safeQuery<any[]>(
    supabase
      .from('profiles')
      .select('id, email, first_name, last_name, enabled_modules, support_level')
      .eq('is_active', true),
    'SUPPORT_GET_ALL_USERS'
  );

  if (!result.success) {
    logError('support', 'Error fetching support users', result.error);
    return [];
  }

  // Filtrer les profils avec support activé
  return (result.data || [])
    .filter(profile => {
      const modules = profile.enabled_modules as any;
      if (!modules?.support?.enabled) return false;
      const options = modules.support.options || {};
      return options.agent === true || options.admin === true;
    })
    .map(profile => {
      const modules = profile.enabled_modules as any;
      const options = modules?.support?.options || {};
      return {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        // V2: Utiliser profiles.support_level (colonne) avec fallback sur options.level
        support_level: profile.support_level ?? options.level ?? 1,
        service_competencies: options.skills ? 
          options.skills.reduce((acc: any, skill: string) => ({ ...acc, [skill]: true }), {}) : 
          null,
      };
    });
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
  const eligibleUsers = await getEligibleSupportUsersForTicket(ticketService, targetLevel);

  if (eligibleUsers.length === 0) {
    // Aucun SU éligible trouvé, laisser non assigné
    return { success: true, assignedTo: null };
  }

  // Stratégie round-robin simple : choisir un SU aléatoirement
  const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
  const selectedUser = eligibleUsers[randomIndex];

  // Mettre à jour le ticket avec l'assignation
  const result = await safeMutation(
    supabase
      .from('support_tickets')
      .update({
        assigned_to: selectedUser.id,
        support_level: targetLevel,
      })
      .eq('id', ticketId),
    'SUPPORT_AUTO_ASSIGN_TICKET'
  );

  if (!result.success) {
    logError('support', 'Error auto-assigning ticket', result.error);
    return { 
      success: false, 
      assignedTo: null, 
      error: result.error?.message || 'Unknown error' 
    };
  }

  return { success: true, assignedTo: selectedUser.id };
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
  const ticketResult = await safeQuery<{ escalation_history: any }>(
    supabase
      .from('support_tickets')
      .select('escalation_history')
      .eq('id', ticketId)
      .maybeSingle(),
    'SUPPORT_GET_TICKET_HISTORY'
  );

  const existingHistory = (ticketResult.data?.escalation_history as any[]) || [];
  const newHistoryEntry = {
    from_level: currentLevel,
    to_level: newLevel,
    assigned_to: assignedTo,
    reason: reason || 'Escalade manuelle',
    timestamp: new Date().toISOString(),
  };

  // Mettre à jour le ticket
  const result = await safeMutation(
    supabase
      .from('support_tickets')
      .update({
        support_level: newLevel,
        assigned_to: assignedTo || null,
        escalation_history: [...existingHistory, newHistoryEntry],
        status: TICKET_STATUSES.IN_PROGRESS,
      })
      .eq('id', ticketId),
    'SUPPORT_ESCALATE_TICKET'
  );

  if (!result.success) {
    logError('support', 'Error escalating ticket', result.error);
    return { 
      success: false, 
      error: result.error?.message || 'Unknown error' 
    };
  }

  return { success: true };
}

/**
 * Construit une requête filtrée pour les tickets selon les critères SU
 * Note: Cette fonction retourne une query builder, pas de safeQuery applicable ici
 */
export function buildTicketFilterQuery(
  filters: TicketFilters,
  userCompetencies?: Record<string, boolean> | null,
  userSupportLevel?: number
) {
  let query = supabase.from('support_tickets').select('*');

  // Apply filters
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  // Filtre par heat priority
  if (filters.heatPriorityMin !== undefined) {
    query = query.gte('heat_priority', filters.heatPriorityMin);
  }
  if (filters.heatPriorityMax !== undefined) {
    query = query.lte('heat_priority', filters.heatPriorityMax);
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
 * Basé sur ses compétences et son niveau (V2: profiles.support_level)
 */
export async function getTicketsForSupportUser(
  userId: string,
  filters: TicketFilters = {}
): Promise<any[]> {
  // Récupérer le profil du SU avec support_level (V2 colonne)
  const profileResult = await safeQuery<{ enabled_modules: any; support_level: number | null }>(
    supabase
      .from('profiles')
      .select('enabled_modules, support_level')
      .eq('id', userId)
      .maybeSingle(),
    'SUPPORT_GET_USER_PROFILE'
  );

  if (!profileResult.success || !profileResult.data) {
    logError('support', 'Error fetching user profile for tickets', profileResult.error);
    return [];
  }

  const modules = profileResult.data.enabled_modules as any;
  const options = modules?.support?.options || {};
  // V2: Utiliser profiles.support_level avec fallback sur options.level
  const supportLevel = profileResult.data.support_level ?? options.level ?? 1;
  // Support les deux formats de clés
  const skills = options.skills || options.service_competencies || [];
  const competencies = skills.reduce((acc: any, skill: string) => ({ ...acc, [skill]: true }), {});

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

  if (filters.heatPriorityMin !== undefined) {
    query = query.gte('heat_priority', filters.heatPriorityMin);
  }
  if (filters.heatPriorityMax !== undefined) {
    query = query.lte('heat_priority', filters.heatPriorityMax);
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

  const result = await safeQuery<any[]>(query, 'SUPPORT_GET_TICKETS_FOR_USER');

  if (!result.success) {
    logError('support', 'Error fetching tickets for support user', result.error);
    return [];
  }

  // Filtrer côté client par compétences de service si nécessaire
  let filteredData = result.data || [];
  
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
}

/**
 * Met à jour le statut d'un ticket
 */
export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
): Promise<{ success: boolean; error?: string }> {
  const updateData: any = { status: newStatus };

  // Si résolu ou fermé, ajouter la date de résolution
  if (newStatus === TICKET_STATUSES.RESOLVED || newStatus === TICKET_STATUSES.CLOSED) {
    updateData.resolved_at = new Date().toISOString();
  }

  const result = await safeMutation(
    supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId),
    'SUPPORT_UPDATE_TICKET_STATUS'
  );

  if (!result.success) {
    logError('support', 'Error updating ticket status', result.error);
    return { 
      success: false, 
      error: result.error?.message || 'Unknown error' 
    };
  }

  return { success: true };
}

/**
 * Met à jour la priorité d'un ticket avec heat priority (0-12)
 */
export async function updateTicketPriority(
  ticketId: string,
  newPriority: number
): Promise<{ success: boolean; error?: string }> {
  const result = await safeMutation(
    supabase
      .from('support_tickets')
      .update({ heat_priority: newPriority })
      .eq('id', ticketId),
    'SUPPORT_UPDATE_TICKET_PRIORITY'
  );

  if (!result.success) {
    logError('support', 'Error updating ticket priority', result.error);
    return { 
      success: false, 
      error: result.error?.message || 'Unknown error' 
    };
  }

  return { success: true };
}

/**
 * Met à jour l'assignation d'un ticket
 */
export async function assignTicket(
  ticketId: string,
  userId: string | null
): Promise<{ success: boolean; error?: string }> {
  const result = await safeMutation(
    supabase
      .from('support_tickets')
      .update({ assigned_to: userId })
      .eq('id', ticketId),
    'SUPPORT_ASSIGN_TICKET'
  );

  if (!result.success) {
    logError('support', 'Error assigning ticket', result.error);
    return { 
      success: false, 
      error: result.error?.message || 'Unknown error' 
    };
  }

  return { success: true };
}

/**
 * Met à jour le service d'un ticket
 */
export async function updateTicketService(
  ticketId: string,
  newService: TicketService
): Promise<{ success: boolean; error?: string }> {
  const result = await safeMutation(
    supabase
      .from('support_tickets')
      .update({ service: newService })
      .eq('id', ticketId),
    'SUPPORT_UPDATE_TICKET_SERVICE'
  );

  if (!result.success) {
    logError('support', 'Error updating ticket service', result.error);
    return { 
      success: false, 
      error: result.error?.message || 'Unknown error' 
    };
  }

  return { success: true };
}

/**
 * Met à jour la catégorie d'un ticket
 */
export async function updateTicketCategory(
  ticketId: string,
  newCategory: TicketCategory
): Promise<{ success: boolean; error?: string }> {
  const result = await safeMutation(
    supabase
      .from('support_tickets')
      .update({ category: newCategory })
      .eq('id', ticketId),
    'SUPPORT_UPDATE_TICKET_CATEGORY'
  );

  if (!result.success) {
    logError('support', 'Error updating ticket category', result.error);
    return { 
      success: false, 
      error: result.error?.message || 'Unknown error' 
    };
  }

  return { success: true };
}

/**
 * Envoie un message sur un ticket
 */
export async function sendTicketMessage(
  ticketId: string,
  senderId: string,
  content: string,
  isInternal: boolean = false,
  isFromSupport: boolean = false
): Promise<{ success: boolean; data?: any; error?: string }> {
  const result = await safeMutation(
    supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        message: content,
        is_internal_note: isInternal,
        is_from_support: isFromSupport,
      })
      .select()
      .single(),
    'SUPPORT_SEND_MESSAGE'
  );

  if (!result.success) {
    logError('support', 'Error sending ticket message', result.error);
    return { 
      success: false, 
      error: result.error?.message || 'Unknown error' 
    };
  }

  return { success: true, data: result.data };
}
