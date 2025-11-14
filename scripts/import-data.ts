// Script temporaire pour importer les données
import { createClient } from '@supabase/supabase-js';
import backupData from '../src/data/apogee-data.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  console.log(`Importing ${backupData.blocks.length} blocks...`);
  
  // Importer par lots de 50
  const batchSize = 50;
  
  for (let i = 0; i < backupData.blocks.length; i += batchSize) {
    const batch = backupData.blocks.slice(i, i + batchSize);
    
    const { error } = await supabase
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

    if (error) {
      console.error('Error:', error);
      throw error;
    }
    
    console.log(`Imported ${Math.min(i + batchSize, backupData.blocks.length)}/${backupData.blocks.length}`);
  }
  
  console.log('✅ Import complete!');
}

importData();
