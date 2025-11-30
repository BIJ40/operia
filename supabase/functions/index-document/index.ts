import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Simple text chunking function
function chunkText(text: string, maxChunkSize: number = 500): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
}

// Generate embedding using OpenAI text-embedding-3-small
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
    const rateLimitKey = `index-document:${user.id}`;
    const rateCheck = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!rateCheck.allowed) {
      console.log(`[INDEX-DOCUMENT] Rate limit exceeded for ${rateLimitKey}`);
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    const { documentId, filePath } = await req.json();

    if (!documentId || !filePath) {
      throw new Error('Missing documentId or filePath');
    }

    console.log(`[INDEX-DOCUMENT] Indexing document ${documentId} from ${filePath}`);

    // Get document metadata
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error('Failed to download document');
    }

    // Parse document content
    let documentText = '';
    
    // Check file type
    const fileType = document.file_type.toLowerCase();
    
    // Supported complex document types that need parsing
    const needsParsing = 
      fileType.includes('pdf') ||
      fileType.includes('wordprocessingml') || // .docx
      fileType.includes('msword') || // .doc
      fileType.includes('presentationml') || // .pptx
      fileType.includes('powerpoint'); // .ppt
    
    if (fileType.includes('text') || fileType.includes('plain') || fileType.includes('markdown')) {
      // Plain text or markdown
      documentText = await fileData.text();
    } else if (needsParsing) {
      // Use parse-document edge function for complex documents
      console.log(`[INDEX-DOCUMENT] Calling parse-document for ${fileType}`);
      
      // Convert blob to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Get file extension from path
      const extension = filePath.split('.').pop()?.toLowerCase() || 'bin';
      
      const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-document`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileContent: base64Content,
          fileName: document.title || `document.${extension}`,
          mimeType: document.file_type,
        }),
      });
      
      if (!parseResponse.ok) {
        const errorText = await parseResponse.text();
        console.error('[INDEX-DOCUMENT] parse-document error:', errorText);
        throw new Error(`Failed to parse document: ${parseResponse.status}`);
      }
      
      const parseResult = await parseResponse.json();
      documentText = parseResult.text || parseResult.content || '';
      
      if (!documentText) {
        throw new Error('parse-document returned empty content');
      }
      
      console.log(`[INDEX-DOCUMENT] Parsed ${documentText.length} characters from ${fileType}`);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (!documentText || documentText.length < 50) {
      throw new Error('Document content is too short or empty');
    }

    // Delete existing chunks for this document
    await supabase
      .from('guide_chunks')
      .delete()
      .eq('block_id', documentId);

    // Create chunks
    const chunks = chunkText(documentText, 500);
    console.log(`[INDEX-DOCUMENT] Document ${documentId} split into ${chunks.length} chunks`);

    let totalChunks = 0;

    // Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const embedding = await generateEmbedding(chunk);

        const { error: insertError } = await supabase
          .from('guide_chunks')
          .insert({
            block_id: documentId,
            block_type: 'document',
            block_title: document.title,
            block_slug: `document-${documentId}`,
            chunk_text: chunk,
            chunk_index: i,
            embedding: embedding,
            metadata: {
              document_id: documentId,
              source: document.scope || 'autre',
              family: document.scope || 'autre',
              source_type: 'document',
              file_type: document.file_type,
              description: document.description,
            }
          });

        if (insertError) {
          console.error(`[INDEX-DOCUMENT] Error inserting chunk ${i}:`, insertError);
        } else {
          totalChunks++;
        }
      } catch (embeddingError) {
        console.error(`[INDEX-DOCUMENT] Error generating embedding for chunk ${i}:`, embeddingError);
      }
    }

    console.log(`[INDEX-DOCUMENT] Completed: ${totalChunks} chunks created for document ${documentId}`);

    return withCors(req, new Response(
      JSON.stringify({
        success: true,
        document_id: documentId,
        chunks_created: totalChunks,
        message: 'Document indexed successfully'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[INDEX-DOCUMENT] Error:', error);
    return withCors(req, new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
