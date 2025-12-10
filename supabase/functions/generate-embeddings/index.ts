/**
 * Generate Embeddings Edge Function
 * Generates text embeddings using OpenAI API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface EmbeddingRequest {
  text?: string;
  texts?: string[];
  blockId?: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[GENERATE-EMBEDDINGS] OpenAI error:", err);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.slice(0, 8000));

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: batch,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[GENERATE-EMBEDDINGS] Batch error:", err);
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    const embeddings = data.data.map((d: { embedding: number[] }) => d.embedding);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const response = new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
      return withCors(req, response);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      const response = new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
      return withCors(req, response);
    }

    const body: EmbeddingRequest = await req.json();
    console.log("[GENERATE-EMBEDDINGS] Request received", { hasText: !!body.text, textsCount: body.texts?.length });

    // Single text embedding
    if (body.text) {
      const embedding = await generateEmbedding(body.text);
      const response = new Response(
        JSON.stringify({ embedding }),
        { headers: { "Content-Type": "application/json" } }
      );
      return withCors(req, response);
    }

    // Multiple texts
    if (body.texts && body.texts.length > 0) {
      const embeddings = await generateEmbeddings(body.texts);
      const response = new Response(
        JSON.stringify({ embeddings }),
        { headers: { "Content-Type": "application/json" } }
      );
      return withCors(req, response);
    }

    // Block reindexing (legacy support)
    if (body.blockId) {
      console.log("[GENERATE-EMBEDDINGS] Block reindex requested, use helpi-index instead");
      const response = new Response(
        JSON.stringify({ 
          success: true, 
          message: "Use helpi-index for block reindexing",
          blocks_processed: 0,
          chunks_created: 0
        }),
        { headers: { "Content-Type": "application/json" } }
      );
      return withCors(req, response);
    }

    // Full reindex (legacy support) - redirect to message
    const response = new Response(
      JSON.stringify({ 
        success: true,
        message: "Use helpi-index for full reindexing",
        blocks_processed: 0,
        chunks_created: 0
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    return withCors(req, response);

  } catch (error) {
    console.error("[GENERATE-EMBEDDINGS] Error:", error);
    const response = new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
    return withCors(req, response);
  }
});
