import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommercialProfile {
  agence_nom_long: string | null;
  baseline: string | null;
  date_creation: string | null;
  rang_agence: string | null;
  nb_techniciens: number | null;
  nb_assistantes: number | null;
  description_equipe: string | null;
  zones_intervention: string | null;
  email_contact: string | null;
  phone_contact: string | null;
  texte_qui_sommes_nous: string | null;
  texte_nos_valeurs: string | null;
  texte_nos_engagements: string | null;
  texte_nos_competences: string | null;
  texte_comment_ca_se_passe: string | null;
  logo_agence_url: string | null;
  photo_equipe_url: string | null;
  photo_lien_suivi_url: string | null;
  photo_realisation1_avant_url: string | null;
  photo_realisation1_apres_url: string | null;
  photo_realisation2_avant_url: string | null;
  photo_realisation2_apres_url: string | null;
  photo_realisation3_avant_url: string | null;
  photo_realisation3_apres_url: string | null;
  photo_temoignage1_url: string | null;
  photo_temoignage2_url: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { agencyId } = await req.json();
    if (!agencyId) {
      return new Response(JSON.stringify({ error: 'agencyId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[generate-pptx] Starting generation for agency: ${agencyId}`);

    // Get commercial profile
    const { data: profile, error: profileError } = await supabase
      .from('agency_commercial_profile')
      .select('*')
      .eq('agency_id', agencyId)
      .single();

    if (profileError || !profile) {
      console.error('[generate-pptx] Profile not found:', profileError);
      return new Response(JSON.stringify({ error: 'Profil commercial non trouvé pour cette agence' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get agency info
    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('label, slug')
      .eq('id', agencyId)
      .single();

    // Download template
    const { data: templateData, error: templateError } = await supabase.storage
      .from('pptx-templates')
      .download('templates/support_agence_v1.pptx');

    if (templateError || !templateData) {
      console.error('[generate-pptx] Template not found:', templateError);
      return new Response(JSON.stringify({ 
        error: 'Template PPTX non trouvé. Veuillez uploader le modèle maître.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[generate-pptx] Template loaded, processing...');

    // Read template as ArrayBuffer
    const templateBuffer = await templateData.arrayBuffer();
    const templateBytes = new Uint8Array(templateBuffer);

    // Build replacement map
    const replacements: Record<string, string> = {
      '{{AGENCE_NOM_LONG}}': profile.agence_nom_long || '',
      '{{BASELINE}}': profile.baseline || '',
      '{{DATE_CREATION}}': profile.date_creation || '',
      '{{RANG_AGENCE}}': profile.rang_agence || '',
      '{{NB_TECHNICIENS}}': String(profile.nb_techniciens || ''),
      '{{NB_ASSISTANTES}}': String(profile.nb_assistantes || ''),
      '{{DESCRIPTION_EQUIPE}}': profile.description_equipe || '',
      '{{ZONES_INTERVENTION}}': profile.zones_intervention || '',
      '{{EMAIL_CONTACT}}': profile.email_contact || '',
      '{{PHONE_CONTACT}}': profile.phone_contact || '',
      '{{TEXTE_QUI_SOMMES_NOUS}}': profile.texte_qui_sommes_nous || '',
      '{{TEXTE_NOS_VALEURS}}': profile.texte_nos_valeurs || '',
      '{{TEXTE_NOS_ENGAGEMENTS}}': profile.texte_nos_engagements || '',
      '{{TEXTE_NOS_COMPETENCES}}': profile.texte_nos_competences || '',
      '{{TEXTE_COMMENT_CA_SE_PASSE}}': profile.texte_comment_ca_se_passe || '',
    };

    // PPTX is a ZIP file, we need to process XML content
    // Use JSZip-like approach with Deno
    const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
    
    const zip = await JSZip.loadAsync(templateBytes);
    
    // Process all XML files in the PPTX
    const xmlFiles = Object.keys(zip.files).filter(
      name => name.endsWith('.xml') || name.endsWith('.rels')
    );

    for (const fileName of xmlFiles) {
      const file = zip.files[fileName];
      if (!file.dir) {
        let content = await file.async('string');
        
        // Replace text placeholders
        for (const [placeholder, value] of Object.entries(replacements)) {
          // Escape special XML characters in the value
          const escapedValue = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
          
          // Handle broken tags (PowerPoint sometimes splits text across XML tags)
          const brokenPlaceholder = placeholder.split('').join('</a:t></a:r><a:r><a:t>');
          content = content.replace(new RegExp(brokenPlaceholder, 'g'), escapedValue);
          content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), escapedValue);
        }
        
        zip.file(fileName, content);
      }
    }

    // Generate the modified PPTX
    const generatedBuffer = await zip.generateAsync({ 
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Upload generated file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const agencySlug = agency?.slug || agencyId;
    const generatedPath = `generated/${agencyId}/${timestamp}_support_agence.pptx`;

    const { error: uploadError } = await supabase.storage
      .from('pptx-templates')
      .upload(generatedPath, generatedBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: false
      });

    if (uploadError) {
      console.error('[generate-pptx] Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la sauvegarde du fichier' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('pptx-templates')
      .createSignedUrl(generatedPath, 3600); // 1 hour

    if (signedUrlError) {
      console.error('[generate-pptx] Signed URL error:', signedUrlError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la génération du lien' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[generate-pptx] Generation complete:', generatedPath);

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileName: `support_commercial_${agencySlug}_${timestamp}.pptx`,
      generatedAt: new Date().toISOString(),
      path: generatedPath
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[generate-pptx] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
