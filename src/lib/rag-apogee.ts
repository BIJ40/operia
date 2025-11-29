/**
 * RAG utilities for Apogee Guides
 * 
 * This file provides client-side utilities for the RAG pipeline.
 * The actual embedding generation and chunk storage is done server-side
 * via the regenerate-apogee-rag edge function.
 */

import { supabase } from '@/integrations/supabase/client';

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
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-apogee-rag`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Erreur lors de la régénération');
  }

  return {
    success: result.success,
    guidesProcessed: result.guides_processed,
    chunksCreated: result.chunks_created,
    totalGuides: result.total_guides,
    message: result.message,
    errors: result.errors,
  };
}

/**
 * Get chunk statistics for apogee source
 */
export async function getApogeeChunkStats(): Promise<{
  totalChunks: number;
  uniqueGuides: number;
}> {
  const { data, error } = await supabase
    .from('guide_chunks')
    .select('block_id')
    .eq('metadata->>source', 'apogee');

  if (error) {
    console.error('[RAG] Error fetching chunk stats:', error);
    return { totalChunks: 0, uniqueGuides: 0 };
  }

  const uniqueGuideIds = new Set(data?.map(c => c.block_id) || []);
  
  return {
    totalChunks: data?.length || 0,
    uniqueGuides: uniqueGuideIds.size,
  };
}
