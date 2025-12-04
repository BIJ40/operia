import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateDocumentRequest {
  request_id: string;
  document_type: 'ATTESTATION_EMPLOYEUR' | 'SOLDE_CONGES' | 'CERTIFICAT_TRAVAIL' | 'AUTRE';
  title: string;
  content: string;
  collaborator_id: string;
}

interface AgencyInfo {
  id: string;
  label: string;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

interface CollaboratorInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  hiring_date: string | null;
  role: string;
}

interface ValidatorInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client with user token for RLS
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for storage operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Parse request body
    const body: GenerateDocumentRequest = await req.json();
    const { request_id, document_type, title, content, collaborator_id } = body;

    if (!document_type || !title || !content || !collaborator_id) {
      throw new Error('Missing required fields: document_type, title, content, collaborator_id');
    }

    console.log('[generate-hr-document] Generating document:', { request_id, document_type, collaborator_id });

    // Get user's agency
    const { data: userProfile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('agency_id, first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.agency_id) {
      throw new Error('User agency not found');
    }

    const validatorInfo: ValidatorInfo = {
      id: user.id,
      first_name: userProfile.first_name,
      last_name: userProfile.last_name,
      email: userProfile.email,
    };

    // Get agency info
    const { data: agency, error: agencyError } = await supabaseUser
      .from('apogee_agencies')
      .select('id, label, adresse, code_postal, ville, contact_phone, contact_email')
      .eq('id', userProfile.agency_id)
      .single();

    if (agencyError || !agency) {
      throw new Error('Agency not found');
    }

    // Get collaborator info
    const { data: collaborator, error: collabError } = await supabaseUser
      .from('collaborators')
      .select('id, first_name, last_name, email, hiring_date, role')
      .eq('id', collaborator_id)
      .eq('agency_id', userProfile.agency_id)
      .single();

    if (collabError || !collaborator) {
      throw new Error('Collaborator not found or not in your agency');
    }

    // Get agency stamp if exists
    const { data: stamp } = await supabaseUser
      .from('agency_stamps')
      .select('file_path')
      .eq('agency_id', userProfile.agency_id)
      .eq('stamp_type', 'logo')
      .eq('is_active', true)
      .maybeSingle();

    // Load stamp image if exists
    let stampImageBytes: Uint8Array | null = null;
    if (stamp?.file_path) {
      try {
        const { data: stampData } = await supabaseAdmin.storage
          .from('rh-documents')
          .download(stamp.file_path);
        if (stampData) {
          stampImageBytes = new Uint8Array(await stampData.arrayBuffer());
        }
      } catch (e) {
        console.warn('[generate-hr-document] Could not load stamp image:', e);
      }
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const { width, height } = page.getSize();

    // Load fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const primaryColor = rgb(0.086, 0.337, 0.624); // HelpConfort blue
    const textColor = rgb(0.1, 0.1, 0.1);
    const grayColor = rgb(0.4, 0.4, 0.4);

    let yPosition = height - 50;

    // === HEADER: Agency info ===
    page.drawText(agency.label.toUpperCase(), {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });
    yPosition -= 18;

    if (agency.adresse) {
      page.drawText(agency.adresse, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: grayColor,
      });
      yPosition -= 14;
    }

    if (agency.code_postal || agency.ville) {
      page.drawText(`${agency.code_postal || ''} ${agency.ville || ''}`.trim(), {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: grayColor,
      });
      yPosition -= 14;
    }

    if (agency.contact_phone) {
      page.drawText(`Tél: ${agency.contact_phone}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: grayColor,
      });
      yPosition -= 14;
    }

    if (agency.contact_email) {
      page.drawText(`Email: ${agency.contact_email}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: grayColor,
      });
    }

    // === DATE (right aligned) ===
    const today = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const dateText = `${agency.ville || 'Fait'}, le ${today}`;
    const dateWidth = helvetica.widthOfTextAtSize(dateText, 11);
    page.drawText(dateText, {
      x: width - 50 - dateWidth,
      y: height - 50,
      size: 11,
      font: helvetica,
      color: textColor,
    });

    // === TITLE ===
    yPosition = height - 180;
    const titleWidth = helveticaBold.widthOfTextAtSize(title.toUpperCase(), 14);
    page.drawText(title.toUpperCase(), {
      x: (width - titleWidth) / 2,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: primaryColor,
    });

    // Underline
    page.drawLine({
      start: { x: (width - titleWidth) / 2, y: yPosition - 3 },
      end: { x: (width + titleWidth) / 2, y: yPosition - 3 },
      thickness: 1,
      color: primaryColor,
    });

    // === EMPLOYEE INFO ===
    yPosition -= 50;
    page.drawText('Concernant :', {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: textColor,
    });
    yPosition -= 18;

    const employeeName = `${collaborator.first_name} ${collaborator.last_name}`;
    page.drawText(`M./Mme ${employeeName}`, {
      x: 70,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: textColor,
    });
    yPosition -= 16;

    if (collaborator.hiring_date) {
      const hireDate = new Date(collaborator.hiring_date).toLocaleDateString('fr-FR');
      page.drawText(`Embauché(e) le : ${hireDate}`, {
        x: 70,
        y: yPosition,
        size: 11,
        font: helvetica,
        color: textColor,
      });
      yPosition -= 16;
    }

    page.drawText(`Fonction : ${collaborator.role}`, {
      x: 70,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: textColor,
    });

    // === CONTENT ===
    yPosition -= 50;
    
    // Split content into lines (simple word wrap)
    const maxLineWidth = width - 100;
    const fontSize = 11;
    const lineHeight = 16;
    const words = content.split(' ');
    let currentLine = '';
    const lines: string[] = [];

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = helvetica.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > maxLineWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Draw content lines
    for (const line of lines) {
      // Handle line breaks in original content
      const subLines = line.split('\n');
      for (const subLine of subLines) {
        if (yPosition < 150) {
          // Add new page if needed
          const newPage = pdfDoc.addPage([595.28, 841.89]);
          yPosition = height - 50;
        }
        page.drawText(subLine, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font: helvetica,
          color: textColor,
        });
        yPosition -= lineHeight;
      }
    }

    // === SIGNATURE SECTION ===
    yPosition -= 40;
    
    // Validator signature (right side)
    const sigX = width - 200;
    page.drawText('Le responsable RH,', {
      x: sigX,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: grayColor,
    });
    yPosition -= 50;

    // Add stamp image if available
    if (stampImageBytes) {
      try {
        let stampImage;
        // Try PNG first, then JPEG
        try {
          stampImage = await pdfDoc.embedPng(stampImageBytes);
        } catch {
          stampImage = await pdfDoc.embedJpg(stampImageBytes);
        }
        
        // Scale stamp to max 100x100
        const stampDims = stampImage.scale(Math.min(100 / stampImage.width, 100 / stampImage.height));
        page.drawImage(stampImage, {
          x: sigX,
          y: yPosition - stampDims.height,
          width: stampDims.width,
          height: stampDims.height,
        });
        yPosition -= stampDims.height + 10;
      } catch (e) {
        console.warn('[generate-hr-document] Could not embed stamp image:', e);
      }
    }

    // Validator name
    const validatorName = `${validatorInfo.first_name || ''} ${validatorInfo.last_name || ''}`.trim() || validatorInfo.email;
    page.drawText(validatorName, {
      x: sigX,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: textColor,
    });

    // === FOOTER ===
    const footerY = 30;
    const footerText = `Document généré le ${new Date().toLocaleString('fr-FR')} - ${agency.label}`;
    const footerWidth = helvetica.widthOfTextAtSize(footerText, 8);
    page.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: footerY,
      size: 8,
      font: helvetica,
      color: grayColor,
    });

    // Serialize PDF
    const pdfBytes = await pdfDoc.save();

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const fileName = `${sanitizedTitle}_${timestamp}.pdf`;
    const filePath = `${userProfile.agency_id}/${collaborator_id}/generated/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('rh-documents')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[generate-hr-document] Upload error:', uploadError);
      throw new Error('Failed to upload generated document');
    }

    // Record in hr_generated_documents
    const { data: generatedDoc, error: insertError } = await supabaseAdmin
      .from('hr_generated_documents')
      .insert({
        request_id: request_id || null,
        agency_id: userProfile.agency_id,
        collaborator_id,
        document_type,
        title,
        content,
        file_path: filePath,
        generated_by: user.id,
        metadata: {
          validator_name: validatorName,
          agency_name: agency.label,
          employee_name: employeeName,
          has_stamp: !!stampImageBytes,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-hr-document] Insert error:', insertError);
      // Don't fail - document was uploaded successfully
    }

    // Also create a collaborator_documents entry for the vault
    const { data: vaultDoc, error: vaultError } = await supabaseAdmin
      .from('collaborator_documents')
      .insert({
        collaborator_id,
        agency_id: userProfile.agency_id,
        doc_type: document_type === 'ATTESTATION_EMPLOYEUR' ? 'ATTESTATION' : 'HR_NOTE',
        title,
        description: `Document généré par ${validatorName}`,
        file_path: filePath,
        file_name: fileName,
        file_size: pdfBytes.length,
        file_type: 'application/pdf',
        visibility: 'EMPLOYEE_VISIBLE',
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (vaultError) {
      console.error('[generate-hr-document] Vault insert error:', vaultError);
    }

    console.log('[generate-hr-document] Document generated successfully:', filePath);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          generated_document_id: generatedDoc?.id,
          vault_document_id: vaultDoc?.id,
          file_path: filePath,
          file_name: fileName,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[generate-hr-document] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
