import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentification requise' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Créer le client Supabase avec l'auth header
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Vérifier l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentification invalide' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Vérifier le rôle admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Accès administrateur requis' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Admin user authenticated:', user.id);

    // Traiter le fichier
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    // Limite de taille : 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Fichier trop volumineux. Taille maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    console.log('Processing document:', file.name, file.type, `${(file.size / 1024).toFixed(2)}KB`);

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let extractedContent = '';
    const fileName = file.name;
    const fileType = file.type;

    // Pour les fichiers texte
    if (fileType.startsWith('text/') || 
        fileName.toLowerCase().endsWith('.txt') ||
        fileName.toLowerCase().endsWith('.md') ||
        fileName.toLowerCase().endsWith('.json') ||
        fileName.toLowerCase().endsWith('.csv')) {
      try {
        extractedContent = new TextDecoder().decode(bytes);
      } catch (error) {
        throw new Error(`Impossible de lire le fichier texte: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    } 
    // Pour les PDFs et images - renvoyer un message indiquant qu'ils ne sont pas supportés en batch
    else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf') ||
             fileType.startsWith('image/')) {
      throw new Error('Les fichiers PDF et images doivent être importés un par un via le formulaire principal');
    }
    else {
      throw new Error(`Type de fichier non supporté pour l'import batch: ${fileType}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: extractedContent,
        fileName: fileName,
        fileType: fileType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
