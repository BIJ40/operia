/**
 * Helpi Index - Indexation unifiée des contenus
 * Supporte: apogee, helpconfort, document, faq
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

interface IndexRequest {
  source: "apogee" | "helpconfort" | "document" | "faq";
  mode?: "full" | "delta";
  userId?: string;
}

interface ChunkData {
  id?: string;
  source_id: string;
  block_type: string;
  title: string;
  content: string;
  tokens: number;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

const MAX_CHUNK_SIZE = 800;

// Split text into chunks
function splitIntoChunks(text: string, maxLength = MAX_CHUNK_SIZE): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
}

// Strip HTML tags
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Generate embeddings via OpenAI
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Process in batches of 100
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
      console.error("[HELPI-INDEX] Embedding error:", err);
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    const embeddings = data.data.map((d: { embedding: number[] }) => d.embedding);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
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
    const body = (await req.json()) as IndexRequest;
    const { source, mode = "full", userId } = body;

    if (!source || !["apogee", "helpconfort", "document", "faq"].includes(source)) {
      return withCors(
        req,
        new Response(JSON.stringify({ error: "Invalid source" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Rate limiting - stricter for indexing
    const rateLimitKey = `helpi-index:${userId || "anon"}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, {
      limit: 5,
      windowMs: 600000, // 5 requests per 10 minutes
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter!, corsHeaders);
    }

    console.log(`[HELPI-INDEX] Starting ${mode} indexation for source: ${source}`);

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete existing chunks if full reindex
    if (mode === "full") {
      const { error: deleteError } = await supabase
        .from("guide_chunks")
        .delete()
        .eq("block_type", source);

      if (deleteError) {
        console.error("[HELPI-INDEX] Delete error:", deleteError);
        return withCors(
          req,
          new Response(JSON.stringify({ error: "Failed to clear existing chunks" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      console.log(`[HELPI-INDEX] Deleted existing ${source} chunks`);
    }

    // Fetch source data based on type
    let sourceData: Array<{ id: string; title: string; content: string; slug: string; categorySlug: string }> = [];

    if (source === "apogee" || source === "helpconfort") {
      // Fetch sections with parent_id
      let blocksQuery = supabase
        .from("blocks")
        .select("id, title, content, slug, parent_id")
        .eq("type", "section")
        .not("content", "is", null);

      if (source === "apogee") {
        blocksQuery = blocksQuery.not("slug", "like", "helpconfort-%");
      } else {
        blocksQuery = blocksQuery.like("slug", "helpconfort-%");
      }

      const { data: blocks, error: blocksError } = await blocksQuery;

      if (blocksError) {
        console.error("[HELPI-INDEX] Blocks fetch error:", blocksError);
        return withCors(
          req,
          new Response(JSON.stringify({ error: "Failed to fetch blocks" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        );
      }

      // Fetch all categories to create a lookup map for parent slugs
      const { data: categories } = await supabase
        .from("blocks")
        .select("id, slug")
        .eq("type", "category");
      
      const categoryMap = new Map<string, string>();
      for (const cat of categories || []) {
        categoryMap.set(cat.id, cat.slug);
      }

      sourceData = (blocks || []).map((b) => {
        const parentSlug = b.parent_id ? categoryMap.get(b.parent_id) : null;
        return {
          id: b.id,
          title: b.title,
          content: stripHtml(b.content || ""),
          slug: b.slug || b.id,
          categorySlug: parentSlug || b.slug || b.id, // Use parent category slug for URL
        };
      });
    } else if (source === "faq") {
      // Fetch from faq_items table (if exists)
      const { data: faqs, error: faqError } = await supabase
        .from("faq_items")
        .select("id, question, answer")
        .eq("is_published", true);

      if (!faqError && faqs) {
        sourceData = faqs.map((f) => ({
          id: f.id,
          title: f.question,
          content: stripHtml(f.answer || ""),
          slug: `faq-${f.id}`,
          categorySlug: 'faq', // FAQ items link to /support/faq
        }));
      }
    } else if (source === "document") {
      // Fetch from documents table (if exists)
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("id, title, content")
        .not("content", "is", null);

      if (!docsError && docs) {
        sourceData = docs.map((d) => ({
          id: d.id,
          title: d.title || "Document",
          content: stripHtml(d.content || ""),
          slug: `doc-${d.id}`,
          categorySlug: 'documents', // Documents link to base path
        }));
      }
    }

    console.log(`[HELPI-INDEX] Found ${sourceData.length} source items`);

    if (sourceData.length === 0) {
      return withCors(
        req,
        new Response(
          JSON.stringify({
            success: true,
            source,
            itemsProcessed: 0,
            chunksCreated: 0,
            message: "No source data found",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Create chunks
    const allChunks: Array<{
      source_id: string;
      title: string;
      content: string;
      chunk_index: number;
      slug: string;
      categorySlug: string;
    }> = [];

    for (const item of sourceData) {
      if (!item.content || item.content.length < 50) continue;

      const textChunks = splitIntoChunks(item.content);
      textChunks.forEach((chunk, index) => {
        allChunks.push({
          source_id: item.id,
          title: item.title,
          content: chunk,
          chunk_index: index,
          slug: item.slug,
          categorySlug: item.categorySlug,
        });
      });
    }

    console.log(`[HELPI-INDEX] Created ${allChunks.length} chunks`);

    if (allChunks.length === 0) {
      return withCors(
        req,
        new Response(
          JSON.stringify({
            success: true,
            source,
            itemsProcessed: sourceData.length,
            chunksCreated: 0,
            message: "No valid content to index",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Generate embeddings
    const texts = allChunks.map((c) => `${c.title}\n\n${c.content}`);
    const embeddings = await generateEmbeddings(texts);

    // Insert chunks with embeddings - use categorySlug for block_slug (used for URLs)
    const rowsToInsert = allChunks.map((chunk, idx) => ({
      source_id: chunk.source_id,
      block_type: source,
      block_slug: chunk.categorySlug, // Use category slug for URL building
      context_type: source, // Required field
      title: chunk.title,
      content: chunk.content,
      chunk_text: chunk.content, // For backward compatibility
      block_title: chunk.title,
      block_id: chunk.source_id,
      chunk_index: chunk.chunk_index,
      tokens: chunk.content.length,
      embedding: embeddings[idx],
    }));

    // Insert in batches
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      const batch = rowsToInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("guide_chunks").insert(batch);

      if (insertError) {
        console.error("[HELPI-INDEX] Insert error:", insertError);
        // Continue with next batch
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`[HELPI-INDEX] Inserted ${insertedCount} chunks for ${source}`);

    return withCors(
      req,
      new Response(
        JSON.stringify({
          success: true,
          source,
          mode,
          itemsProcessed: sourceData.length,
          chunksCreated: insertedCount,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  } catch (error) {
    console.error("[HELPI-INDEX] Fatal error:", error);
    return withCors(
      req,
      new Response(JSON.stringify({ error: "Unexpected error", details: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );
  }
});
