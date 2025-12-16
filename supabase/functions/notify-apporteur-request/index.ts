import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface NotifyRequest {
  request_id: string;
}

// Generate PDF recap
// Helper function to wrap text and handle newlines for PDF
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  
  const lines: string[] = [];
  // First split by newlines to respect explicit line breaks
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push(''); // Preserve empty lines
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const cleanWord = word.replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
      if (!cleanWord) continue;
      
      const testLine = currentLine + (currentLine ? ' ' : '') + cleanWord;
      try {
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = cleanWord;
        } else {
          currentLine = testLine;
        }
      } catch {
        // If measurement fails, just add word to current line
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

async function generatePdfRecap(request: any, apporteurName: string, agencyName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { height } = page.getSize();
  let y = height - 50;
  const margin = 50;
  const lineHeight = 20;
  const maxWidth = 495;
  
  // Header
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: 595,
    height: 80,
    color: rgb(0, 0.4, 0.8),
  });
  
  page.drawText("DEMANDE D'INTERVENTION", {
    x: margin,
    y: height - 45,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  
  const refText = `Référence: ${request.reference || 'N/A'}`;
  page.drawText(refText, {
    x: margin,
    y: height - 68,
    size: 12,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  y = height - 120;
  
  // Date
  const dateStr = new Date().toLocaleDateString('fr-FR', { 
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  page.drawText(`Date: ${dateStr}`, {
    x: margin,
    y,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= lineHeight * 2;
  
  // Apporteur section
  page.drawText("APPORTEUR", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0.4, 0.8),
  });
  y -= lineHeight;
  
  const cleanApporteurName = (apporteurName || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  page.drawText(cleanApporteurName, {
    x: margin,
    y,
    size: 11,
    font: font,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight * 2;
  
  // Type & Urgence
  const urgencyLabels: Record<string, string> = {
    normal: "Normal",
    urgent: "Urgent",
    tres_urgent: "Très urgent"
  };
  const typeLabels: Record<string, string> = {
    depannage: "Dépannage",
    travaux: "Travaux",
    maintenance: "Maintenance",
    diagnostic: "Diagnostic"
  };
  
  page.drawText("TYPE DE DEMANDE", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0.4, 0.8),
  });
  y -= lineHeight;
  
  page.drawText(`Type: ${typeLabels[request.request_type] || request.request_type}`, {
    x: margin,
    y,
    size: 11,
    font: font,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;
  
  page.drawText(`Urgence: ${urgencyLabels[request.urgency] || request.urgency}`, {
    x: margin,
    y,
    size: 11,
    font: font,
    color: request.urgency === 'urgent' || request.urgency === 'tres_urgent' ? rgb(0.8, 0.2, 0.2) : rgb(0, 0, 0),
  });
  y -= lineHeight * 2;
  
  // Locataire section
  page.drawText("LOCATAIRE / OCCUPANT", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0.4, 0.8),
  });
  y -= lineHeight;
  
  const cleanTenantName = (request.tenant_name || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  page.drawText(`Nom: ${cleanTenantName}`, {
    x: margin,
    y,
    size: 11,
    font: font,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;
  
  if (request.tenant_phone) {
    const cleanPhone = (request.tenant_phone || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    page.drawText(`Téléphone: ${cleanPhone}`, {
      x: margin,
      y,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }
  
  if (request.tenant_email) {
    const cleanEmail = (request.tenant_email || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    page.drawText(`Email: ${cleanEmail}`, {
      x: margin,
      y,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }
  
  if (request.owner_name) {
    y -= lineHeight;
    page.drawText("PROPRIÉTAIRE", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.4, 0.8),
    });
    y -= lineHeight;
    
    const cleanOwnerName = (request.owner_name || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    page.drawText(cleanOwnerName, {
      x: margin,
      y,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }
  
  y -= lineHeight;
  
  // Adresse section
  page.drawText("ADRESSE D'INTERVENTION", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0.4, 0.8),
  });
  y -= lineHeight;
  
  const cleanAddress = (request.address || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  page.drawText(cleanAddress, {
    x: margin,
    y,
    size: 11,
    font: font,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;
  
  if (request.postal_code || request.city) {
    const cleanPostal = (request.postal_code || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    const cleanCity = (request.city || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    page.drawText(`${cleanPostal} ${cleanCity}`.trim(), {
      x: margin,
      y,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }
  y -= lineHeight;
  
  // Description section
  page.drawText("DESCRIPTION DU PROBLÈME", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0.4, 0.8),
  });
  y -= lineHeight;
  
  // Use wrapText helper for description
  const descriptionLines = wrapText(request.description || '', font, 11, maxWidth);
  for (const line of descriptionLines) {
    if (y < 80) break; // Don't overflow page
    page.drawText(line, {
      x: margin,
      y,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }
  
  // Disponibilités
  if (request.availability) {
    y -= lineHeight;
    page.drawText("DISPONIBILITÉS", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.4, 0.8),
    });
    y -= lineHeight;
    
    const availabilityLines = wrapText(request.availability || '', font, 11, maxWidth);
    for (const line of availabilityLines) {
      if (y < 80) break;
      page.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  }
  
  // Commentaires
  if (request.comments) {
    y -= lineHeight;
    page.drawText("COMMENTAIRES", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.4, 0.8),
    });
    y -= lineHeight;
    
    const commentLines = wrapText(request.comments || '', font, 11, maxWidth);
    for (const line of commentLines) {
      if (y < 80) break;
      page.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  }
  
  // Footer
  page.drawText(`Document généré le ${dateStr} - HelpConfort`, {
    x: margin,
    y: 30,
    size: 8,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  return await pdfDoc.save();
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const { request_id }: NotifyRequest = await req.json();

    if (!request_id) {
      return withCors(req, new Response(
        JSON.stringify({ error: "request_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the request with apporteur, agency and user info
    const { data: request, error: requestError } = await supabaseAdmin
      .from("apporteur_intervention_requests")
      .select(`
        *,
        apporteur:apporteurs(name),
        agency:apogee_agencies(label, contact_email),
        apporteur_user:apporteur_users(first_name, last_name, email)
      `)
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      return withCors(req, new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      ));
    }

    const agencyEmail = request.agency?.contact_email;
    const agencyName = request.agency?.label || "Agence";
    const apporteurName = request.apporteur?.name || "Apporteur";
    const userName = [request.apporteur_user?.first_name, request.apporteur_user?.last_name].filter(Boolean).join(' ') || "Utilisateur";
    const userEmail = request.apporteur_user?.email || "";

    if (!agencyEmail) {
      console.log("No agency email configured, skipping notification");
      return withCors(req, new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No agency email" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Generate PDF
    console.log("Generating PDF recap...");
    const pdfBytes = await generatePdfRecap(request, apporteurName, agencyName);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
    console.log("PDF generated, size:", pdfBytes.length, "bytes");

    // Build urgency label
    const urgencyLabels: Record<string, string> = {
      normal: "Normal",
      urgent: "Urgent",
      tres_urgent: "Très urgent"
    };
    const urgencyLabel = urgencyLabels[request.urgency] || request.urgency;

    // Build request type label
    const typeLabels: Record<string, string> = {
      depannage: "Dépannage",
      travaux: "Travaux",
      maintenance: "Maintenance",
      diagnostic: "Diagnostic"
    };
    const typeLabel = typeLabels[request.request_type] || request.request_type;

    const requestReference = request.reference || "N/A";

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0066CC; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Nouvelle demande d'intervention</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Réf. ${requestReference}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 17px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour,
              </p>
              <p style="color: #333333; font-size: 17px; line-height: 1.6; margin: 0 0 20px 0;">
                Une nouvelle demande d'intervention a été soumise par <strong>${apporteurName}</strong>.
              </p>
              <p style="color: #333333; font-size: 17px; line-height: 1.6; margin: 0 0 20px 0;">
                📎 <strong>Un récapitulatif PDF est joint à cet email.</strong>
              </p>
              
              <!-- Request Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Référence :</strong> <span style="color: #0066CC; font-weight: bold;">${requestReference}</span>
                    </p>
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Type :</strong> ${typeLabel}
                    </p>
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Urgence :</strong> <span style="color: ${request.urgency === 'tres_urgent' ? '#dc2626' : request.urgency === 'urgent' ? '#f59e0b' : '#059669'};">${urgencyLabel}</span>
                    </p>
                    ${request.owner_name ? `<p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;"><strong>Propriétaire :</strong> ${request.owner_name}</p>` : ''}
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Locataire :</strong> ${request.tenant_name}
                    </p>
                    ${request.tenant_phone ? `<p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;"><strong>Téléphone :</strong> ${request.tenant_phone}</p>` : ''}
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Adresse :</strong> ${request.address}${request.postal_code ? `, ${request.postal_code}` : ''}${request.city ? ` ${request.city}` : ''}
                    </p>
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Description :</strong>
                    </p>
                    <p style="color: #666666; font-size: 15px; margin: 0; padding: 12px; background-color: #ffffff; border-radius: 4px;">
                      ${request.description}
                    </p>
                    ${request.availability ? `<p style="color: #333333; font-size: 15px; margin: 12px 0 0 0;"><strong>Disponibilités :</strong> ${request.availability}</p>` : ''}
                    ${request.comments ? `<p style="color: #333333; font-size: 15px; margin: 12px 0 0 0;"><strong>Commentaires :</strong> ${request.comments}</p>` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- User Signature -->
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 30px 0 5px 0;">
                Cordialement,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                <strong>${userName}</strong><br/>
                <span style="color: #666666;">${apporteurName}</span>
                ${userEmail ? `<br/><span style="color: #666666; font-size: 14px;">${userEmail}</span>` : ''}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2025 HelpConfort. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email with PDF attachment
    const emailResponse = await resend.emails.send({
      from: "HelpConfort <noreply@helpconfort.services>",
      to: [agencyEmail],
      subject: `[${requestReference}] Nouvelle demande - ${apporteurName} - ${request.tenant_name}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Demande-${requestReference}.pdf`,
          content: pdfBase64,
        }
      ],
    });

    console.log("Email sent successfully with PDF attachment:", emailResponse);

    return withCors(req, new Response(
      JSON.stringify({ success: true, response: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

  } catch (error: any) {
    console.error("Error in notify-apporteur-request:", error);
    return withCors(req, new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});
