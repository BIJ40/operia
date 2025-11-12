import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    console.log('Processing document:', file.name, file.type);

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
