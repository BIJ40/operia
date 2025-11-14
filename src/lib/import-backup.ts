import { supabase } from '@/integrations/supabase/client';
import backupData from '@/data/apogee-data.json';
import { toast } from 'sonner';

export async function importBackupData() {
  try {
    toast.info(`Suppression des données actuelles...`);
    
    // 1. Supprimer TOUTES les données actuelles
    const { error: deleteError } = await supabase
      .from('blocks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) throw deleteError;

    toast.info(`Import de ${backupData.blocks.length} blocs...`);

    // 2. Importer par lots de 50
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < backupData.blocks.length; i += batchSize) {
      const batch = backupData.blocks.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('blocks')
        .insert(
          batch.map((block: any) => ({
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

      if (insertError) throw insertError;
      
      imported += batch.length;
      
      if (i % 100 === 0) {
        toast.info(`${imported}/${backupData.blocks.length} blocs importés...`);
      }
    }

    toast.success(`✅ ${imported} blocs importés avec succès !`);
    
    // Recharger la page après 2 secondes
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    return { success: true, imported };
  } catch (error: any) {
    console.error('Erreur import:', error);
    toast.error(`Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
}
