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
    // Sauvegarder dans Supabase
    const { error: deleteError } = await supabase
      .from('blocks' as any)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) throw deleteError;

    if (data.blocks && data.blocks.length > 0) {
      const { error: insertError } = await supabase
        .from('blocks' as any)
        .insert(
          data.blocks.map(block => ({
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
    }

    console.log('✅ Données sauvegardées sur le serveur');
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
