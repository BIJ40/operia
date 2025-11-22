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

// Generate embedding using Lovable AI
async function generateEmbedding(text: string): Promise<number[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Use a simple text-to-vector approach with AI
  // We'll ask the AI to generate a semantic representation
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Extract 10 key semantic features from this text as numbers between -1 and 1, representing: topic relevance, technical depth, action orientation, informational content, problem-solving, step-by-step nature, conceptual complexity, practical examples, troubleshooting focus, and general utility. Respond ONLY with a JSON array of 10 numbers."
        },
        {
          role: "user",
          content: text.substring(0, 1000)
        }
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const embedding = JSON.parse(content);
    if (Array.isArray(embedding) && embedding.length === 10) {
      return embedding;
    }
  } catch (e) {
    console.error("Failed to parse embedding:", content);
  }
  
  // Fallback: simple character-based hash embedding
  return Array.from({ length: 10 }, (_, i) => {
    const hash = text.split('').reduce((acc, char, idx) => 
      acc + char.charCodeAt(0) * (idx + i + 1), 0);
    return (Math.sin(hash) * 2) - 1;
  });
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

    const { blockIds } = await req.json();

    // Fetch blocks to index
    let query = supabase
      .from('blocks')
      .select('*')
      .order('created_at');

    if (blockIds && blockIds.length > 0) {
      query = query.in('id', blockIds);
    }

    const { data: blocks, error: blocksError } = await query;

    if (blocksError) {
      throw blocksError;
    }

    console.log(`Indexing ${blocks?.length || 0} blocks`);

    let totalChunks = 0;

    for (const block of blocks || []) {
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
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        blocks_processed: blocks?.length || 0,
        chunks_created: totalChunks,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});