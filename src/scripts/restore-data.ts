import apogeeData from '../data/apogee-data.json';
import { supabase } from '../integrations/supabase/client';

async function restoreData() {
  try {
    console.log('🔄 Restauration des données...');
    
    // Supprimer toutes les données existantes
    const { error: deleteError } = await supabase
      .from('blocks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Erreur suppression:', deleteError);
      throw deleteError;
    }

    // Insérer les données depuis le backup
    if (apogeeData.blocks && apogeeData.blocks.length > 0) {
      const { error: insertError } = await supabase
        .from('blocks')
        .insert(
          apogeeData.blocks.map((block: any) => ({
            id: block.id,
            type: block.type,
            title: block.title,
            content: block.content || '',
            icon: block.icon || null,
            color_preset: block.colorPreset || 'white',
            order: block.order || 0,
            slug: block.slug,
            parent_id: block.parentId || null,
            attachments: block.attachments || [],
            hide_from_sidebar: block.hideFromSidebar || false,
          }))
        );

      if (insertError) {
        console.error('Erreur insertion:', insertError);
        throw insertError;
      }

      console.log(`✅ ${apogeeData.blocks.length} blocks restaurés avec succès!`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error);
  }
}

// Exécuter la restauration
restoreData();
