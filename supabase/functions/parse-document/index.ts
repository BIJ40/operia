import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Authentification requise' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Authentification invalide' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Accès administrateur requis' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error('Aucun fichier fourni');

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) throw new Error(`Fichier trop volumineux. Taille maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let extractedContent = '';
    const fileName = file.name;
    const fileType = file.type;

    if (fileType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.json') || fileName.toLowerCase().endsWith('.csv')) {
      extractedContent = new TextDecoder().decode(bytes);
    } else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf') || fileType.startsWith('image/')) {
      throw new Error('Les fichiers PDF et images doivent être importés un par un via le formulaire principal');
    } else {
      throw new Error(`Type de fichier non supporté pour l'import batch: ${fileType}`);
    }

    return withCors(req, new Response(JSON.stringify({ success: true, content: extractedContent, fileName, fileType }), { headers: { 'Content-Type': 'application/json' } }));
  } catch (error) {
    console.error('Error:', error);
    return withCors(req, new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
  }
});
