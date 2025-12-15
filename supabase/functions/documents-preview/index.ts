import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

/**
 * Resolve smart tokens from database data
 */
// deno-lint-ignore no-explicit-any
async function resolveSmartTokens(
  supabase: any,
  agencyId: string,
  collaboratorId: string | null
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  const now = new Date();

  // Date tokens
  resolved["DATE_JOUR"] = String(now.getDate());
  resolved["DATE_MOIS"] = MOIS_FR[now.getMonth()];
  resolved["DATE_ANNEE"] = String(now.getFullYear());
  resolved["DATE_COMPLETE"] = `${now.getDate()} ${MOIS_FR[now.getMonth()]} ${now.getFullYear()}`;

  // Agency tokens
  const { data: agency } = await supabase
    .from("apogee_agencies")
    .select("label, adresse, code_postal, ville, contact_email, contact_phone")
    .eq("id", agencyId)
    .single();

  if (agency) {
    resolved["AGENCE_NOM"] = agency.label || "";
    resolved["AGENCE_ADRESSE"] = agency.adresse || "";
    resolved["AGENCE_CP"] = agency.code_postal || "";
    resolved["AGENCE_VILLE"] = agency.ville || "";
    resolved["AGENCE_EMAIL"] = agency.contact_email || "";
    resolved["AGENCE_TEL"] = agency.contact_phone || "";
  }

  // Dirigeant tokens (N2 of agency)
  const { data: dirigeant } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("agency_id", agencyId)
    .eq("global_role", "franchisee_admin")
    .limit(1)
    .single();

  if (dirigeant) {
    resolved["DIRIGEANT_NOM"] = dirigeant.last_name || "";
    resolved["DIRIGEANT_PRENOM"] = dirigeant.first_name || "";
    resolved["DIRIGEANT_NOM_COMPLET"] = `${dirigeant.first_name || ""} ${dirigeant.last_name || ""}`.trim();
  }

  // Collaborator tokens (if linked)
  if (collaboratorId) {
    const { data: collab } = await supabase
      .from("collaborators")
      .select("first_name, last_name, email, phone, street, postal_code, city, role, hiring_date")
      .eq("id", collaboratorId)
      .single();

    if (collab) {
      resolved["COLLAB_NOM"] = collab.last_name || "";
      resolved["COLLAB_PRENOM"] = collab.first_name || "";
      resolved["COLLAB_NOM_COMPLET"] = `${collab.first_name || ""} ${collab.last_name || ""}`.trim();
      resolved["COLLAB_EMAIL"] = collab.email || "";
      resolved["COLLAB_TEL"] = collab.phone || "";
      resolved["COLLAB_ADRESSE"] = collab.street || "";
      resolved["COLLAB_CP"] = collab.postal_code || "";
      resolved["COLLAB_VILLE"] = collab.city || "";
      resolved["COLLAB_POSTE"] = collab.role || "";
      if (collab.hiring_date) {
        const hd = new Date(collab.hiring_date);
        resolved["COLLAB_DATE_EMBAUCHE"] = `${hd.getDate()} ${MOIS_FR[hd.getMonth()]} ${hd.getFullYear()}`;
      }
    }
  }

  return resolved;
}

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
      .select("agency_id, global_role, first_name, last_name, email")
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

    // Resolve smart tokens first
    const smartValues = await resolveSmartTokens(supabase, instance.agency_id, instance.collaborator_id);
    
    // Add user tokens
    smartValues["USER_NOM"] = profile.last_name || "";
    smartValues["USER_PRENOM"] = profile.first_name || "";
    smartValues["USER_EMAIL"] = profile.email || "";

    // Merge: smart tokens + manual values (manual values can override)
    const values = { ...smartValues, ...(tokenValues || instance.token_values || {}) };

    console.log("Resolved tokens:", Object.keys(values).length);

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
      const gotenbergBaseUrl = gotenbergUrl.replace(/\/+$/, "");
      // Accept both formats:
      // - GOTENBERG_URL = https://host (base)
      // - GOTENBERG_URL = https://host/forms/libreoffice/convert (full endpoint)
      const convertUrl = gotenbergBaseUrl.includes("/forms/")
        ? gotenbergBaseUrl
        : `${gotenbergBaseUrl}/forms/libreoffice/convert`;

      const formData = new FormData();
      formData.append(
        "files",
        new Blob([modifiedDocx], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        "document.docx"
      );

      const gotenbergHeaders: Record<string, string> = {};
      const rawKey = gotenbergApiKey?.trim();
      if (rawKey) {
        // Allow the secret to be either a raw token (preferred) or a full Authorization value
        // (e.g. "Bearer ..." or "Basic ...").
        const tokenKey = rawKey.replace(/^(bearer|basic)\s+/i, "");

        // Always send Authorization (common nginx auth setups) + key headers (common reverse-proxy setups)
        if (/^(bearer|basic)\s/i.test(rawKey)) {
          gotenbergHeaders["Authorization"] = rawKey;
        } else {
          gotenbergHeaders["Authorization"] = `Bearer ${tokenKey}`;
        }

        gotenbergHeaders["X-API-Key"] = tokenKey;
        gotenbergHeaders["X-Api-Key"] = tokenKey;
        gotenbergHeaders["X-Gotenberg-Api-Key"] = tokenKey;
      }

      // Some proxies require an explicit Accept
      gotenbergHeaders["Accept"] = "application/pdf";

      console.log("Gotenberg convertUrl:", convertUrl);
      console.log("Gotenberg headers:", Object.keys(gotenbergHeaders));

      const convertResponse = await fetch(convertUrl, {
        method: "POST",
        headers: gotenbergHeaders,
        body: formData,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!convertResponse.ok) {
        const errorText = await convertResponse.text();
        console.error(`Gotenberg error (${convertResponse.status}):`, errorText);
        return new Response(
          JSON.stringify({
            error: "PDF conversion failed",
            details: `[${convertResponse.status}] ${errorText}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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
