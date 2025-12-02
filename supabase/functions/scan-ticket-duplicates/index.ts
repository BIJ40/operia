import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_id, threshold = 0.82, topK = 10 } = await req.json();
    
    if (!ticket_id) {
      return new Response(
        JSON.stringify({ error: "ticket_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if source ticket has embedding
    let sourceEmbeddingData = await supabase
      .from("ticket_embeddings")
      .select("embedding")
      .eq("ticket_id", ticket_id)
      .single();

    if (sourceEmbeddingData.error || !sourceEmbeddingData.data) {
      // Try to generate embedding first
      console.log("No embedding found, generating...");
      const genResponse = await fetch(`${supabaseUrl}/functions/v1/generate-ticket-embedding`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticket_id }),
      });

      if (!genResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to generate embedding for source ticket" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Re-fetch embedding
      sourceEmbeddingData = await supabase
        .from("ticket_embeddings")
        .select("embedding")
        .eq("ticket_id", ticket_id)
        .single();

      if (sourceEmbeddingData.error || !sourceEmbeddingData.data) {
        return new Response(
          JSON.stringify({ error: "Failed to retrieve generated embedding" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    const sourceVector = sourceEmbeddingData.data.embedding as number[];

    // Load all embeddings except the source
    const { data: allEmbeddings, error: embeddingsError } = await supabase
      .from("ticket_embeddings")
      .select("ticket_id, embedding")
      .neq("ticket_id", ticket_id);

    if (embeddingsError) {
      console.error("Error loading embeddings:", embeddingsError);
      return new Response(
        JSON.stringify({ error: "Failed to load embeddings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tickets to filter out merged ones
    const { data: tickets, error: ticketsError } = await supabase
      .from("apogee_tickets")
      .select("id, merged_into_ticket_id")
      .is("merged_into_ticket_id", null);

    if (ticketsError) {
      console.error("Error loading tickets:", ticketsError);
      return new Response(
        JSON.stringify({ error: "Failed to load tickets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activeTicketIds = new Set(tickets?.map(t => t.id) || []);

    // Calculate similarities
    const similarities: { ticket_id: string; similarity: number }[] = [];
    
    for (const emb of allEmbeddings || []) {
      // Skip merged tickets
      if (!activeTicketIds.has(emb.ticket_id)) continue;
      
      const candidateVector = emb.embedding as number[];
      const similarity = cosineSimilarity(sourceVector, candidateVector);
      
      if (similarity >= threshold) {
        similarities.push({ ticket_id: emb.ticket_id, similarity });
      }
    }

    // Sort by similarity descending and take top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topCandidates = similarities.slice(0, topK);

    // Upsert suggestions
    const suggestionsCreated: any[] = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    for (const candidate of topCandidates) {
      // Check if recent suggestion exists
      const { data: existingSuggestion } = await supabase
        .from("ticket_duplicate_suggestions")
        .select("id, status, created_at")
        .or(`and(ticket_id_source.eq.${ticket_id},ticket_id_candidate.eq.${candidate.ticket_id}),and(ticket_id_source.eq.${candidate.ticket_id},ticket_id_candidate.eq.${ticket_id})`)
        .single();

      // Skip if recent suggestion exists (less than 24h)
      if (existingSuggestion && existingSuggestion.created_at > oneDayAgo) {
        continue;
      }

      // Skip if already accepted or rejected
      if (existingSuggestion && existingSuggestion.status !== 'pending') {
        continue;
      }

      // Upsert suggestion
      const { data: suggestion, error: suggestionError } = await supabase
        .from("ticket_duplicate_suggestions")
        .upsert({
          ticket_id_source: ticket_id,
          ticket_id_candidate: candidate.ticket_id,
          similarity: candidate.similarity,
          status: "pending",
          created_at: new Date().toISOString(),
        }, {
          onConflict: "ticket_id_source,ticket_id_candidate",
        })
        .select()
        .single();

      if (!suggestionError && suggestion) {
        suggestionsCreated.push(suggestion);
      }
    }

    console.log(`Scan complete for ticket ${ticket_id}: ${suggestionsCreated.length} suggestions created`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        ticket_id,
        suggestions_count: suggestionsCreated.length,
        suggestions: suggestionsCreated 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
