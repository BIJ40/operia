import { supabase } from '../integrations/supabase/client';
import apogeeData from '../data/apogee-data.json';

async function fullRestore() {
  try {
    console.log('🔄 Restauration complète depuis backup...');
    
    // Supprimer toutes les données
    await supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Préparer les données pour insertion
    const blocksToInsert = apogeeData.blocks.map((block: any) => ({
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
    }));

    // Insérer par lots de 100
    for (let i = 0; i < blocksToInsert.length; i += 100) {
      const batch = blocksToInsert.slice(i, i + 100);
      const { error } = await supabase.from('blocks').insert(batch);
      if (error) throw error;
      console.log(`✅ Lot ${Math.floor(i/100) + 1}: ${batch.length} blocks insérés`);
    }

    console.log(`✅✅✅ Restauration terminée: ${blocksToInsert.length} blocks au total`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

fullRestore();
