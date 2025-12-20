import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ackId, format = "html" } = await req.json();
    
    if (!ackId) {
      return new Response(
        JSON.stringify({ error: "ackId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[epi-generate-ack-pdf] Generating PDF for ack: ${ackId}, format: ${format}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the acknowledgement with all related data
    const { data: ack, error: ackError } = await supabase
      .from("epi_monthly_acknowledgements")
      .select(`
        *,
        collaborator:collaborators!user_id(id, first_name, last_name, email, role),
        items:epi_monthly_ack_items(
          *,
          catalog_item:epi_catalog_items(id, name, category)
        )
      `)
      .eq("id", ackId)
      .single();

    if (ackError || !ack) {
      console.error("[epi-generate-ack-pdf] Error fetching ack:", ackError);
      return new Response(
        JSON.stringify({ error: "Acknowledgement not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agency info
    const { data: agency } = await supabase
      .from("apogee_agencies")
      .select("label, adresse, code_postal, ville")
      .eq("id", ack.agency_id)
      .single();

    // Format month
    const monthDate = new Date(ack.month);
    const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    // Build HTML content
    const collaboratorName = ack.collaborator 
      ? `${ack.collaborator.first_name} ${ack.collaborator.last_name}`
      : "Inconnu";

    const itemsHtml = (ack.items || [])
      .map((item: any) => {
        const status = item.is_confirmed_present ? "✓ Présent" : "✗ Absent";
        const statusClass = item.is_confirmed_present ? "color: green;" : "color: red;";
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.catalog_item?.name || "N/A"}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.catalog_item?.category || ""}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.size || "—"}</td>
            <td style="padding: 8px; border: 1px solid #ddd; ${statusClass}">${status}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.notes || ""}</td>
          </tr>
        `;
      })
      .join("");

    const signedN1 = ack.signed_by_n1_at 
      ? new Date(ack.signed_by_n1_at).toLocaleString("fr-FR") 
      : "Non signé";
    const signedN2 = ack.signed_by_n2_at 
      ? new Date(ack.signed_by_n2_at).toLocaleString("fr-FR") 
      : "Non validé";

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Attestation EPI - ${monthLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 40px; }
    h1 { text-align: center; color: #333; font-size: 18px; }
    h2 { color: #666; font-size: 14px; margin-top: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .info-block { margin: 15px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; }
    .signature-block { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-box { width: 45%; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
    .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ATTESTATION DE REMISE D'ÉQUIPEMENTS DE PROTECTION INDIVIDUELLE</h1>
    <p><strong>${agency?.label || "Agence"}</strong></p>
    <p>${agency?.adresse || ""} ${agency?.code_postal || ""} ${agency?.ville || ""}</p>
  </div>

  <div class="info-block">
    <p><strong>Collaborateur :</strong> ${collaboratorName}</p>
    <p><strong>Fonction :</strong> ${ack.collaborator?.role || "—"}</p>
    <p><strong>Période :</strong> ${monthLabel}</p>
  </div>

  <h2>Équipements de Protection Individuelle</h2>
  <table>
    <thead>
      <tr>
        <th>Équipement</th>
        <th>Catégorie</th>
        <th>Taille</th>
        <th>État</th>
        <th>Observations</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || '<tr><td colspan="5" style="text-align: center; padding: 20px;">Aucun équipement</td></tr>'}
    </tbody>
  </table>

  <p style="margin-top: 30px;">
    Je soussigné(e) <strong>${collaboratorName}</strong>, atteste avoir vérifié l'état 
    de mes équipements de protection individuelle pour le mois de ${monthLabel}.
  </p>

  <div style="display: flex; justify-content: space-between; margin-top: 40px;">
    <div style="width: 45%; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
      <p><strong>Signature Collaborateur (N1)</strong></p>
      <p>Date : ${signedN1}</p>
      <p style="margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px;">
        ${ack.signed_by_n1_at ? "Signé électroniquement" : "En attente"}
      </p>
    </div>
    <div style="width: 45%; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
      <p><strong>Validation Responsable (N2)</strong></p>
      <p>Date : ${signedN2}</p>
      <p style="margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px;">
        ${ack.signed_by_n2_at ? "Validé" : "En attente"}
      </p>
    </div>
  </div>

  <div class="footer">
    <p>Document généré le ${new Date().toLocaleString("fr-FR")}</p>
    <p>ID: ${ackId}</p>
  </div>
</body>
</html>
    `;

    if (format === "html") {
      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // For PDF, we return HTML that can be rendered by a PDF service
    // In production, you would integrate with a PDF generation service like Gotenberg
    return new Response(
      JSON.stringify({
        success: true,
        html,
        metadata: {
          collaborator: collaboratorName,
          month: monthLabel,
          status: ack.status,
          signed_n1: !!ack.signed_by_n1_at,
          signed_n2: !!ack.signed_by_n2_at,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[epi-generate-ack-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
