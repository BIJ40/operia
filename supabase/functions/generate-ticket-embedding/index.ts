import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate MD5 hash for text comparison
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Build reference text for embedding
function buildTicketText(ticket: any): string {
  const parts: string[] = [];
  
  if (ticket.module) parts.push(`[Module: ${ticket.module}]`);
  if (ticket.ticket_type) parts.push(`[Type: ${ticket.ticket_type}]`);
  if (ticket.theme) parts.push(`[Thème: ${ticket.theme}]`);
  if (ticket.impact_tags?.length) parts.push(`[Tags: ${ticket.impact_tags.join(", ")}]`);
  
  parts.push(`Titre: ${ticket.element_concerne || ""}`);
  if (ticket.description) parts.push(`Description: ${ticket.description}`);
  
  return parts.join("\n").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_id } = await req.json();
    
    if (!ticket_id) {
      return new Response(
        JSON.stringify({ error: "ticket_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("apogee_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError);
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build text and hash
    const ticketText = buildTicketText(ticket);
    const textHash = await hashText(ticketText);

    // Check if embedding already exists with same hash
    const { data: existingEmbedding } = await supabase
      .from("ticket_embeddings")
      .select("id, text_hash")
      .eq("ticket_id", ticket_id)
      .single();

    if (existingEmbedding?.text_hash === textHash) {
      console.log("Embedding already up to date for ticket:", ticket_id);
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: "Embedding already up to date" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate embedding via OpenAI
    console.log("Generating embedding for ticket:", ticket_id);
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: ticketText,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("OpenAI error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate embedding" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Upsert embedding
    const { error: upsertError } = await supabase
      .from("ticket_embeddings")
      .upsert({
        ticket_id,
        embedding,
        text_hash: textHash,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "ticket_id",
      });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save embedding" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Embedding generated successfully for ticket:", ticket_id);
    return new Response(
      JSON.stringify({ success: true, ticket_id }),
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
