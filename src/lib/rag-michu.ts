/**
 * RAG utilities for Mme MICHU chatbot
 * Pipeline RAG unifié - P2 Multi-contextes
 * + P2#4 Ingestion avancée
 */

import { supabase } from '@/integrations/supabase/client';
import { safeInvoke } from '@/lib/safeQuery';
import { logDebug, logError, logInfo } from '@/lib/logger';

// ============ TYPES ============

export type RAGContextType = 'apogee' | 'apporteurs' | 'helpconfort' | 'documents' | 'metier' | 'franchise' | 'auto';

export interface RAGSearchParams {
  query: string;
  contextType?: RAGContextType;
  topK?: number;
  minSimilarity?: number;
  // P2 Multi-contextes params
  apporteurCode?: string;
  universCode?: string;
  roleCible?: string;
}

export interface RAGChunk {
  chunk_text: string;
  block_title: string;
  block_slug: string;
  metadata: {
    source?: string;
    categorie?: string;
    section?: string;
    titre?: string;
    tags?: string;
    family?: string;
    apporteur_code?: string;
    univers_code?: string;
    role_cible?: string;
  };
  similarity?: number;
}

export interface RAGResult {
  chunks: RAGChunk[];
  hasContent: boolean;
  formattedDocs: string;
  contextUsed: RAGContextType;
}

type SearchEmbeddingsResponse = {
  results: Array<{
    chunk_text: string;
    block_title: string;
    block_slug: string;
    metadata: Record<string, unknown>;
    similarity?: number;
  }>;
};

// ============ CONTEXT DETECTION (AUTO MODE) ============

const CONTEXT_PATTERNS: Record<RAGContextType, RegExp[]> = {
  apogee: [
    /apog[eé]e/i,
    /dossier/i,
    /devis/i,
    /factur/i,
    /intervention/i,
    /planif/i,
    /technicien/i,
  ],
  apporteurs: [
    /apporteur/i,
    /partenaire/i,
    /r[eé]f[eé]rent/i,
    /commission/i,
    /contrat apporteur/i,
  ],
  helpconfort: [
    /help\s*confort/i,
    /r[eé]seau/i,
    /agence/i,
    /proc[eé]dure/i,
  ],
  metier: [
    /menuiserie/i,
    /plomberie/i,
    /[eé]lectricit[eé]/i,
    /chauffage/i,
    /climatisation/i,
    /serrurerie/i,
  ],
  franchise: [
    /franchise/i,
    /redevance/i,
    /franchis[eé]/i,
    /t[eê]te de r[eé]seau/i,
  ],
  documents: [
    /document/i,
    /fichier/i,
    /pdf/i,
    /pi[eè]ce jointe/i,
  ],
  auto: [],
};

/**
 * Detect context from question text using pattern matching
 */
export function detectContext(question: string): RAGContextType {
  const scores: Record<RAGContextType, number> = {
    apogee: 0,
    apporteurs: 0,
    helpconfort: 0,
    metier: 0,
    franchise: 0,
    documents: 0,
    auto: 0,
  };

  for (const [ctx, patterns] of Object.entries(CONTEXT_PATTERNS)) {
    if (ctx === 'auto') continue;
    for (const pattern of patterns) {
      if (pattern.test(question)) {
        scores[ctx as RAGContextType] += 1;
      }
    }
  }

  // Find best match
  let bestCtx: RAGContextType = 'apogee'; // Default
  let bestScore = 0;
  for (const [ctx, score] of Object.entries(scores)) {
    if (ctx !== 'auto' && score > bestScore) {
      bestScore = score;
      bestCtx = ctx as RAGContextType;
    }
  }

  logDebug(`[RAG-MICHU] Auto-detect context: ${bestCtx} (score: ${bestScore})`);
  return bestCtx;
}

/**
 * Detect context from document text (alias for detectContext)
 * Used by ingestion pipeline
 */
export function detectContextFromText(text: string): RAGContextType {
  return detectContext(text);
}

// ============ CHUNKING ============

export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
}

/**
 * Split text into chunks for embedding
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const { maxChunkSize = 1500, overlap = 200 } = options;
  
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (currentChunk.length + trimmedPara.length + 2 <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // Keep overlap
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + '\n\n' + trimmedPara;
      } else {
        // Single paragraph too long - split by sentences
        const sentences = trimmedPara.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  logInfo('rag-michu', `Chunked text into ${chunks.length} chunks`);
  return chunks;
}

// ============ MAIN SEARCH FUNCTION ============

/**
 * Universal RAG search - supports all contexts
 */
export async function searchRAG(params: RAGSearchParams): Promise<RAGResult> {
  const {
    query,
    contextType = 'apogee',
    topK = 8,
    minSimilarity = 0.3,
    apporteurCode,
    universCode,
    roleCible,
  } = params;

  // Resolve AUTO context
  const resolvedContext = contextType === 'auto' ? detectContext(query) : contextType;
  
  logDebug(`[RAG-MICHU] Recherche RAG [${resolvedContext}] pour:`, query.substring(0, 100));

  const result = await safeInvoke<SearchEmbeddingsResponse>(
    supabase.functions.invoke('search-embeddings', {
      body: {
        query,
        topK,
        source: resolvedContext,
        minSimilarity,
        // P2 filters
        apporteurCode,
        universCode,
        roleCible,
      },
    }),
    'RAG_MICHU_SEARCH'
  );

  if (!result.success) {
    logError('rag-michu', 'Erreur search-embeddings', result.error);
    return { chunks: [], hasContent: false, formattedDocs: '', contextUsed: resolvedContext };
  }

  const results = result.data?.results || [];

  if (results.length === 0) {
    logDebug(`[RAG-MICHU] Aucun chunk trouvé pour [${resolvedContext}]`);
    return { chunks: [], hasContent: false, formattedDocs: '', contextUsed: resolvedContext };
  }

  // Map results to RAGChunk format
  const chunks: RAGChunk[] = results.map((r) => ({
    chunk_text: r.chunk_text,
    block_title: r.block_title,
    block_slug: r.block_slug,
    metadata: (r.metadata || {}) as RAGChunk['metadata'],
    similarity: r.similarity,
  }));

  logDebug(`[RAG-MICHU] ${chunks.length} chunks [${resolvedContext}] trouvés`);

  // Format docs for injection into prompt
  const formattedDocs = formatChunksForPrompt(chunks, resolvedContext);

  return {
    chunks,
    hasContent: true,
    formattedDocs,
    contextUsed: resolvedContext,
  };
}

/**
 * Legacy function - wraps searchRAG for Apogée
 */
export async function getApogeeContext(question: string): Promise<RAGResult> {
  return searchRAG({ query: question, contextType: 'apogee' });
}

// ============ PROMPT BUILDERS ============

/**
 * Format chunks for prompt injection
 */
function formatChunksForPrompt(chunks: RAGChunk[], context: RAGContextType): string {
  return chunks
    .map((chunk, idx) => {
      const meta = chunk.metadata;
      const header = meta.categorie && meta.section
        ? `[Catégorie: ${meta.categorie} | Section: ${meta.section}]`
        : `[${chunk.block_title}]`;
      return `<doc ${idx + 1}>\n${header}\n${chunk.chunk_text}\n</doc ${idx + 1}>`;
    })
    .join('\n\n');
}

const CONTEXT_NAMES: Record<RAGContextType, string> = {
  apogee: 'Apogée',
  apporteurs: 'Apporteurs',
  helpconfort: 'HelpConfort',
  metier: 'Métiers',
  franchise: 'Franchise',
  documents: 'Documents',
  auto: 'Auto',
};

/**
 * Build system prompt for any context
 */
export function buildSystemPrompt(docsContent: string, context: RAGContextType): string {
  const contextName = CONTEXT_NAMES[context] || 'Apogée';
  
  return `Tu es l'assistant ${contextName} Help Confort.

📚 DOCUMENTATION ${contextName.toUpperCase()} :
<docs>
${docsContent}
</docs>

⚠️ RÈGLES STRICTES - AUCUNE DÉROGATION ⚠️

1. Tu réponds UNIQUEMENT à partir du contenu présent dans <docs>.
2. Tu ne fais AUCUNE supposition, AUCUNE invention.
3. Tu donnes des réponses structurées, précises, processuelles.
4. Tu cites toujours la source [Catégorie | Section] pour chaque information.

SI l'information n'est PAS explicitement présente dans <docs>, tu réponds :
"Cette information n'est pas présente dans les guides ${contextName} actuellement indexés."

Tu ne proposes PAS d'alternative, tu ne suggères PAS de contacter quelqu'un.
Tu dis simplement que l'information n'est pas indexée.

Réponds en français uniquement.`;
}

/**
 * Legacy function - wraps buildSystemPrompt for Apogée
 */
export function buildApogeeSystemPrompt(docsContent: string, _userName: string): string {
  return buildSystemPrompt(docsContent, 'apogee');
}

/**
 * Build the "no content" response
 */
export function getNoContentResponse(context: RAGContextType = 'apogee'): string {
  const contextName = CONTEXT_NAMES[context] || 'Apogée';
  return `Cette information n'est pas présente dans les guides ${contextName} actuellement indexés.`;
}

// ============ SUGGESTIONS PAR CONTEXTE ============

export const CONTEXT_SUGGESTIONS: Record<RAGContextType, string[]> = {
  apogee: [
    "Comment créer un devis dans Apogée ?",
    "Quelle est la procédure pour planifier une intervention ?",
    "Comment gérer un SAV dans Apogée ?",
  ],
  apporteurs: [
    "Comment ajouter un nouvel apporteur ?",
    "Quel est le processus de validation d'un contrat apporteur ?",
    "Comment calculer les commissions apporteurs ?",
  ],
  helpconfort: [
    "Quelles sont les procédures réseau Help Confort ?",
    "Comment fonctionne le système de franchise ?",
    "Quels sont les standards qualité de l'agence ?",
  ],
  metier: [
    "Quelles sont les compétences requises en plomberie ?",
    "Comment intervenir sur une menuiserie PVC ?",
  ],
  franchise: [
    "Comment fonctionne le calcul des redevances ?",
    "Quelles sont les obligations du franchisé ?",
  ],
  documents: [
    "Où trouver les modèles de contrat ?",
    "Comment accéder aux documents de formation ?",
  ],
  auto: [],
};
