import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AppData, Block } from '@/types/block';

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
  const db = await getDB();
  await db.put('appData', data, 'current');
}

export async function loadAppData(): Promise<AppData | null> {
  const db = await getDB();
  const data = await db.get('appData', 'current');
  return data || null;
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
