/**
 * Helpi Search - Moteur RAG unifié
 * Recherche sémantique dans guide_chunks avec similarité cosine
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

interface HelpiSearchRequest {
  query: string;
  blockTypes?: string[];
  matchThreshold?: number;
  matchCount?: number;
  userId?: string;
}

interface ChunkResult {
  id: string;
  source_id: string | null;
  block_type: string;
  title: string | null;
  content: string;
  similarity: number;
}

// Cosine similarity calculation
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
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Generate embedding via OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000), // Limit input
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[HELPI-SEARCH] Embedding error:", err);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  // CORS handling
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);

  if (req.method !== "POST") {
    return withCors(req, new Response("Method not allowed", { status: 405 }));
  }

  try {
    const body = (await req.json()) as HelpiSearchRequest;
    const { query, blockTypes, matchThreshold = 0.3, matchCount = 8, userId } = body;

    if (!query || query.trim().length < 2) {
      return withCors(
        req,
        new Response(JSON.stringify({ error: "Query too short" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Rate limiting
    const rateLimitKey = `helpi-search:${userId || "anon"}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, {
      limit: 30,
      windowMs: 60000, // 30 requests per minute
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter!, corsHeaders);
    }

    console.log(`[HELPI-SEARCH] Query: "${query}", blockTypes: ${blockTypes?.join(",") || "all"}`);

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL chunks with embeddings (no limit to ensure complete coverage)
    let dbQuery = supabase
      .from("guide_chunks")
      .select("id, source_id, block_id, block_type, title, block_title, content, chunk_text, embedding")
      .not("embedding", "is", null);

    if (blockTypes && blockTypes.length > 0) {
      dbQuery = dbQuery.in("block_type", blockTypes);
    }

    const { data: chunks, error: dbError } = await dbQuery.limit(1000);

    if (dbError) {
      console.error("[HELPI-SEARCH] DB error:", dbError);
      return withCors(
        req,
        new Response(JSON.stringify({ error: "Database error", details: dbError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    
    console.log(`[HELPI-SEARCH] Loaded ${chunks?.length || 0} chunks, threshold: ${matchThreshold}`);

    if (!chunks || chunks.length === 0) {
      return withCors(
        req,
        new Response(JSON.stringify({ query, results: [], message: "No indexed content found" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Calculate similarities
    const scoredResults: ChunkResult[] = [];

    for (const chunk of chunks) {
      if (!chunk.embedding) continue;

      const embeddingArray = Array.isArray(chunk.embedding) ? chunk.embedding : [];
      if (embeddingArray.length === 0) continue;

      const similarity = cosineSimilarity(queryEmbedding, embeddingArray);

      if (similarity >= matchThreshold) {
        scoredResults.push({
          id: chunk.id,
          source_id: chunk.source_id || chunk.block_id || null,
          block_type: chunk.block_type,
          title: chunk.title || chunk.block_title || null,
          content: chunk.content || chunk.chunk_text || "",
          similarity,
        });
      }
    }

    // Sort by similarity and limit
    scoredResults.sort((a, b) => b.similarity - a.similarity);
    const topResults = scoredResults.slice(0, matchCount);

    console.log(`[HELPI-SEARCH] Found ${scoredResults.length} matches above threshold ${matchThreshold}, returning top ${topResults.length}`);
    if (topResults.length > 0) {
      console.log(`[HELPI-SEARCH] Best match: "${topResults[0].title}" (sim: ${topResults[0].similarity.toFixed(3)})`);
    }

    return withCors(
      req,
      new Response(
        JSON.stringify({
          query,
          results: topResults,
          totalMatches: scoredResults.length,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  } catch (error) {
    console.error("[HELPI-SEARCH] Fatal error:", error);
    return withCors(
      req,
      new Response(
        JSON.stringify({ error: "Unexpected error", details: String(error) }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }
});
