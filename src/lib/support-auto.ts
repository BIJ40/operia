/**
 * P3#2 - Pipeline IA pour auto-catégorisation des tickets support
 * Intégration RAG + FAQ pour suggestions intelligentes
 */

import { supabase } from '@/integrations/supabase/client';
import { safeInvoke, safeQuery } from '@/lib/safeQuery';
import { logDebug, logError, logInfo } from '@/lib/logger';

// ============ TYPES ============

export interface SupportTicketInput {
  id?: string;
  subject: string;
  content?: string;
  chatbot_conversation?: any;
  service?: string | null;
  user_id?: string;
  agence?: string | null;
}

export interface AIClassificationResult {
  success: boolean;
  category: string | null;
  priority: string | null;
  confidence: number;
  isIncomplete: boolean;
  incompleteReasons: string[];
  suggestedAnswer: string | null;
  suggestedAnswerSource: 'faq' | 'rag' | 'template' | null;
  tags: string[];
  error?: string;
}

export interface ClassifyTicketResponse {
  classification: AIClassificationResult;
}

// ============ CONSTANTES ============

export const AI_CATEGORIES = {
  BUG: 'bug',
  QUESTION: 'question',
  BLOCAGE: 'blocage',
  FACTURATION: 'facturation',
  PLANNING: 'planning',
  DROITS: 'droits',
  APPORTEURS: 'apporteurs',
  AMELIORATION: 'amelioration',
  AUTRE: 'autre',
} as const;

export const AI_CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  question: 'Question',
  blocage: 'Blocage',
  facturation: 'Facturation',
  planning: 'Planning',
  droits: 'Droits',
  apporteurs: 'Apporteurs',
  amelioration: 'Amélioration',
  autre: 'Autre',
};

export const AI_PRIORITIES = {
  BLOQUANT: 'bloquant',
  URGENT: 'urgent',
  IMPORTANT: 'important',
  NORMAL: 'normal',
} as const;

export const AI_TAGS = [
  'planning',
  'facturation',
  'bug',
  'apogee',
  'metier',
  'apporteur',
  'devis',
  'dossier',
  'technicien',
  'intervention',
  'sav',
  'compta',
  'droits',
  'mobile',
] as const;

// Patterns pour détection d'incomplétion
const INCOMPLETE_PATTERNS = {
  vague_description: [
    /^ça (marche|fonctionne) (pas|plus)$/i,
    /^(ça|c'est|ca) (bug|plante|bloque)$/i,
    /^(problème|erreur|souci)$/i,
    /^aide$/i,
    /^help$/i,
    /^urgent$/i,
  ],
  missing_context: [
    /^[^.!?]{0,30}$/,  // Description trop courte
  ],
};

// Patterns pour détection de catégorie
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  bug: [
    /bug/i, /erreur/i, /plante/i, /crash/i, /ne (marche|fonctionne) (pas|plus)/i,
    /bloqué/i, /écran blanc/i, /page blanche/i, /500/i, /404/i,
  ],
  blocage: [
    /bloqu(é|ant|age)/i, /impossible de/i, /ne peut pas/i, /urgent/i, /critique/i,
    /production bloquée/i, /plus rien ne marche/i,
  ],
  question: [
    /comment/i, /pourquoi/i, /où/i, /quand/i, /qui/i, /quel/i,
    /\?$/, /aide/i, /besoin d'aide/i, /expliquer/i,
  ],
  facturation: [
    /factur/i, /règlement/i, /paiement/i, /compta/i, /avoir/i, /crédit/i,
    /montant/i, /prix/i, /tarif/i, /devis/i,
  ],
  planning: [
    /planning/i, /rendez-vous/i, /rdv/i, /planif/i, /intervention/i,
    /agenda/i, /créneau/i, /disponibilité/i,
  ],
  droits: [
    /droit/i, /accès/i, /permission/i, /autoris/i, /refusé/i,
    /mot de passe/i, /connexion/i, /login/i,
  ],
  apporteurs: [
    /apporteur/i, /partenaire/i, /pmt/i, /domus/i, /elyade/i, /commission/i,
  ],
  amelioration: [
    /amélioration/i, /suggestion/i, /idée/i, /serait bien/i, /pourrait/i,
    /ajouter/i, /nouvelle fonctionnalité/i,
  ],
};

// Patterns pour tags
const TAG_PATTERNS: Record<string, RegExp[]> = {
  planning: [/planning/i, /intervention/i, /rdv/i, /créneau/i],
  facturation: [/factur/i, /devis/i, /prix/i, /montant/i],
  bug: [/bug/i, /erreur/i, /plante/i],
  apogee: [/apogée/i, /apogee/i, /logiciel/i],
  metier: [/menuiserie/i, /plomberie/i, /électricité/i, /chauffage/i],
  apporteur: [/apporteur/i, /pmt/i, /domus/i, /partenaire/i],
  devis: [/devis/i, /chiffrage/i, /estimation/i],
  dossier: [/dossier/i, /projet/i, /client/i],
  technicien: [/technicien/i, /tech/i, /intervenant/i],
  intervention: [/intervention/i, /chantier/i, /travaux/i],
  sav: [/sav/i, /garantie/i, /réclamation/i],
  compta: [/compta/i, /comptab/i, /export/i],
  droits: [/droit/i, /accès/i, /permission/i],
  mobile: [/mobile/i, /application/i, /tablette/i, /smartphone/i],
};

// ============ FONCTIONS UTILITAIRES ============

/**
 * Détecte si le ticket est incomplet
 */
function detectIncomplete(subject: string, content?: string): { isIncomplete: boolean; reasons: string[] } {
  const fullText = `${subject} ${content || ''}`.trim();
  const reasons: string[] = [];

  // Vérifier description vague
  for (const pattern of INCOMPLETE_PATTERNS.vague_description) {
    if (pattern.test(fullText)) {
      reasons.push('Description trop vague');
      break;
    }
  }

  // Vérifier description trop courte
  if (fullText.length < 20) {
    reasons.push('Description trop courte');
  }

  // Vérifier absence de contexte
  if (!content || content.trim().length < 10) {
    reasons.push('Contenu manquant ou insuffisant');
  }

  // Pas de mention de numéro de dossier quand c'est pertinent
  const needsDossier = /dossier|projet|client|intervention/i.test(fullText);
  const hasDossier = /\d{4,}|n°|numéro|ref/i.test(fullText);
  if (needsDossier && !hasDossier) {
    reasons.push('Numéro de dossier/référence manquant');
  }

  return {
    isIncomplete: reasons.length > 0,
    reasons,
  };
}

/**
 * Détecte la catégorie locale (sans IA)
 */
function detectCategoryLocal(text: string): { category: string; confidence: number } {
  const scores: Record<string, number> = {};

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    scores[category] = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[category]++;
      }
    }
  }

  // Trouver la meilleure catégorie
  let bestCategory = 'autre';
  let bestScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Calculer confiance basée sur le score
  const confidence = Math.min(bestScore / 3, 1); // Max 1.0 si 3+ matches

  return { category: bestCategory, confidence };
}

/**
 * Détecte la priorité basée sur le contenu
 */
function detectPriorityLocal(text: string, category: string): string {
  const lowerText = text.toLowerCase();

  // Bloquant si blocage ou urgence critique
  if (category === 'blocage' || /urgent|critique|bloquant|prod/i.test(lowerText)) {
    return 'bloquant';
  }

  // Urgent si bug avec mots clés urgents
  if (category === 'bug' && /ne marche plus|plus rien|impossible/i.test(lowerText)) {
    return 'urgent';
  }

  // Important si bug standard
  if (category === 'bug') {
    return 'important';
  }

  // Normal par défaut
  return 'normal';
}

/**
 * Détecte les tags pertinents
 */
function detectTags(text: string): string[] {
  const tags: string[] = [];

  for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
        break;
      }
    }
  }

  return tags;
}

// ============ RECHERCHE FAQ/RAG ============

interface FAQItem {
  question: string;
  answer: string;
  context_type: string;
}

/**
 * Recherche dans la FAQ pour suggestion de réponse
 */
async function searchFAQ(query: string): Promise<{ answer: string | null; found: boolean }> {
  const result = await safeQuery<FAQItem[]>(
    supabase
      .from('faq_items')
      .select('question, answer, context_type')
      .eq('is_published', true)
      .textSearch('question', query.split(' ').slice(0, 5).join(' | '), { type: 'websearch' })
      .limit(3),
    'SUPPORT_AUTO_SEARCH_FAQ'
  );

  if (!result.success || !result.data || result.data.length === 0) {
    return { answer: null, found: false };
  }

  // Prendre la première réponse trouvée
  return { answer: result.data[0].answer, found: true };
}

/**
 * Recherche RAG pour contexte
 */
async function searchRAGForSupport(query: string): Promise<{ answer: string | null; found: boolean }> {
  const result = await safeInvoke<{ results: Array<{ chunk_text: string; block_title: string }> }>(
    supabase.functions.invoke('search-embeddings', {
      body: {
        query,
        topK: 3,
        source: 'apogee',
        minSimilarity: 0.5,
      },
    }),
    'SUPPORT_AUTO_SEARCH_RAG'
  );

  if (!result.success || !result.data?.results || result.data.results.length === 0) {
    return { answer: null, found: false };
  }

  // Construire une réponse à partir des chunks
  const chunks = result.data.results;
  const formattedAnswer = chunks
    .map(c => `**${c.block_title}**\n${c.chunk_text.substring(0, 300)}...`)
    .join('\n\n');

  return { answer: formattedAnswer, found: true };
}

// ============ PIPELINE PRINCIPAL ============

/**
 * Classification locale (sans appel IA externe) - rapide
 */
export function classifySupportTicketLocal(input: SupportTicketInput): AIClassificationResult {
  const fullText = `${input.subject} ${input.content || ''}`.trim();

  // Détecter incomplétude
  const { isIncomplete, reasons } = detectIncomplete(input.subject, input.content);

  // Détecter catégorie
  const { category, confidence } = detectCategoryLocal(fullText);

  // Détecter priorité
  const priority = detectPriorityLocal(fullText, category);

  // Détecter tags
  const tags = detectTags(fullText);

  logDebug('[SUPPORT-AUTO] Classification locale:', { category, priority, confidence, tags });

  return {
    success: true,
    category,
    priority,
    confidence,
    isIncomplete,
    incompleteReasons: reasons,
    suggestedAnswer: null,
    suggestedAnswerSource: null,
    tags,
  };
}

/**
 * Classification complète avec recherche FAQ/RAG
 */
export async function classifySupportTicket(input: SupportTicketInput): Promise<AIClassificationResult> {
  const fullText = `${input.subject} ${input.content || ''}`.trim();

  logInfo('support-auto', `Classification ticket: ${input.subject.substring(0, 50)}...`);

  // Étape 1: Classification locale
  const localResult = classifySupportTicketLocal(input);

  // Étape 2: Recherche suggestion réponse (FAQ puis RAG)
  let suggestedAnswer: string | null = null;
  let suggestedAnswerSource: 'faq' | 'rag' | null = null;

  // Chercher dans FAQ d'abord
  const faqResult = await searchFAQ(fullText);
  if (faqResult.found && faqResult.answer) {
    suggestedAnswer = faqResult.answer;
    suggestedAnswerSource = 'faq';
    logDebug('[SUPPORT-AUTO] Réponse FAQ trouvée');
  } else {
    // Sinon chercher dans RAG
    const ragResult = await searchRAGForSupport(fullText);
    if (ragResult.found && ragResult.answer) {
      suggestedAnswer = ragResult.answer;
      suggestedAnswerSource = 'rag';
      logDebug('[SUPPORT-AUTO] Contexte RAG trouvé');
    }
  }

  return {
    ...localResult,
    suggestedAnswer,
    suggestedAnswerSource,
    // Augmenter confiance si on a trouvé une suggestion
    confidence: suggestedAnswer ? Math.min(localResult.confidence + 0.2, 1) : localResult.confidence,
  };
}

/**
 * Appel edge function pour classification IA complète
 */
export async function classifySupportTicketWithAI(ticketId: string): Promise<AIClassificationResult> {
  const result = await safeInvoke<ClassifyTicketResponse>(
    supabase.functions.invoke('support-auto-classify', {
      body: { ticket_id: ticketId },
    }),
    'SUPPORT_AUTO_CLASSIFY_AI'
  );

  if (!result.success || !result.data) {
    logError('support-auto', 'Erreur classification IA', result.error);
    return {
      success: false,
      category: null,
      priority: null,
      confidence: 0,
      isIncomplete: false,
      incompleteReasons: [],
      suggestedAnswer: null,
      suggestedAnswerSource: null,
      tags: [],
      error: result.error?.message || 'Erreur classification IA',
    };
  }

  return result.data.classification;
}

/**
 * Applique la classification IA à un ticket
 */
export async function applyAIClassification(
  ticketId: string,
  classification: AIClassificationResult
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('support_tickets')
    .update({
      ai_category: classification.category,
      ai_priority: classification.priority,
      ai_confidence: classification.confidence,
      ai_suggested_answer: classification.suggestedAnswer,
      ai_is_incomplete: classification.isIncomplete,
      ai_tags: classification.tags,
      auto_classified: true,
      ai_classified_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  if (error) {
    logError('support-auto', 'Erreur application classification', error);
    return { success: false, error: error.message };
  }

  logInfo('support-auto', `Classification appliquée au ticket ${ticketId}`);
  return { success: true };
}

/**
 * Reclassifie un ticket avec l'IA
 */
export async function reclassifyTicket(ticketId: string): Promise<AIClassificationResult> {
  // Récupérer le ticket
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('id, subject, chatbot_conversation, service')
    .eq('id', ticketId)
    .maybeSingle();

  if (error || !ticket) {
    return {
      success: false,
      category: null,
      priority: null,
      confidence: 0,
      isIncomplete: false,
      incompleteReasons: [],
      suggestedAnswer: null,
      suggestedAnswerSource: null,
      tags: [],
      error: 'Ticket non trouvé',
    };
  }

  // Extraire le contenu de la conversation chatbot
  let content = '';
  if (ticket.chatbot_conversation && Array.isArray(ticket.chatbot_conversation)) {
    content = ticket.chatbot_conversation
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content)
      .join('\n');
  }

  // Classifier
  const classification = await classifySupportTicket({
    id: ticket.id,
    subject: ticket.subject,
    content,
    service: ticket.service,
  });

  // Appliquer
  if (classification.success) {
    await applyAIClassification(ticketId, classification);
  }

  return classification;
}
