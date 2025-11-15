import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AppData, Block } from '@/types/block';
import { supabase } from '@/integrations/supabase/client';

interface ApogeeDB extends DBSchema {
  appData: {
    key: string;
    value: AppData;
  };
}

const DB_NAME = 'apogee-guide-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ApogeeDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ApogeeDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ApogeeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('appData')) {
        db.createObjectStore('appData');
      }
    },
  });

  return dbInstance;
}

export async function saveAppData(data: AppData): Promise<void> {
  try {
    if (!data.blocks || data.blocks.length === 0) {
      console.warn('⚠️ Tentative de sauvegarde avec 0 blocks - ANNULÉE pour éviter perte de données');
      return;
    }

    console.log(`💾 Sauvegarde de ${data.blocks.length} blocks...`);

    // Récupérer les IDs existants
    const { data: existingBlocks } = await supabase
      .from('blocks')
      .select('id');
    
    const existingIds = new Set(existingBlocks?.map(b => b.id) || []);
    const newBlocks = data.blocks.filter(b => !existingIds.has(b.id));
    const updateBlocks = data.blocks.filter(b => existingIds.has(b.id));
    const blockIds = new Set(data.blocks.map(b => b.id));
    const toDelete = existingBlocks?.filter(b => !blockIds.has(b.id)) || [];

    // 1. Insérer les nouveaux
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
          })) as any
        );
      if (insertError) throw insertError;
      console.log(`✅ ${newBlocks.length} nouveaux blocks insérés`);
    }

    // 2. Mettre à jour les existants UN PAR UN (plus sûr)
    for (const block of updateBlocks) {
      const { error: updateError } = await supabase
        .from('blocks')
        .update({
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
        } as any)
        .eq('id', block.id);
      
      if (updateError) {
        console.error(`❌ Erreur mise à jour block ${block.id}:`, updateError);
      }
    }
    console.log(`✅ ${updateBlocks.length} blocks mis à jour`);

    // 3. Supprimer UNIQUEMENT les blocks qui n'existent plus
    if (toDelete.length > 0) {
      for (const block of toDelete) {
        await supabase.from('blocks').delete().eq('id', block.id);
      }
      console.log(`🗑️ ${toDelete.length} blocks supprimés`);
    }

    console.log('✅ Sauvegarde complète réussie');
  } catch (error) {
    console.error('❌ Erreur sauvegarde Supabase:', error);
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
