import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Parse DOCX file to extract tokens ({{token_name}})
 * Handles Word-fragmented tokens across multiple XML runs
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storagePath } = await req.json();
    if (!storagePath) {
      return new Response(JSON.stringify({ error: "Missing storagePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download DOCX from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("doc-templates")
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download template", details: downloadError?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DOCX is a ZIP file - we need to extract and parse XML
    const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(await fileData.arrayBuffer());

    // Use array to preserve order of first appearance
    const tokensOrdered: string[] = [];
    const tokensSeen = new Set<string>();
    
    // Support both {{token}} and {token} formats
    const doublebraceRegex = /\{\{([^}]+)\}\}/g;
    const singlebraceRegex = /\{([A-Z][A-Z0-9_]+)\}/g; // Single brace: uppercase tokens only (e.g., {JOKER})

    const normalizeToken = (raw: string): string | null => {
      const cleaned = raw
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, "")
        .trim();

      if (!cleaned) return null;

      // Guard against Word XML fragments accidentally captured between {{ }}
      if (cleaned.includes("w:") || cleaned.includes("xmlns") || cleaned.includes("</")) return null;

      // Token naming convention: keep it strict to avoid polluted token lists
      if (!/^[A-Za-z0-9_.-]+$/.test(cleaned)) return null;

      return cleaned;
    };

    // Parse all XML files in the DOCX (document.xml, headers, footers)
    const xmlFiles = [
      "word/document.xml",
      "word/header1.xml",
      "word/header2.xml",
      "word/header3.xml",
      "word/footer1.xml",
      "word/footer2.xml",
      "word/footer3.xml",
    ];

    for (const xmlPath of xmlFiles) {
      const xmlFile = zip.file(xmlPath);
      if (!xmlFile) continue;

      const xmlContent = await xmlFile.async("string");

      // Handle Word-fragmented tokens: Word sometimes splits {{token}} across multiple <w:t> runs
      // Strategy: extract all visible text content, then find tokens.

      const plainText = xmlContent
        .replace(/<[^>]+>/g, "") // Remove all XML tags
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

      let match;
      // Extract double-brace tokens {{token}}
      while ((match = doublebraceRegex.exec(plainText)) !== null) {
        const tokenName = normalizeToken(match[1] ?? "");
        if (tokenName && !tokensSeen.has(tokenName)) {
          tokensSeen.add(tokenName);
          tokensOrdered.push(tokenName);
        }
      }
      
      // Extract single-brace tokens {TOKEN} (uppercase only to avoid false positives)
      while ((match = singlebraceRegex.exec(plainText)) !== null) {
        const tokenName = normalizeToken(match[1] ?? "");
        if (tokenName && !tokensSeen.has(tokenName)) {
          tokensSeen.add(tokenName);
          tokensOrdered.push(tokenName);
        }
      }

      // Extra safety for some fragmented edge cases where braces are split across tags
      const fragmentPattern = /\{(?:<[^>]*>)*\{(?:<[^>]*>)*([^<}]+)(?:<[^>]*>)*\}(?:<[^>]*>)*\}/g;
      let fragMatch;
      while ((fragMatch = fragmentPattern.exec(xmlContent)) !== null) {
        const tokenName = normalizeToken(fragMatch[1] ?? "");
        if (tokenName && !tokensSeen.has(tokenName)) {
          tokensSeen.add(tokenName);
          tokensOrdered.push(tokenName);
        }
      }
    }

    // Return tokens in document order (no sorting)
    const tokenList = tokensOrdered;

    return new Response(JSON.stringify({ 
      success: true, 
      tokens: tokenList,
      count: tokenList.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("parse-docx-tokens error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
