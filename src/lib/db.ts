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
let migrationCompleted = false;

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

// Migrate data from IndexedDB to Supabase (one-time operation)
async function migrateToSupabase(): Promise<void> {
  if (migrationCompleted) return;

  try {
    // Check if data already exists in Supabase
    const { data: existingBlocks, error: fetchError } = await supabase
      .from('blocks')
      .select('id')
      .limit(1);

    if (fetchError) {
      console.error('Error checking Supabase data:', fetchError);
      return;
    }

    // If data already exists in Supabase, skip migration
    if (existingBlocks && existingBlocks.length > 0) {
      console.log('✅ Data already exists in Supabase, skipping migration');
      migrationCompleted = true;
      return;
    }

    // Try to load data from IndexedDB
    const db = await getDB();
    const localData = await db.get('appData', 'current');

    if (!localData || !localData.blocks || localData.blocks.length === 0) {
      console.log('No local data to migrate');
      migrationCompleted = true;
      return;
    }

    console.log(`🔄 Migrating ${localData.blocks.length} blocks to secure storage...`);

    // Insert all blocks into Supabase
    const { error: insertError } = await supabase
      .from('blocks')
      .insert(
        localData.blocks.map(block => ({
          id: block.id,
          type: block.type,
          title: block.title,
          content: block.content,
          icon: block.icon || null,
          color_preset: block.colorPreset,
          order: block.order,
          slug: block.slug,
          parent_id: block.parentId || null,
          attachments: JSON.parse(JSON.stringify(block.attachments || [])),
          hide_from_sidebar: block.hideFromSidebar || false,
        }))
      );

    if (insertError) {
      console.error('❌ Error migrating data:', insertError);
      throw insertError;
    }

    console.log('✅ Migration completed successfully!');
    migrationCompleted = true;
  } catch (error) {
    console.error('Migration error:', error);
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  try {
    // Delete all existing blocks
    await supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert all blocks
    if (data.blocks && data.blocks.length > 0) {
      const { error } = await supabase.from('blocks').insert(
        data.blocks.map(block => ({
          id: block.id,
          type: block.type,
          title: block.title,
          content: block.content,
          icon: block.icon || null,
          color_preset: block.colorPreset,
          order: block.order,
          slug: block.slug,
          parent_id: block.parentId || null,
          attachments: JSON.parse(JSON.stringify(block.attachments || [])),
          hide_from_sidebar: block.hideFromSidebar || false,
        }))
      );

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    throw error;
  }
}

export async function loadAppData(): Promise<AppData | null> {
  try {
    // First, try to migrate old data if needed
    await migrateToSupabase();

    // Load from Supabase
    const { data: blocks, error } = await supabase
      .from('blocks')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;

    if (!blocks || blocks.length === 0) {
      return null;
    }

    // Convert database format to AppData format
    const appData: AppData = {
      blocks: blocks.map(block => ({
        id: block.id,
        type: block.type as 'category' | 'section',
        title: block.title,
        content: block.content,
        icon: block.icon || undefined,
        colorPreset: block.color_preset as any,
        order: block.order,
        slug: block.slug,
        parentId: block.parent_id || undefined,
        attachments: (block.attachments as any) || [],
        hideFromSidebar: block.hide_from_sidebar || false,
      })),
      version: '1.0',
      lastModified: Date.now(),
    };

    return appData;
  } catch (error) {
    console.error('Error loading from Supabase:', error);
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
