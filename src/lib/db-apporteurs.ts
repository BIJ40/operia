import { AppData, Block } from '@/types/block';
import { supabase } from '@/integrations/supabase/client';

// Helpers DB spécifiques pour la table apporteur_blocks
export async function saveApporteurData(data: AppData): Promise<void> {
  try {
    if (!data.blocks || data.blocks.length === 0) {
      console.warn('⚠️ Sauvegarde apporteurs annulée (0 blocks)');
      return;
    }

    console.log(`💾 Sauvegarde BATCH apporteurs: ${data.blocks.length} blocks...`);

    const { data: existingBlocks } = await supabase
      .from('apporteur_blocks' as any)
      .select('id');
    
    const existingIds = new Set(existingBlocks?.map((b: any) => b.id) || []);
    const newBlocks = data.blocks.filter(b => !existingIds.has(b.id));
    const updateBlocks = data.blocks.filter(b => existingIds.has(b.id));

    // Insert nouveaux
    if (newBlocks.length > 0) {
      const { error } = await supabase
        .from('apporteur_blocks' as any)
        .insert(newBlocks.map(block => ({
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
          show_title_on_card: block.showTitleOnCard !== false,
          show_title_in_menu: block.showTitleInMenu !== false,
          is_single_section: block.isSingleSection || false,
        })));
      if (error) throw error;
    }

    // Update en batch avec upsert
    if (updateBlocks.length > 0) {
      const { error } = await supabase
        .from('apporteur_blocks' as any)
        .upsert(updateBlocks.map(block => ({
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
          show_title_on_card: block.showTitleOnCard !== false,
          show_title_in_menu: block.showTitleInMenu !== false,
          is_single_section: block.isSingleSection || false,
        })));
      if (error) throw error;
    }

    console.log('✅ Apporteurs sauvegardés (BATCH optimisé)');
  } catch (error) {
    console.error('❌ Erreur sauvegarde apporteurs:', error);
    throw error;
  }
}

export async function loadApporteurData(): Promise<AppData | null> {
  try {
    // Charger depuis Supabase (table apporteur_blocks)
    const { data: blocks, error } = await supabase
      .from('apporteur_blocks' as any)
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
        type: block.type as 'category' | 'subcategory' | 'section',
        title: block.title,
        content: block.content,
        icon: block.icon || undefined,
        colorPreset: block.color_preset as any,
        order: block.order,
        slug: block.slug,
        parentId: block.parent_id || undefined,
        attachments: Array.isArray(block.attachments) ? block.attachments : [],
        hideFromSidebar: block.hide_from_sidebar || false,
        showTitleOnCard: block.show_title_on_card !== false,
        showTitleInMenu: block.show_title_in_menu !== false,
        isSingleSection: block.is_single_section || false,
      })),
      version: '1.0',
      lastModified: Date.now(),
    };

    console.log(`✅ ${blocks.length} blocs apporteurs chargés depuis le serveur`);
    return appData;
  } catch (error) {
    console.error('❌ Erreur chargement apporteurs Supabase:', error);
    return null;
  }
}

export async function exportApporteurData(): Promise<string> {
  const data = await loadApporteurData();
  if (!data) {
    return JSON.stringify({ blocks: [], version: '1.0', lastModified: Date.now() }, null, 2);
  }
  return JSON.stringify(data, null, 2);
}

export async function importApporteurData(jsonString: string): Promise<void> {
  try {
    const data: AppData = JSON.parse(jsonString);
    data.lastModified = Date.now();
    await saveApporteurData(data);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}
