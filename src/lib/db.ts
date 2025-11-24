import { AppData } from '@/types/block';
import { supabase } from '@/integrations/supabase/client';

export async function saveAppData(data: AppData): Promise<void> {
  try {
    if (!data.blocks || data.blocks.length === 0) {
      console.warn('⚠️ Tentative de sauvegarde avec 0 blocks - ANNULÉE');
      return;
    }

    console.log(`💾 Sauvegarde BATCH optimisée de ${data.blocks.length} blocks...`);

    // Récupérer les IDs existants
    const { data: existingBlocks } = await supabase
      .from('blocks')
      .select('id');
    
    const existingIds = new Set(existingBlocks?.map(b => b.id) || []);
    const newBlocks = data.blocks.filter(b => !existingIds.has(b.id));
    const updateBlocks = data.blocks.filter(b => existingIds.has(b.id));
    const blockIds = new Set(data.blocks.map(b => b.id));
    const toDelete = existingBlocks?.filter(b => !blockIds.has(b.id)) || [];

    // 1. Insérer les nouveaux EN BATCH
    if (newBlocks.length > 0) {
      const { error: insertError } = await supabase
        .from('blocks')
        .insert(
          newBlocks.map(block => ({
            id: block.id,
            type: block.type,
            title: block.title,
            content: block.content || '',
            icon: block.icon || null,
            color_preset: block.colorPreset || 'white',
            order: block.order || 0,
            slug: block.slug,
            parent_id: block.parentId || null,
            attachments: (block.attachments || []) as any,
            hide_from_sidebar: block.hideFromSidebar || false,
            hide_title: block.hideTitle || false,
            content_type: block.contentType || 'section',
            tips_type: block.tipsType || null,
          })) as any
        );
      if (insertError) throw insertError;
      console.log(`✅ ${newBlocks.length} nouveaux blocks insérés`);
    }

    // 2. Mettre à jour EN BATCH avec upsert
    if (updateBlocks.length > 0) {
      const { error: updateError } = await supabase
        .from('blocks')
        .upsert(
          updateBlocks.map(block => ({
            id: block.id,
            type: block.type,
            title: block.title,
            content: block.content || '',
            icon: block.icon || null,
            color_preset: block.colorPreset || 'white',
            order: block.order || 0,
            slug: block.slug,
            parent_id: block.parentId || null,
            attachments: (block.attachments || []) as any,
            hide_from_sidebar: block.hideFromSidebar || false,
            hide_title: block.hideTitle || false,
            content_type: block.contentType || 'section',
            tips_type: block.tipsType || null,
          })) as any
        );
      if (updateError) throw updateError;
      console.log(`✅ ${updateBlocks.length} blocks mis à jour`);
    }

    // 3. Supprimer EN BATCH
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(b => b.id);
      const { error: deleteError } = await supabase
        .from('blocks')
        .delete()
        .in('id', idsToDelete);
      if (deleteError) throw deleteError;
      console.log(`🗑️ ${toDelete.length} blocks supprimés`);
    }

    console.log('✅ Sauvegarde BATCH réussie');
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
    throw error;
  }
}

export async function loadAppData(): Promise<AppData | null> {
  try {
    // Charger depuis Supabase
    const { data: blocks, error } = await supabase
      .from('blocks' as any)
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;

    if (!blocks || blocks.length === 0) {
      return null;
    }

    // Convertir au format AppData
    const appData: AppData = {
      blocks: blocks.map((block: any) => ({
        id: block.id,
        type: block.type as 'category' | 'section',
        title: block.title,
        content: block.content,
        icon: block.icon || undefined,
        colorPreset: block.color_preset as any,
        order: block.order,
        slug: block.slug,
        parentId: block.parent_id || undefined,
        attachments: Array.isArray(block.attachments) ? block.attachments : [],
        hideFromSidebar: block.hide_from_sidebar || false,
        hideTitle: block.hide_title || false,
        contentType: block.content_type || 'section',
        tipsType: block.tips_type || undefined,
      })),
      version: '1.0',
      lastModified: Date.now(),
    };

    console.log(`✅ ${blocks.length} blocs chargés depuis le serveur`);
    return appData;
  } catch (error) {
    console.error('❌ Erreur chargement Supabase:', error);
    return null;
  }
}

export async function exportData(): Promise<string> {
  const data = await loadAppData();
  if (!data) {
    return JSON.stringify({ blocks: [], version: '1.0', lastModified: Date.now() }, null, 2);
  }
  return JSON.stringify(data, null, 2);
}

export async function importData(jsonString: string): Promise<void> {
  try {
    const data: AppData = JSON.parse(jsonString);
    data.lastModified = Date.now();
    await saveAppData(data);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}
