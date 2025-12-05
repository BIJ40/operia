import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Extract base64 images from HTML content
function extractImages(htmlContent: string): string[] {
  const images: string[] = [];
  
  // Match data-src with base64 images
  const dataSrcRegex = /data-src="(data:image\/[^;]+;base64,[^"]+)"/g;
  let match;
  while ((match = dataSrcRegex.exec(htmlContent)) !== null) {
    images.push(match[1]);
  }
  
  // Match src with base64 images
  const srcRegex = /src="(data:image\/[^;]+;base64,[^"]+)"/g;
  while ((match = srcRegex.exec(htmlContent)) !== null) {
    if (!images.includes(match[1])) {
      images.push(match[1]);
    }
  }
  
  // Limit to first 10 images to avoid huge payloads
  return images.slice(0, 10);
}

// Clean HTML to plain text for AI processing
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  // CORS handling
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const { blockId } = await req.json();

    if (!blockId) {
      return withCors(req, new Response(
        JSON.stringify({ error: "blockId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    if (!LOVABLE_API_KEY) {
      return withCors(req, new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Create Supabase client with service role for full access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the block content
    const { data: block, error: blockError } = await supabase
      .from("blocks")
      .select("id, title, content, parent_id")
      .eq("id", blockId)
      .single();

    if (blockError || !block) {
      console.error("Block fetch error:", blockError);
      return withCors(req, new Response(
        JSON.stringify({ error: "Block not found", detail: blockError?.message }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Fetch parent category info
    let categoryTitle = null;
    if (block.parent_id) {
      const { data: category } = await supabase
        .from("blocks")
        .select("title")
        .eq("id", block.parent_id)
        .single();
      categoryTitle = category?.title;
    }

    // Mark as processing
    await supabase
      .from("formation_content")
      .upsert({
        source_block_id: blockId,
        source_block_title: block.title,
        source_category_id: block.parent_id,
        source_category_title: categoryTitle,
        status: "processing",
        error_message: null
      }, { onConflict: "source_block_id" });

    // Extract images from HTML
    const extractedImages = extractImages(block.content || "");
    console.log(`Extracted ${extractedImages.length} images from block ${blockId}`);

    // Convert HTML to plain text for AI
    const plainText = htmlToText(block.content || "");
    
    if (plainText.length < 50) {
      // Content too short, mark as complete with minimal summary
      await supabase
        .from("formation_content")
        .update({
          status: "complete",
          generated_summary: "Contenu insuffisant pour générer un résumé.",
          extracted_images: extractedImages,
          generated_at: new Date().toISOString()
        })
        .eq("source_block_id", blockId);

      return withCors(req, new Response(
        JSON.stringify({ success: true, message: "Content too short" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Call Lovable AI to generate summary
    const systemPrompt = `Tu es un formateur expert du logiciel Apogée (logiciel de gestion pour entreprises du bâtiment).
Tu dois créer un résumé pédagogique pour un support de formation.

CONSIGNES:
- Résume le contenu en 3-5 paragraphes clairs et structurés
- Mets en avant les points essentiels et les étapes clés
- Utilise un ton professionnel mais accessible
- Format: Markdown avec titres ## et listes à puces si pertinent
- Maximum 500 mots
- Ne répète pas le titre de la section
- Focus sur ce que l'utilisateur doit RETENIR et SAVOIR FAIRE`;

    const userPrompt = `Voici le contenu de la section "${block.title}" à résumer pour la formation:\n\n${plainText.substring(0, 8000)}`;

    console.log(`Calling Lovable AI for block ${blockId}, text length: ${plainText.length}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      await supabase
        .from("formation_content")
        .update({
          status: "error",
          error_message: `AI API error: ${aiResponse.status}`
        })
        .eq("source_block_id", blockId);

      return withCors(req, new Response(
        JSON.stringify({ error: "AI API error", status: aiResponse.status }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    const aiData = await aiResponse.json();
    const generatedSummary = aiData.choices?.[0]?.message?.content || "Erreur de génération";

    console.log(`Generated summary for ${blockId}, length: ${generatedSummary.length}`);

    // Save the result
    const { error: updateError } = await supabase
      .from("formation_content")
      .update({
        status: "complete",
        generated_summary: generatedSummary,
        extracted_images: extractedImages,
        generated_at: new Date().toISOString(),
        error_message: null
      })
      .eq("source_block_id", blockId);

    if (updateError) {
      console.error("Update error:", updateError);
      return withCors(req, new Response(
        JSON.stringify({ error: "Failed to save result", detail: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        blockId,
        summaryLength: generatedSummary.length,
        imagesCount: extractedImages.length
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

  } catch (error) {
    console.error("Function error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return withCors(req, new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});
