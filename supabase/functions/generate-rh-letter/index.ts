import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check N2+ role
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, global_role')
      .eq('id', user.id)
      .single();

    if (!profile?.agency_id) {
      return new Response(JSON.stringify({ error: 'Utilisateur non rattaché à une agence' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roleLevel = getRoleLevel(profile.global_role);
    if (roleLevel < 2) {
      return new Response(JSON.stringify({ error: 'Accès refusé - N2+ requis' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'request_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load request
    const { data: rhRequest, error: reqError } = await supabase
      .from('rh_requests')
      .select('*, collaborators!rh_requests_employee_user_id_fkey(id, first_name, last_name, user_id)')
      .eq('id', request_id)
      .single();

    if (reqError || !rhRequest) {
      console.error('Request not found:', reqError);
      return new Response(JSON.stringify({ error: 'Demande non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check agency match
    if (rhRequest.agency_id !== profile.agency_id && roleLevel < 5) {
      return new Response(JSON.stringify({ error: 'Demande hors agence' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load collaborator via employee_user_id
    const { data: collaborator } = await supabase
      .from('collaborators')
      .select('id, first_name, last_name, user_id')
      .eq('user_id', rhRequest.employee_user_id)
      .single();

    if (!collaborator) {
      return new Response(JSON.stringify({ error: 'Collaborateur non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load signature (PNG version)
    const { data: signature } = await supabase
      .from('user_signatures')
      .select('signature_svg, signature_png_base64')
      .eq('user_id', collaborator.user_id)
      .single();

    // Load agency
    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('label')
      .eq('id', rhRequest.agency_id)
      .single();

    // Load template (agency-specific first, then global)
    let template = null;
    const templateKey = rhRequest.request_type === 'EPI_RENEWAL' ? 'EPI_RENEWAL' : rhRequest.request_type;

    const { data: agencyTemplate } = await supabase
      .from('rh_letter_templates')
      .select('*')
      .eq('agency_id', rhRequest.agency_id)
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (agencyTemplate) {
      template = agencyTemplate;
    } else {
      const { data: globalTemplate } = await supabase
        .from('rh_letter_templates')
        .select('*')
        .is('agency_id', null)
        .eq('template_key', templateKey)
        .eq('is_active', true)
        .single();
      template = globalTemplate;
    }

    if (!template) {
      return new Response(JSON.stringify({ error: 'Template non trouvé pour ce type de demande' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build variables
    const payload = rhRequest.payload || {};
    const items = Array.isArray(payload.items) 
      ? payload.items.map((item: string) => `• ${item}`).join('\n')
      : (payload.items || 'Non spécifié');
    
    const variables: Record<string, string> = {
      '{{date}}': new Date().toLocaleDateString('fr-FR'),
      '{{employee_full_name}}': `${collaborator.first_name} ${collaborator.last_name}`,
      '{{agency_name}}': agency?.label || 'HelpConfort',
      '{{items}}': items,
      '{{description}}': payload.description || rhRequest.description || 'Aucune description',
      '{{signature}}': signature?.signature_png_base64 ? '[Signature électronique]' : 'Signé électroniquement',
    };

    // Replace variables in template
    let content = template.body_markdown;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;
    const lineHeight = 18;
    const maxWidth = width - 2 * margin;

    // Parse markdown-like content
    const lines = content.split('\n');
    for (const line of lines) {
      if (y < margin + 100) {
        // Add signature at bottom if we have it
        break;
      }

      let text = line;
      let currentFont = font;
      let fontSize = 11;

      // Handle headers
      if (text.startsWith('# ')) {
        text = text.substring(2);
        currentFont = fontBold;
        fontSize = 18;
        y -= 10;
      } else if (text.startsWith('## ')) {
        text = text.substring(3);
        currentFont = fontBold;
        fontSize = 14;
        y -= 5;
      } else if (text.startsWith('**') && text.endsWith('**')) {
        text = text.slice(2, -2);
        currentFont = fontBold;
      } else if (text === '---') {
        // Draw horizontal line
        page.drawLine({
          start: { x: margin, y },
          end: { x: width - margin, y },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
        y -= lineHeight;
        continue;
      }

      // Remove remaining markdown
      text = text.replace(/\*\*/g, '').replace(/\*/g, '');

      if (text.trim()) {
        // Word wrap
        const words = text.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = currentFont.widthOfTextAtSize(testLine, fontSize);
          
          if (testWidth > maxWidth && currentLine) {
            page.drawText(currentLine, {
              x: margin,
              y,
              size: fontSize,
              font: currentFont,
              color: rgb(0, 0, 0),
            });
            y -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font: currentFont,
            color: rgb(0, 0, 0),
          });
        }
      }
      
      y -= lineHeight;
    }

    // Add signature image if available
    if (signature?.signature_png_base64) {
      try {
        const pngData = base64Decode(signature.signature_png_base64.replace(/^data:image\/png;base64,/, ''));
        const pngImage = await pdfDoc.embedPng(pngData);
        const imgDims = pngImage.scale(0.3);
        
        page.drawImage(pngImage, {
          x: margin,
          y: y - imgDims.height - 10,
          width: imgDims.width,
          height: imgDims.height,
        });
      } catch (e) {
        console.error('Failed to embed signature:', e);
        // Continue without image
      }
    }

    const pdfBytes = await pdfDoc.save();
    
    // Save to storage
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `lettre-epi-${dateStr}.pdf`;
    const filePath = `rh-letters/${rhRequest.agency_id}/${request_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('rh-documents')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Erreur upload PDF' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update request
    const { error: updateError } = await supabase
      .from('rh_requests')
      .update({
        generated_letter_path: filePath,
        generated_letter_file_name: fileName,
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    console.log(`Letter generated for request ${request_id}: ${filePath}`);

    return new Response(JSON.stringify({
      success: true,
      file_path: filePath,
      file_name: fileName,
      request_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getRoleLevel(role: string | null): number {
  const levels: Record<string, number> = {
    'base_user': 0,
    'franchisee_user': 1,
    'franchisee_admin': 2,
    'franchisor_user': 3,
    'franchisor_admin': 4,
    'platform_admin': 5,
    'superadmin': 6,
  };
  return levels[role || ''] ?? 0;
}
