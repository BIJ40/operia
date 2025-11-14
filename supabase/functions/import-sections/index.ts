import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Section {
  id: string;
  title: string;
  content: string;
  slug: string;
  colorPreset: string;
  order: number;
  icon: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { categoryId, sections } = await req.json();

    if (!categoryId || !sections || !Array.isArray(sections)) {
      return new Response(
        JSON.stringify({ error: 'categoryId et sections sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Importation de ${sections.length} sections pour la catégorie ${categoryId}`);

    // Supprimer les sections existantes de cette catégorie
    const { error: deleteError } = await supabase
      .from('blocks')
      .delete()
      .eq('parent_id', categoryId)
      .eq('type', 'section');

    if (deleteError) {
      console.error('Erreur lors de la suppression des sections existantes:', deleteError);
      throw deleteError;
    }

    console.log('Sections existantes supprimées');

    // Insérer les nouvelles sections une par une
    const results = [];
    for (const section of sections) {
      const { data, error } = await supabase
        .from('blocks')
        .insert({
          id: section.id,
          type: 'section',
          title: section.title,
          content: section.content,
          parent_id: categoryId,
          slug: section.slug,
          color_preset: section.colorPreset,
          order: section.order,
          icon: section.icon || null,
          hide_from_sidebar: false,
        })
        .select()
        .single();

      if (error) {
        console.error(`Erreur lors de l'insertion de la section ${section.title}:`, error);
        results.push({ success: false, title: section.title, error: error.message });
      } else {
        console.log(`Section ${section.title} créée avec succès`);
        results.push({ success: true, title: section.title, id: data.id });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Import terminé: ${successCount} succès, ${failureCount} échecs`);

    return new Response(
      JSON.stringify({
        message: `${successCount} sections créées avec succès, ${failureCount} échecs`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
