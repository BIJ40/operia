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

    // Pour les PDFs
    if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      extractedContent = `[Document PDF: ${fileName}]

Ce fichier PDF a été reçu. Pour l'importer dans la base de connaissances :

Option 1: Convertissez le PDF en texte en utilisant un outil externe, puis copiez-collez le contenu dans le champ "Contenu"

Option 2: Si le PDF contient principalement des images ou du texte scanné, utilisez un outil OCR pour extraire le texte

Métadonnées:
- Nom du fichier: ${fileName}
- Type: ${fileType}
- Taille: ${bytes.length} octets

Une fois le contenu extrait, remplacez ce message par le texte réel du document.`;
    } 
    // Pour les images
    else if (fileType.startsWith('image/') || 
             ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fileName.toLowerCase().endsWith(ext))) {
      extractedContent = `[Image: ${fileName}]

Cette image a été reçue. Pour l'importer dans la base de connaissances :

Si l'image contient du texte, vous pouvez :
1. Utiliser un outil OCR en ligne (ex: Google Docs, Adobe Acrobat Online)
2. Copier-coller le texte extrait dans le champ "Contenu"

Si l'image est un schéma ou diagramme, décrivez son contenu dans le champ "Contenu"

Métadonnées:
- Nom du fichier: ${fileName}
- Type: ${fileType}
- Taille: ${bytes.length} octets

Remplacez ce message par la description ou le texte extrait de l'image.`;
    } 
    // Pour les fichiers texte
    else {
      try {
        extractedContent = new TextDecoder().decode(bytes);
      } catch (error) {
        extractedContent = `[Erreur de lecture du fichier: ${fileName}]

Impossible de lire ce fichier comme du texte. Veuillez vérifier le format et réessayer.`;
      }
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
