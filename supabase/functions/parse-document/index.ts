import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import JSZip from 'https://esm.sh/jszip@3.10.1';

// Map global_role to level for permission check
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

// Parse PPTX file (ZIP with XML slides)
async function parsePptx(bytes: Uint8Array): Promise<{ text: string; slideCount: number }> {
  const zip = await JSZip.loadAsync(bytes);
  const textParts: string[] = [];
  let slideCount = 0;

  // Get all slide files
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  for (const slideName of slideFiles) {
    try {
      const content = await zip.file(slideName)?.async('string');
      if (content) {
        slideCount++;
        // Extract text from <a:t> tags (PowerPoint text elements)
        const textMatches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/gi) || [];
        const slideText = textMatches
          .map(match => {
            const textMatch = match.match(/<a:t[^>]*>([^<]*)<\/a:t>/i);
            return textMatch?.[1] || '';
          })
          .filter(t => t.trim())
          .join(' ');
        
        if (slideText.trim()) {
          textParts.push(`[Slide ${slideCount}] ${slideText}`);
        }
      }
    } catch (e) {
      console.warn(`[PARSE-DOCUMENT] Error parsing slide ${slideName}:`, e);
    }
  }

  return { text: textParts.join('\n\n'), slideCount };
}

// Parse DOCX file (ZIP with XML document)
async function parseDocx(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const documentFile = zip.file('word/document.xml');
  
  if (!documentFile) {
    throw new Error('Invalid DOCX: document.xml not found');
  }

  const content = await documentFile.async('string');
  
  // Extract text from <w:t> tags (Word text elements)
  const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || [];
  const paragraphs: string[] = [];
  let currentParagraph = '';

  // Simple paragraph detection based on <w:p> tags
  const paragraphSections = content.split(/<w:p[^>]*>/);
  
  for (const section of paragraphSections) {
    const texts = section.match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || [];
    const paragraphText = texts
      .map(match => {
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/i);
        return textMatch?.[1] || '';
      })
      .join('');
    
    if (paragraphText.trim()) {
      paragraphs.push(paragraphText.trim());
    }
  }

  return paragraphs.join('\n\n');
}

serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Authentification requise' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Authentification invalide' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    // Check role (N5+ = platform_admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    const roleLevel = getRoleLevel(profile?.global_role);
    if (roleLevel < 5) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Accès administrateur requis (N5+)' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    }

    // Handle both FormData and JSON body
    const contentType = req.headers.get('content-type') || '';
    let bytes: Uint8Array;
    let fileName: string;
    let mimeType: string;

    if (contentType.includes('multipart/form-data')) {
      // FormData upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) throw new Error('Aucun fichier fourni');
      
      const MAX_FILE_SIZE = 20 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) throw new Error(`Fichier trop volumineux. Taille maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      
      const arrayBuffer = await file.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
      fileName = file.name;
      mimeType = file.type;
    } else {
      // JSON body with base64 or bucket reference
      const body = await req.json();
      
      if (body.fileContent) {
        // Base64 encoded content
        const binaryString = atob(body.fileContent);
        bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        fileName = body.fileName || 'document';
        mimeType = body.mimeType || 'application/octet-stream';
      } else if (body.filePath && body.bucket) {
        // Fetch from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(body.bucket)
          .download(body.filePath);
        
        if (downloadError || !fileData) {
          throw new Error(`Failed to download file: ${downloadError?.message}`);
        }
        
        const arrayBuffer = await fileData.arrayBuffer();
        bytes = new Uint8Array(arrayBuffer);
        fileName = body.filePath.split('/').pop() || 'document';
        mimeType = body.mimeType || fileData.type || 'application/octet-stream';
      } else {
        throw new Error('No file content provided');
      }
    }

    console.log(`[PARSE-DOCUMENT] Processing ${fileName} (${mimeType}), size: ${bytes.length} bytes`);

    let extractedText = '';
    let metadata: Record<string, unknown> = {
      file_name: fileName,
      file_type: mimeType,
      file_size: bytes.length,
    };

    const fileNameLower = fileName.toLowerCase();

    // Plain text files
    if (mimeType.startsWith('text/') || 
        fileNameLower.endsWith('.txt') || 
        fileNameLower.endsWith('.md') || 
        fileNameLower.endsWith('.json') || 
        fileNameLower.endsWith('.csv')) {
      extractedText = new TextDecoder().decode(bytes);
    }
    // PPTX files
    else if (mimeType.includes('presentationml') || fileNameLower.endsWith('.pptx')) {
      console.log('[PARSE-DOCUMENT] Parsing PPTX file');
      const result = await parsePptx(bytes);
      extractedText = result.text;
      metadata.slide_count = result.slideCount;
      metadata.file_type = 'pptx';
    }
    // DOCX files
    else if (mimeType.includes('wordprocessingml') || fileNameLower.endsWith('.docx')) {
      console.log('[PARSE-DOCUMENT] Parsing DOCX file');
      extractedText = await parseDocx(bytes);
      metadata.file_type = 'docx';
    }
    // PDF files - basic extraction (limited without external libs)
    else if (mimeType === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
      console.log('[PARSE-DOCUMENT] Parsing PDF file (basic text extraction)');
      // Try to extract text from PDF streams (limited approach)
      const pdfContent = new TextDecoder('latin1').decode(bytes);
      
      // Extract text from PDF streams
      const textMatches: string[] = [];
      
      // Try to find text in Tj and TJ operators
      const tjMatches = pdfContent.match(/\(([^)]+)\)\s*Tj/g) || [];
      for (const match of tjMatches) {
        const text = match.match(/\(([^)]+)\)/)?.[1] || '';
        if (text.trim()) textMatches.push(text);
      }
      
      // Also try BT...ET blocks
      const btBlocks = pdfContent.match(/BT[\s\S]*?ET/g) || [];
      for (const block of btBlocks) {
        const texts = block.match(/\(([^)]+)\)/g) || [];
        for (const t of texts) {
          const text = t.slice(1, -1);
          if (text.trim() && text.length > 2) textMatches.push(text);
        }
      }
      
      extractedText = textMatches.join(' ').replace(/\\n/g, '\n').replace(/\\r/g, '');
      
      if (!extractedText.trim()) {
        console.warn('[PARSE-DOCUMENT] PDF text extraction limited - may be scanned or image-based');
        extractedText = '[PDF content could not be fully extracted - may be scanned or image-based]';
      }
      
      metadata.file_type = 'pdf';
      metadata.extraction_method = 'basic';
    }
    // DOC files (old format) - not fully supported
    else if (mimeType === 'application/msword' || fileNameLower.endsWith('.doc')) {
      throw new Error('Le format .doc ancien n\'est pas supporté. Veuillez convertir en .docx');
    }
    // PPT files (old format) - not fully supported
    else if (mimeType.includes('powerpoint') || fileNameLower.endsWith('.ppt')) {
      throw new Error('Le format .ppt ancien n\'est pas supporté. Veuillez convertir en .pptx');
    }
    else {
      throw new Error(`Type de fichier non supporté: ${mimeType}`);
    }

    console.log(`[PARSE-DOCUMENT] Extracted ${extractedText.length} characters`);

    return withCors(req, new Response(JSON.stringify({ 
      success: true, 
      text: extractedText,
      content: extractedText, // Alias for compatibility
      raw_text: extractedText, // Alias for compatibility
      metadata,
      fileName,
      fileType: mimeType,
    }), { headers: { 'Content-Type': 'application/json' } }));
    
  } catch (error) {
    console.error('[PARSE-DOCUMENT] Error:', error);
    return withCors(req, new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
  }
});
