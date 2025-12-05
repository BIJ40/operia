import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ImageInfo {
  url: string;
  index: number;
}

// Extract base64 images from HTML content with position markers
function extractImagesWithPositions(htmlContent: string): { images: ImageInfo[], htmlWithMarkers: string } {
  const images: ImageInfo[] = [];
  let imageIndex = 0;
  
  // Replace img tags with markers while extracting the images
  let htmlWithMarkers = htmlContent;
  
  // Match img tags with data-src or src containing base64
  const imgTagRegex = /<img[^>]*(?:data-src|src)="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/gi;
  
  htmlWithMarkers = htmlWithMarkers.replace(imgTagRegex, (match, imageUrl) => {
    images.push({ url: imageUrl, index: imageIndex });
    const marker = `[IMAGE_${imageIndex}]`;
    imageIndex++;
    return marker;
  });
  
  // Also handle images with src first then data-src
  const srcImgRegex = /<img[^>]*src="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/gi;
  htmlWithMarkers = htmlWithMarkers.replace(srcImgRegex, (match, imageUrl) => {
    // Check if this image wasn't already captured
    if (!images.some(img => img.url === imageUrl)) {
      images.push({ url: imageUrl, index: imageIndex });
      const marker = `[IMAGE_${imageIndex}]`;
      imageIndex++;
      return marker;
    }
    return match;
  });
  
  // Limit to first 10 images to avoid huge payloads
  return {
    images: images.slice(0, 10),
    htmlWithMarkers
  };
}

// Clean HTML to plain text for AI processing, preserving image markers
function htmlToTextWithMarkers(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Keep image markers
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

    // Extract images from HTML with position markers
    const { images: extractedImages, htmlWithMarkers } = extractImagesWithPositions(block.content || "");
    console.log(`Extracted ${extractedImages.length} images from block ${blockId}`);

    // Convert HTML to plain text for AI, keeping markers
    const plainText = htmlToTextWithMarkers(htmlWithMarkers);
    
    if (plainText.length < 50) {
      // Content too short, mark as complete with minimal summary
      await supabase
        .from("formation_content")
        .update({
          status: "complete",
          generated_summary: "Contenu insuffisant pour générer un résumé.",
          extracted_images: extractedImages.map(img => img.url),
          generated_at: new Date().toISOString()
        })
        .eq("source_block_id", blockId);

      return withCors(req, new Response(
        JSON.stringify({ success: true, message: "Content too short" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Build image markers info for the AI
    const imageMarkersInfo = extractedImages.length > 0 
      ? `\n\nIMPORTANT: Le texte contient ${extractedImages.length} marqueur(s) d'image [IMAGE_0], [IMAGE_1], etc. 
Tu DOIS conserver ces marqueurs EXACTEMENT à leur position dans ton résumé pour indiquer où les images doivent apparaître.
Place chaque marqueur sur sa propre ligne, seul, là où l'image correspondante doit être affichée.`
      : "";

    // Call Lovable AI to generate training content
    const systemPrompt = `Tu es un formateur expert créant des SUPPORTS DE FORMATION pour le logiciel Apogée (gestion pour entreprises du bâtiment).

OBJECTIF: Transformer le contenu brut en support de formation CONCIS et ACTIONNABLE.

RÈGLES STRICTES:
1. FORMAT: Utilise des LISTES À PUCES courtes (pas de longs paragraphes)
2. LONGUEUR: Maximum 300 mots - sois SYNTHÉTIQUE
3. STYLE: 
   - Phrases courtes et directes (impératif: "Cliquez sur...", "Sélectionnez...")
   - Pas de répétitions ni de reformulations inutiles
   - Pas de phrases d'introduction génériques ("Dans cette section...")
4. STRUCTURE:
   - ## Points clés (3-5 bullet points essentiels)
   - ## Étapes (si procédure: liste numérotée concise)
   - ## À retenir (1-2 points critiques)
5. CONTENU:
   - Garde TOUTES les informations importantes
   - Élimine le texte de remplissage et les explications redondantes
   - Focus sur le COMMENT FAIRE, pas les généralités${imageMarkersInfo}`;

    const userPrompt = `Transforme ce contenu de la section "${block.title}" en support de formation CONCIS:\n\n${plainText.substring(0, 8000)}`;

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
        extracted_images: extractedImages.map(img => img.url),
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
