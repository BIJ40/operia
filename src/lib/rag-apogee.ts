/**
 * RAG utilities for Apogee Guides
 * 
 * @deprecated LEGACY FILE - Ces fonctions ne sont plus importées dans l'application.
 * Conservé temporairement pour référence. À supprimer lors du prochain nettoyage.
 * 
 * Le pipeline RAG actuel utilise :
 * - src/lib/rag-michu.ts pour les requêtes chatbot
 * - Les edge functions regenerate-apogee-rag et search-embeddings
 * - Les composants admin/chatbot-rag/* pour l'administration
 */

import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeInvoke } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';

/**
 * Split text into chunks of approximately maxLength characters
 * Splits on sentence boundaries to maintain coherence
 */
export function splitIntoChunks(text: string, maxLength = 800): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

type RegenerateApogeeResponse = {
  success: boolean;
  guides_processed: number;
  chunks_created: number;
  total_guides: number;
  message: string;
  errors?: string[];
};

/**
 * Regenerate all RAG chunks from apogee_guides table
 * Calls the server-side edge function to handle embedding generation
 */
export async function regenerateApogeeChunks(): Promise<{
  success: boolean;
  guidesProcessed: number;
  chunksCreated: number;
  totalGuides: number;
  message: string;
  errors?: string[];
}> {
  const result = await safeInvoke<RegenerateApogeeResponse>(
    supabase.functions.invoke('regenerate-apogee-rag'),
    'RAG_APOGEE_REGENERATE'
  );

  if (!result.success) {
    logError('rag-apogee', 'Error regenerating Apogée chunks', result.error);
    throw new Error(result.error?.message || 'Erreur lors de la régénération');
  }

  const data = result.data!;

  return {
    success: data.success,
    guidesProcessed: data.guides_processed,
    chunksCreated: data.chunks_created,
    totalGuides: data.total_guides,
    message: data.message,
    errors: data.errors,
  };
}

type ChunkStatsRow = {
  block_id: string;
};

/**
 * Get chunk statistics for apogee source
 */
export async function getApogeeChunkStats(): Promise<{
  totalChunks: number;
  uniqueGuides: number;
}> {
  const result = await safeQuery<ChunkStatsRow[]>(
    supabase
      .from('guide_chunks')
      .select('block_id')
      .eq('metadata->>source', 'apogee'),
    'RAG_APOGEE_STATS'
  );

  if (!result.success) {
    logError('rag-apogee', 'Error fetching chunk stats', result.error);
    return { totalChunks: 0, uniqueGuides: 0 };
  }

  const data = result.data || [];
  const uniqueGuideIds = new Set(data.map(c => c.block_id));
  
  return {
    totalChunks: data.length,
    uniqueGuides: uniqueGuideIds.size,
  };
}
