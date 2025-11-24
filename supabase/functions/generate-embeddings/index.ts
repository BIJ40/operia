import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text chunking function
function chunkText(text: string, maxChunkSize: number = 500): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
}

// Generate embedding using OpenAI text-embedding-3-small
async function generateEmbedding(text: string): Promise<number[]> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000), // OpenAI limit
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate embedding: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding; // Returns 1536-dimensional vector
}

// Clean HTML content
function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<img[^>]*>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { blockIds, batchSize = 50 } = await req.json();

    // Fetch blocks to index
    let query = supabase
      .from('blocks')
      .select('*')
      .order('created_at')
      .limit(batchSize); // Limiter pour éviter les timeouts

    if (blockIds && blockIds.length > 0) {
      query = query.in('id', blockIds);
    }

    const { data: blocks, error: blocksError } = await query;

    if (blocksError) {
      throw blocksError;
    }

    console.log(`Indexing ${blocks?.length || 0} blocks (batch size: ${batchSize})`);

    let totalChunks = 0;
    let processedBlocks = 0;

    for (const block of blocks || []) {
      try {
        // Delete existing chunks for this block
        await supabase
          .from('guide_chunks')
          .delete()
          .eq('block_id', block.id);

        // Clean and prepare content
        const cleanContent = cleanHtml(block.content);
        if (!cleanContent || cleanContent.length < 50) {
          console.log(`Skipping block ${block.id} - insufficient content`);
          continue;
        }

        // Create chunks
        const chunks = chunkText(cleanContent, 500);
        console.log(`Block ${block.id} split into ${chunks.length} chunks`);

        // Generate embeddings and store chunks
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          try {
            const embedding = await generateEmbedding(chunk);

            const { error: insertError } = await supabase
              .from('guide_chunks')
              .insert({
                block_id: block.id,
                block_type: block.type,
                block_title: block.title,
                block_slug: block.slug,
                chunk_text: chunk,
                chunk_index: i,
                embedding: embedding,
                metadata: {
                  parent_id: block.parent_id,
                  content_type: block.content_type,
                }
              });

            if (insertError) {
              console.error(`Error inserting chunk ${i} for block ${block.id}:`, insertError);
            } else {
              totalChunks++;
            }
          } catch (embeddingError) {
            console.error(`Error generating embedding for chunk ${i} of block ${block.id}:`, embeddingError);
            // Continue avec le prochain chunk même en cas d'erreur
          }
        }
        
        processedBlocks++;
      } catch (blockError) {
        console.error(`Error processing block ${block.id}:`, blockError);
        // Continue avec le prochain bloc
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        blocks_processed: processedBlocks,
        chunks_created: totalChunks,
        total_blocks_in_db: blocks?.length || 0,
        message: processedBlocks < (blocks?.length || 0) ? 'Some blocks were skipped due to errors' : 'All blocks processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check edge function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});