import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Strip HTML tags and decode entities for cleaner text
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Split text into chunks
function splitIntoChunks(text: string, maxLength = 800): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

// Generate embedding using OpenAI text-embedding-3-small
async function embedChunk(text: string): Promise<number[]> {
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
      input: text.substring(0, 8000),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate embedding: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Map global_role to level
function getRoleLevel(role: string | null): number {
  const roleLevels: Record<string, number> = {
    'superadmin': 6,
    'platform_admin': 5,
    'franchisor_admin': 4,
    'franchisor_user': 3,
    'franchisee_admin': 2,
    'franchisee_user': 1,
    'base_user': 0,
  };
  return roleLevels[role || 'base_user'] || 0;
}

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin (N5+)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    const roleLevel = getRoleLevel(profile?.global_role);

    if (roleLevel < 5) {
      throw new Error('Admin access required (N5+)');
    }

    // Rate limit: 5 req/10min per user (heavy operation)
    const rateLimitKey = `regenerate-helpconfort-rag:${user.id}`;
    const rateCheck = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!rateCheck.allowed) {
      console.log(`[RAG-HC] Rate limit exceeded for ${rateLimitKey}`);
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    console.log('[RAG-HC] Starting HelpConfort regeneration from blocks table...');

    // Step 1: Delete existing helpconfort_guide chunks
    const { error: deleteError } = await supabase
      .from('guide_chunks')
      .delete()
      .eq('block_type', 'helpconfort_guide');

    if (deleteError) {
      console.error('[RAG-HC] Error deleting old chunks:', deleteError);
    } else {
      console.log('[RAG-HC] Deleted existing helpconfort_guide chunks');
    }

    // Step 2: Fetch all HelpConfort blocks (sections with slug starting with 'helpconfort-')
    const { data: sections, error: sectionsError } = await supabase
      .from('blocks')
      .select(`
        id,
        title,
        slug,
        content,
        type,
        parent_id
      `)
      .eq('type', 'section')
      .like('slug', 'helpconfort-%');

    if (sectionsError) {
      throw new Error(`Failed to fetch blocks: ${sectionsError.message}`);
    }

    // Get parent categories for context
    const parentIds = [...new Set(sections?.map(s => s.parent_id).filter(Boolean))];
    const { data: categories } = await supabase
      .from('blocks')
      .select('id, title, slug')
      .in('id', parentIds);

    const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

    console.log(`[RAG-HC] Found ${sections?.length || 0} HelpConfort sections to process`);

    let totalChunks = 0;
    let processedSections = 0;
    let skippedSections = 0;
    const errors: string[] = [];

    for (const section of sections || []) {
      try {
        // Strip HTML and get clean text
        const cleanContent = stripHtml(section.content || '');
        
        // Skip sections with insufficient content
        if (cleanContent.length < 100) {
          console.log(`[RAG-HC] Skipping section ${section.id} "${section.title}" - insufficient content (${cleanContent.length} chars)`);
          skippedSections++;
          continue;
        }

        const parent = categoryMap.get(section.parent_id);
        const categoryTitle = parent?.title || 'HelpConfort';
        
        // Create contextual text for better embeddings
        const fullText = `${section.title}\n${categoryTitle}\n${cleanContent}`;

        // Split into chunks
        const chunks = splitIntoChunks(fullText, 800);
        console.log(`[RAG-HC] Section "${section.title}" (${categoryTitle}) -> ${chunks.length} chunks`);

        // Generate embeddings and store chunks
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          
          try {
            const embedding = await embedChunk(chunkText);

            const { error: insertError } = await supabase
              .from('guide_chunks')
              .insert({
                block_id: section.id,
                block_type: 'helpconfort_guide',
                block_title: section.title,
                block_slug: section.slug,
                chunk_text: chunkText,
                chunk_index: i,
                embedding: embedding,
                metadata: {
                  family: 'helpconfort',
                  source: 'helpconfort',
                  section_id: section.id,
                  section_title: section.title,
                  categorie: categoryTitle,
                  parent_id: section.parent_id,
                  parent_slug: parent?.slug || '',
                }
              });

            if (insertError) {
              console.error(`[RAG-HC] Error inserting chunk ${i} for section ${section.id}:`, insertError);
              errors.push(`Chunk ${i} of ${section.title}: ${insertError.message}`);
            } else {
              totalChunks++;
            }
          } catch (embeddingError) {
            console.error(`[RAG-HC] Error generating embedding for chunk ${i} of section ${section.id}:`, embeddingError);
            errors.push(`Embedding for ${section.title} chunk ${i}: ${embeddingError}`);
          }
        }
        
        processedSections++;
      } catch (sectionError) {
        console.error(`[RAG-HC] Error processing section ${section.id}:`, sectionError);
        errors.push(`Section ${section.title}: ${sectionError}`);
      }
    }

    console.log(`[RAG-HC] Regeneration complete: ${processedSections} sections processed, ${skippedSections} skipped, ${totalChunks} chunks created`);

    return withCors(req, new Response(
      JSON.stringify({
        success: true,
        sections_processed: processedSections,
        sections_skipped: skippedSections,
        chunks_created: totalChunks,
        total_sections: sections?.length || 0,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        message: errors.length > 0 
          ? `Terminé avec ${errors.length} erreur(s)` 
          : 'Index RAG régénéré avec succès depuis les blocs HelpConfort'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[RAG-HC] Error:', error);
    return withCors(req, new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check edge function logs for more information'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
