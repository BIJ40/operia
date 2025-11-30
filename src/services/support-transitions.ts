/**
 * Support V2 - Transitions et règles de channel_type
 * PHASE 1 : Fondations critiques
 * 
 * channel_type: 'chat_ai' | 'chat_human' | 'ticket'
 * Un ticket urgent = type 'ticket' + priority 'urgent'
 */

// ============================================
// TYPES
// ============================================

export type ChannelType = 'chat_ai' | 'chat_human' | 'ticket';

export interface TransitionResult {
  allowed: boolean;
  error?: string;
}

// ============================================
// TRANSITIONS AUTORISÉES
// ============================================

/**
 * Matrice des transitions autorisées
 * Clé = from_type, Valeur = liste des to_type autorisés
 */
const ALLOWED_TRANSITIONS: Record<ChannelType, ChannelType[]> = {
  chat_ai: ['chat_human', 'ticket'],    // IA peut escalader vers humain ou devenir ticket
  chat_human: ['ticket'],               // Chat humain peut devenir ticket
  ticket: [],                           // Un ticket reste un ticket (pas de retour)
};

/**
 * Vérifie si une transition est autorisée
 */
export function canTransition(fromType: ChannelType, toType: ChannelType): TransitionResult {
  // Même type = pas de transition nécessaire
  if (fromType === toType) {
    return { allowed: true };
  }

  const allowedTargets = ALLOWED_TRANSITIONS[fromType] || [];
  
  if (allowedTargets.includes(toType)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: `Transition non autorisée: ${fromType} → ${toType}`,
  };
}

// ============================================
// MESSAGES SYSTÈME SUPPORT V2
// ============================================

export const SYSTEM_MESSAGES = {
  /** Message affiché quand un SU prend la main sur un chat IA */
  SU_JOINED: 'Un conseiller a rejoint la conversation.',
  
  /** Message affiché quand un SU est déconnecté */
  SU_DISCONNECTED: (name: string) => `${name} a été déconnecté. Veuillez patienter ou créer un ticket urgent.`,
  
  /** Message affiché quand aucun SU n'est disponible (boucle minute) */
  NO_SU_AVAILABLE: 'Un conseiller n\'est pas encore disponible. Souhaitez-vous créer un ticket urgent ?',
  
  /** Message affiché quand le chat est converti en ticket */
  CONVERTED_TO_TICKET: 'Votre demande a été transformée en ticket. Vous pouvez la suivre dans votre centre de gestion.',
  
  /** Message affiché quand le chat est converti en ticket urgent */
  CONVERTED_TO_URGENT_TICKET: 'Votre demande a été transformée en ticket urgent. Vous pouvez la suivre dans votre centre de gestion.',
  
  /** Message affiché lors de l'inactivité utilisateur */
  USER_INACTIVE: 'Votre demande a été transférée en ticket. Vous pouvez la retrouver dans votre centre de gestion.',
};

// ============================================
// PRIORITÉS (Option A: pas de type ticket_urgent)
// ============================================

export const SUPPORT_PRIORITIES = {
  MINEUR: 'mineur',
  NORMAL: 'normal',
  IMPORTANT: 'important',
  URGENT: 'urgent',
  BLOQUANT: 'bloquant',
} as const;

export type SupportPriority = typeof SUPPORT_PRIORITIES[keyof typeof SUPPORT_PRIORITIES];

/**
 * Vérifie si un ticket est considéré comme urgent
 * Un ticket urgent = priority 'urgent' ou 'bloquant'
 */
export function isUrgentTicket(priority: string | null): boolean {
  return priority === SUPPORT_PRIORITIES.URGENT || priority === SUPPORT_PRIORITIES.BLOQUANT;
}

// ============================================
// STATUTS
// ============================================

export const SUPPORT_STATUSES = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  WAITING_USER: 'waiting_user',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export type SupportStatus = typeof SUPPORT_STATUSES[keyof typeof SUPPORT_STATUSES];

// ============================================
// HELPERS
// ============================================

/**
 * Détermine la priorité par défaut selon le contexte de création
 */
export function getDefaultPriority(context: {
  fromMinuteLoop?: boolean;
  isDirectSupport?: boolean;
  fromChatAI?: boolean;
}): SupportPriority {
  // Création depuis boucle minute = urgent
  if (context.fromMinuteLoop) {
    return SUPPORT_PRIORITIES.URGENT;
  }
  // Support direct (chat humain) = normal par défaut
  if (context.isDirectSupport) {
    return SUPPORT_PRIORITIES.NORMAL;
  }
  // Depuis chat IA converti = normal
  if (context.fromChatAI) {
    return SUPPORT_PRIORITIES.NORMAL;
  }
  return SUPPORT_PRIORITIES.NORMAL;
}

/**
 * Labels pour l'affichage
 */
export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  chat_ai: 'Chat IA',
  chat_human: 'Chat Support',
  ticket: 'Ticket',
};
