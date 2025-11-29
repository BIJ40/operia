import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// Generate embedding for query using OpenAI text-embedding-3-small
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, topK = 8, source } = await req.json();

    if (!query || typeof query !== 'string') {
      throw new Error('Query is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('Searching for:', query);

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    console.log('Query embedding generated');

    // Fetch chunks - filter by block_type for apogee source
    let chunksQuery = supabase.from('guide_chunks').select('*');
    
    // If source is 'apogee', filter by block_type = 'apogee_guide'
    if (source === 'apogee') {
      chunksQuery = chunksQuery.eq('block_type', 'apogee_guide');
    }
    
    const { data: chunks, error: chunksError } = await chunksQuery;

    if (chunksError) {
      throw chunksError;
    }

    console.log(`Found ${chunks?.length || 0} chunks${source === 'apogee' ? ' with block_type=apogee_guide' : ''}`);

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          results: [],
          message: source 
            ? `Aucun contenu indexé trouvé pour la source "${source}".`
            : 'No indexed content found. Please index your content first.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Comparing against ${chunks.length} chunks`);

    // Calculate similarity for each chunk
    const resultsWithScores = chunks.map(chunk => {
      // Handle embedding as string or array
      let chunkEmbedding = chunk.embedding;
      if (typeof chunkEmbedding === 'string') {
        try {
          chunkEmbedding = JSON.parse(chunkEmbedding);
        } catch {
          return { ...chunk, similarity: 0 };
        }
      }
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding as number[]);
      
      return {
        ...chunk,
        similarity,
      };
    });

    // Sort by similarity and get top K
    const topResults = resultsWithScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    console.log('Top results:', topResults.map(r => ({
      title: r.block_title,
      score: r.similarity
    })));

    return new Response(
      JSON.stringify({ results: topResults }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});