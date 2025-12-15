import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate document preview (DOCX -> PDF via Gotenberg)
 * CRITICAL: Does NOT update database - only generates preview file
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

    // Get user profile for agency verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, global_role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instanceId, tokenValues } = await req.json();
    if (!instanceId) {
      return new Response(JSON.stringify({ error: "Missing instanceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch instance with template
    const { data: instance, error: instanceError } = await supabase
      .from("doc_instances")
      .select(`
        *,
        template:doc_templates(*)
      `)
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: "Instance not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side access verification (beyond RLS)
    const isAdmin = ["platform_admin", "superadmin"].includes(profile.global_role);
    const isSameAgency = instance.agency_id === profile.agency_id;
    
    if (!isAdmin && !isSameAgency) {
      return new Response(JSON.stringify({ error: "Access denied to this instance" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify template is published and accessible
    const template = instance.template;
    if (!template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template.is_published && !isAdmin) {
      return new Response(JSON.stringify({ error: "Template is not published" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download template DOCX
    const { data: templateFile, error: downloadError } = await supabase.storage
      .from("doc-templates")
      .download(template.docx_storage_path);

    if (downloadError || !templateFile) {
      return new Response(JSON.stringify({ error: "Failed to download template" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process DOCX: Replace tokens with values
    const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(await templateFile.arrayBuffer());

    const values = tokenValues || instance.token_values || {};

    // Process all XML files
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

      let content = await xmlFile.async("string");

      // Replace tokens - handle both simple and fragmented cases
      for (const [tokenName, tokenValue] of Object.entries(values)) {
        const safeValue = String(tokenValue || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        // Simple replacement
        content = content.replace(new RegExp(`\\{\\{${tokenName}\\}\\}`, "g"), safeValue);
        
        // Handle fragmented tokens (Word sometimes splits across XML tags)
        const fragmentedPattern = new RegExp(
          `\\{(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?\\{(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?${tokenName}(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?\\}(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?\\}`,
          "g"
        );
        content = content.replace(fragmentedPattern, safeValue);
      }

      zip.file(xmlPath, content);
    }

    // Generate modified DOCX
    const modifiedDocx = await zip.generateAsync({ type: "arraybuffer" });

    // Check if Gotenberg is configured
    const gotenbergUrl = Deno.env.get("GOTENBERG_URL");
    const gotenbergApiKey = Deno.env.get("GOTENBERG_API_KEY");

    let previewPdf: ArrayBuffer;

    if (gotenbergUrl) {
      // Convert DOCX to PDF via Gotenberg
      const formData = new FormData();
      formData.append("files", new Blob([modifiedDocx], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "document.docx");

      const gotenbergHeaders: Record<string, string> = {};
      if (gotenbergApiKey) {
        gotenbergHeaders["Authorization"] = `Bearer ${gotenbergApiKey}`;
      }

      const convertResponse = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
        method: "POST",
        headers: gotenbergHeaders,
        body: formData,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!convertResponse.ok) {
        const errorText = await convertResponse.text();
        console.error("Gotenberg error:", errorText);
        return new Response(JSON.stringify({ error: "PDF conversion failed", details: errorText }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      previewPdf = await convertResponse.arrayBuffer();
    } else {
      // Gotenberg not configured - return DOCX as preview (for development)
      console.warn("GOTENBERG_URL not configured - returning DOCX instead of PDF");
      
      // Store DOCX as preview for now
      const previewPath = `previews/${instance.agency_id}/${instanceId}/preview.docx`;
      
      const { error: uploadError } = await supabase.storage
        .from("doc-generated")
        .upload(previewPath, modifiedDocx, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: true,
        });

      if (uploadError) {
        return new Response(JSON.stringify({ error: "Failed to upload preview", details: uploadError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        previewPath,
        format: "docx",
        message: "Gotenberg not configured - DOCX preview generated"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deterministic preview path (no timestamps)
    const previewPath = `previews/${instance.agency_id}/${instanceId}/preview.pdf`;

    // Upload PDF preview
    const { error: uploadError } = await supabase.storage
      .from("doc-generated")
      .upload(previewPath, previewPdf, {
        contentType: "application/pdf",
        upsert: true, // Overwrite existing preview
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Failed to upload preview", details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NOTE: We do NOT update the database here - preview is ephemeral
    // The frontend will track the preview path locally

    return new Response(JSON.stringify({ 
      success: true, 
      previewPath,
      format: "pdf"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("documents-preview error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
