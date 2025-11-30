/**
 * RAG utilities for Mme MICHU chatbot
 * Dedicated functions for Apogée knowledge retrieval
 */

import { supabase } from '@/integrations/supabase/client';

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
  };
  similarity?: number;
}

export interface RAGResult {
  chunks: RAGChunk[];
  hasContent: boolean;
  formattedDocs: string;
}

/**
 * Get Apogée RAG context for a question
 * Queries guide_chunks with vector search filtered on metadata.source = 'apogee'
 */
export async function getApogeeContext(question: string): Promise<RAGResult> {
  console.log('[RAG-MICHU] Recherche RAG Apogée pour:', question.substring(0, 100));
  
  try {
    const { data, error } = await supabase.functions.invoke('search-embeddings', {
      body: { 
        query: question, 
        topK: 8,
        source: 'apogee' // Filter strictly on apogee source
      },
    });

    if (error) {
      console.error('[RAG-MICHU] Erreur search-embeddings:', error);
      return { chunks: [], hasContent: false, formattedDocs: '' };
    }

    const results = data?.results;
    
    if (!results || results.length === 0) {
      console.log('[RAG-MICHU] Aucun chunk Apogée trouvé');
      return { chunks: [], hasContent: false, formattedDocs: '' };
    }

    // Map results to RAGChunk format
    const chunks: RAGChunk[] = results.map((r: any) => ({
      chunk_text: r.chunk_text,
      block_title: r.block_title,
      block_slug: r.block_slug,
      metadata: r.metadata || {},
      similarity: r.similarity,
    }));

    console.log(`[RAG-MICHU] ${chunks.length} chunks Apogée trouvés`);
    chunks.forEach((chunk, idx) => {
      const meta = chunk.metadata;
      console.log(`  [${idx + 1}] ${meta.categorie || 'N/A'} - ${meta.section || 'N/A'} (score: ${chunk.similarity?.toFixed(3) || 'N/A'})`);
    });

    // Format docs for injection into prompt
    const formattedDocs = chunks
      .map((chunk, idx) => {
        const meta = chunk.metadata;
        const header = meta.categorie && meta.section 
          ? `[Catégorie: ${meta.categorie} | Section: ${meta.section}]`
          : `[${chunk.block_title}]`;
        return `<doc ${idx + 1}>\n${header}\n${chunk.chunk_text}\n</doc ${idx + 1}>`;
      })
      .join('\n\n');

    return {
      chunks,
      hasContent: true,
      formattedDocs,
    };
  } catch (error) {
    console.error('[RAG-MICHU] Erreur RAG:', error);
    return { chunks: [], hasContent: false, formattedDocs: '' };
  }
}

/**
 * Build the strict Apogée system prompt
 */
export function buildApogeeSystemPrompt(docsContent: string, userName: string): string {
  return `Tu es l'assistant Apogée Help Confort.

📚 DOCUMENTATION APOGÉE :
<docs>
${docsContent}
</docs>

⚠️ RÈGLES STRICTES - AUCUNE DÉROGATION ⚠️

1. Tu réponds UNIQUEMENT à partir du contenu présent dans <docs>.
2. Tu ne fais AUCUNE supposition, AUCUNE invention.
3. Tu donnes des réponses structurées, précises, processuelles.
4. Tu cites toujours la source [Catégorie | Section] pour chaque information.

SI l'information n'est PAS explicitement présente dans <docs>, tu réponds :
"Cette information n'est pas présente dans les guides Apogée actuellement indexés."

Tu ne proposes PAS d'alternative, tu ne suggères PAS de contacter quelqu'un.
Tu dis simplement que l'information n'est pas indexée.

Réponds en français uniquement.`;
}

/**
 * Build the "no content" response
 */
export function getNoContentResponse(): string {
  return "Cette information n'est pas présente dans les guides Apogée actuellement indexés.";
}
