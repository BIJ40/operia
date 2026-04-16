import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APOGEE_API_KEY = Deno.env.get("APOGEE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAX_DEFAULTS = {
  contact_email: "dax@helpconfort.com",
  name: "HelpConfort Dax",
  api_subdomain: "dax",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface HumidityEntry {
  piece: string;
  support: string;
  taux: number;
}

interface HumidityReportRequest {
  refDossier: string;
  clientName: string;
  entries: HumidityEntry[];
  agencySlug?: string;
  codePostal: string;
}

function sanitizeForHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: HumidityReportRequest = await req.json();
    const { refDossier, clientName, entries, agencySlug, codePostal } = body;

    if (!refDossier || !codePostal || !entries || entries.length === 0) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate entries
    for (const entry of entries) {
      if (!entry.piece || !entry.support || typeof entry.taux !== "number") {
        return new Response(JSON.stringify({ error: "Données de relevé invalides" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (entry.taux < 0 || entry.taux > 100) {
        return new Response(JSON.stringify({ error: "Le taux doit être entre 0 et 100" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Rate limiting
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";

    const cutoffTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("rate_limit_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .eq("ref_dossier", refDossier)
      .gte("attempted_at", cutoffTime);

    if ((count || 0) >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: "Trop de tentatives" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify postal code via Apogée
    const slug = agencySlug || "dax";
    let agencyConfig = DAX_DEFAULTS;

    const { data: agencyData } = await supabase
      .from("agencies")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (agencyData) {
      agencyConfig = {
        contact_email: agencyData.contact_email,
        name: agencyData.name,
        api_subdomain: agencyData.api_subdomain,
      };
    }

    const apiUrl = `https://${agencyConfig.api_subdomain}.apogee-rh.net/api/v2/projects?ref=${encodeURIComponent(refDossier)}`;
    const apiResponse = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${APOGEE_API_KEY}` },
    });

    if (!apiResponse.ok) {
      await supabase.from("rate_limit_attempts").insert({
        ip_address: clientIp,
        ref_dossier: refDossier,
        success: false,
      });
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiData = await apiResponse.json();
    const project = Array.isArray(apiData) ? apiData[0] : apiData;
    const projectPostalCode = project?.client?.codePostal || project?.data?.codePostal;

    if (!projectPostalCode || projectPostalCode !== codePostal) {
      await supabase.from("rate_limit_attempts").insert({
        ip_address: clientIp,
        ref_dossier: refDossier,
        success: false,
      });
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email
    const safeRef = sanitizeForHtml(refDossier);
    const safeName = sanitizeForHtml(clientName);
    const primaryColor = agencyData?.primary_color || "#1180C3";

    const entriesHtml = entries
      .map(
        (e) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${sanitizeForHtml(e.piece)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${sanitizeForHtml(e.support === "mur" ? "Mur" : "Plafond")}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold; color: ${e.taux > 70 ? "#E83B3B" : e.taux > 50 ? "#E8A20E" : "#22c55e"};">${e.taux}%</td>
      </tr>`
      )
      .join("");

    const emailHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${primaryColor}; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">💧 Relevé d'humidité</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0;">Dossier ${safeRef}</p>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 8px;"><strong>Client :</strong> ${safeName}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid ${primaryColor};">Pièce</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid ${primaryColor};">Support</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid ${primaryColor};">Taux</th>
            </tr>
          </thead>
          <tbody>
            ${entriesHtml}
          </tbody>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
          Envoyé depuis le suivi client le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Suivi ${agencyConfig.name} <noreply@helpconfort.services>`,
        to: [agencyConfig.contact_email],
        subject: `💧 Relevé humidité - Dossier ${refDossier} - ${clientName}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend error:", errText);
      throw new Error("Erreur lors de l'envoi de l'email");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-humidity-report:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
