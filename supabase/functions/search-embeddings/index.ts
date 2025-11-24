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

// Generate embedding using OpenAI's text-embedding model
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
    const error = await response.text();
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, topK = 15 } = await req.json();

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

    // Fetch all chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('guide_chunks')
      .select('*');

    if (chunksError) {
      throw chunksError;
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          results: [],
          message: 'No indexed content found. Please index your content first.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Comparing against ${chunks.length} chunks`);

    // Calculate similarity for each chunk
    const resultsWithScores = chunks.map(chunk => {
      const chunkEmbedding = chunk.embedding as number[];
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      return {
        ...chunk,
        similarity_score: similarity,
      };
    });

    // Sort by similarity and get top K
    const topResults = resultsWithScores
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, topK);

    console.log('Top guide results:', topResults.map(r => ({
      title: r.block_title,
      score: r.similarity_score
    })));

    // Rechercher aussi dans les documents (tous les scopes : apogee, apporteur, helpconfort)
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .in('scope', ['apogee', 'apporteur', 'helpconfort']);

    let documentResults: any[] = [];
    
    if (documents && !docsError) {
      // Recherche simple par mots-clés dans les titres et descriptions
      const queryWords = query.toLowerCase().split(/\s+/);
      documentResults = documents
        .filter(doc => {
          const searchText = `${doc.title} ${doc.description || ''}`.toLowerCase();
          return queryWords.some(word => searchText.includes(word));
        })
        .map(doc => ({
          type: 'document',
          title: doc.title,
          description: doc.description,
          file_path: doc.file_path,
          file_type: doc.file_type,
          block_id: doc.block_id,
        }))
        .slice(0, 3); // Max 3 documents
      
      console.log('Matching documents:', documentResults.length);
    }

    return new Response(
      JSON.stringify({ 
        results: topResults,
        documents: documentResults,
      }),
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