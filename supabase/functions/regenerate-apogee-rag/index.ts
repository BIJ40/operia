import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      input: text.substring(0, 8000), // OpenAI limit
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    console.log('[RAG] Starting regeneration of apogee_guides chunks...');

    // Step 1: Delete existing chunks from apogee source
    const { error: deleteError } = await supabase
      .from('guide_chunks')
      .delete()
      .eq('metadata->>source', 'apogee');

    if (deleteError) {
      console.error('[RAG] Error deleting old chunks:', deleteError);
    } else {
      console.log('[RAG] Deleted existing apogee chunks');
    }

    // Step 2: Fetch all apogee_guides
    const { data: guides, error: guidesError } = await supabase
      .from('apogee_guides')
      .select('*');

    if (guidesError) {
      throw new Error(`Failed to fetch apogee_guides: ${guidesError.message}`);
    }

    console.log(`[RAG] Found ${guides?.length || 0} guides to process`);

    let totalChunks = 0;
    let processedGuides = 0;
    const errors: string[] = [];

    for (const guide of guides || []) {
      try {
        // Create concatenated text for chunking
        const fullText = `${guide.titre}\n${guide.categorie}\n${guide.section}\n${guide.texte}`;
        
        if (fullText.trim().length < 50) {
          console.log(`[RAG] Skipping guide ${guide.id} - insufficient content`);
          continue;
        }

        // Split into chunks
        const chunks = splitIntoChunks(fullText, 800);
        console.log(`[RAG] Guide ${guide.id} split into ${chunks.length} chunks`);

        // Generate embeddings and store chunks
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          
          try {
            const embedding = await embedChunk(chunkText);

            const { error: insertError } = await supabase
              .from('guide_chunks')
              .insert({
                block_id: guide.id,
                block_type: 'apogee_guide',
                block_title: guide.titre,
                block_slug: `apogee-${guide.categorie}-${guide.section}`.toLowerCase().replace(/\s+/g, '-'),
                chunk_text: chunkText,
                chunk_index: i,
                embedding: embedding,
                metadata: {
                  source: 'apogee',
                  guide_id: guide.id,
                  categorie: guide.categorie,
                  section: guide.section,
                  titre: guide.titre,
                  version: guide.version,
                  tags: guide.tags,
                }
              });

            if (insertError) {
              console.error(`[RAG] Error inserting chunk ${i} for guide ${guide.id}:`, insertError);
              errors.push(`Chunk ${i} of ${guide.titre}: ${insertError.message}`);
            } else {
              totalChunks++;
            }
          } catch (embeddingError) {
            console.error(`[RAG] Error generating embedding for chunk ${i} of guide ${guide.id}:`, embeddingError);
            errors.push(`Embedding for ${guide.titre} chunk ${i}: ${embeddingError}`);
          }
        }
        
        processedGuides++;
      } catch (guideError) {
        console.error(`[RAG] Error processing guide ${guide.id}:`, guideError);
        errors.push(`Guide ${guide.titre}: ${guideError}`);
      }
    }

    console.log(`[RAG] Regeneration complete: ${processedGuides} guides, ${totalChunks} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        guides_processed: processedGuides,
        chunks_created: totalChunks,
        total_guides: guides?.length || 0,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        message: errors.length > 0 
          ? `Terminé avec ${errors.length} erreur(s)` 
          : 'Index RAG régénéré avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[RAG] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check edge function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
