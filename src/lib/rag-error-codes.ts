/**
 * RAG Error Codes Reference
 * 
 * Ce fichier centralise tous les codes d'erreur utilisés dans le module RAG.
 * Les codes suivent le pattern : [MODULE]_[ACTION]_[DETAIL]
 * 
 * Namespaces logError utilisés :
 * - rag-chat      : Chatbot et interactions utilisateur
 * - rag-michu     : Recherche RAG pour Mme Michu
 * - rag-index     : Administration de l'index RAG
 * - rag-sources   : Gestion des sources RAG
 * - rag-questions : Historique des questions
 * - rag-debug     : Interface de debug RAG
 */

export const RAG_ERROR_CODES = {
  // === Chatbot (use-chatbot.ts, Chatbot.tsx) ===
  CHAT_SEARCH_EMBEDDINGS: 'CHAT_SEARCH_EMBEDDINGS',
  CHAT_PROFILE_LOAD: 'CHAT_PROFILE_LOAD',
  CHAT_PROFILE_LOAD_FOR_TICKET: 'CHAT_PROFILE_LOAD_FOR_TICKET',
  CHAT_SUPPORT_MESSAGE_CREATE: 'CHAT_SUPPORT_MESSAGE_CREATE',
  CHAT_TICKET_CREATE: 'CHAT_TICKET_CREATE',
  CHAT_TICKET_INITIAL_MESSAGE: 'CHAT_TICKET_INITIAL_MESSAGE',
  CHAT_NOTIFY_SUPPORT_TICKET: 'CHAT_NOTIFY_SUPPORT_TICKET',
  CHATBOT_ACTIVE_TICKET_CHECK: 'CHATBOT_ACTIVE_TICKET_CHECK',
  CHATBOT_TICKET_MESSAGES_LOAD: 'CHATBOT_TICKET_MESSAGES_LOAD',
  CHATBOT_TICKET_RATING_UPDATE: 'CHATBOT_TICKET_RATING_UPDATE',
  CHATBOT_TICKET_CLOSE: 'CHATBOT_TICKET_CLOSE',

  // === RAG Michu (rag-michu.ts) ===
  RAG_MICHU_SEARCH_EMBEDDINGS: 'RAG_MICHU_SEARCH_EMBEDDINGS',

  // === RAG Index Admin (RagIndexTab.tsx) ===
  RAG_INDEX_LOAD_CHUNKS: 'RAG_INDEX_LOAD_CHUNKS',
  RAG_INDEX_LOAD_DOCUMENTS: 'RAG_INDEX_LOAD_DOCUMENTS',
  RAG_INDEX_INVOKE_REBUILD_APOGEE: 'RAG_INDEX_INVOKE_REBUILD_APOGEE',
  RAG_INDEX_INVOKE_INDEX_DOCUMENT: 'RAG_INDEX_INVOKE_INDEX_DOCUMENT',
  RAG_INDEX_PURGE: 'RAG_INDEX_PURGE',

  // === RAG Sources Admin (RagSourcesTab.tsx) ===
  RAG_SOURCES_LOAD_APOGEE_BLOCKS: 'RAG_SOURCES_LOAD_APOGEE_BLOCKS',
  RAG_SOURCES_LOAD_HELPCONFORT_BLOCKS: 'RAG_SOURCES_LOAD_HELPCONFORT_BLOCKS',
  RAG_SOURCES_LOAD_APPORTEUR_BLOCKS: 'RAG_SOURCES_LOAD_APPORTEUR_BLOCKS',
  RAG_SOURCES_LOAD_CHUNKS: 'RAG_SOURCES_LOAD_CHUNKS',
  RAG_SOURCES_INDEX_APOGEE: 'RAG_SOURCES_INDEX_APOGEE',
  RAG_SOURCES_INDEX_HELPCONFORT: 'RAG_SOURCES_INDEX_HELPCONFORT',

  // === RAG Questions Admin (RagQuestionsTab.tsx) ===
  RAG_QUESTIONS_LOAD: 'RAG_QUESTIONS_LOAD',
  RAG_QUESTIONS_UPDATE_STATUS: 'RAG_QUESTIONS_UPDATE_STATUS',
  RAG_QUESTIONS_UPDATE_NOTES: 'RAG_QUESTIONS_UPDATE_NOTES',

  // === RAG Debug Admin (RagDebugTab.tsx) ===
  RAG_DEBUG_SEARCH: 'RAG_DEBUG_SEARCH',
} as const;

export type RagErrorCode = typeof RAG_ERROR_CODES[keyof typeof RAG_ERROR_CODES];

/**
 * Namespaces de logging utilisés dans le module RAG
 */
export const RAG_LOG_NAMESPACES = [
  'rag-chat',
  'rag-michu',
  'rag-index',
  'rag-sources',
  'rag-questions',
  'rag-debug',
] as const;

export type RagLogNamespace = typeof RAG_LOG_NAMESPACES[number];
