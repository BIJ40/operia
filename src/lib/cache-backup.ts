/**
 * Cache Backup System - Système de sauvegarde/restauration automatique du cache
 * Utilise IndexedDB pour un stockage fiable et une capacité plus grande que localStorage
 */

import { logCache } from '@/lib/logger';

interface BackupEntry {
  key: string;
  value: any;
  timestamp: number;
  version: number;
}

interface BackupMetadata {
  lastBackup: number;
  backupCount: number;
  totalSize: number;
}

export class CacheBackup {
  private static readonly DB_NAME = 'apogee_cache_backup';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'cache_backups';
  private static readonly METADATA_STORE = 'backup_metadata';
  private static readonly MAX_BACKUP_AGE = 24 * 60 * 60 * 1000; // 24 heures
  private static readonly MAX_BACKUPS_PER_KEY = 3; // Garder 3 versions par clé

  private static db: IDBDatabase | null = null;

  /**
   * Initialise la base de données IndexedDB
   */
  static async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        logCache.error('Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logCache.info('IndexedDB backup initialisé');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour les backups de cache
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: ['key', 'version'] });
          store.createIndex('key', 'key', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store pour les métadonnées
        if (!db.objectStoreNames.contains(this.METADATA_STORE)) {
          db.createObjectStore(this.METADATA_STORE, { keyPath: 'id' });
        }

        logCache.debug('IndexedDB stores créés');
      };
    });
  }

  /**
   * Sauvegarde une entrée de cache dans IndexedDB
   */
  static async backup(key: string, value: any): Promise<boolean> {
    try {
      await this.init();
      if (!this.db) return false;

      // Récupérer les versions existantes pour cette clé
      const existingVersions = await this.getVersions(key);
      
      // Déterminer le nouveau numéro de version
      const newVersion = existingVersions.length > 0 
        ? Math.max(...existingVersions.map(v => v.version)) + 1 
        : 1;

      // Créer l'entrée de backup
      const entry: BackupEntry = {
        key,
        value,
        timestamp: Date.now(),
        version: newVersion,
      };

      // Sauvegarder dans IndexedDB
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Nettoyer les anciennes versions si nécessaire
      if (existingVersions.length >= this.MAX_BACKUPS_PER_KEY) {
        await this.cleanOldVersions(key, this.MAX_BACKUPS_PER_KEY);
      }

      // Mettre à jour les métadonnées
      await this.updateMetadata();

      logCache.debug(`Backup sauvegardé: ${key} (version ${newVersion})`);
      return true;
    } catch (error) {
      logCache.error(`Erreur backup ${key}:`, error);
      return false;
    }
  }

  /**
   * Restaure une entrée depuis le backup
   */
  static async restore(key: string, specificVersion?: number): Promise<any | null> {
    try {
      await this.init();
      if (!this.db) return null;

      const versions = await this.getVersions(key);
      if (versions.length === 0) return null;

      // Si une version spécifique est demandée
      if (specificVersion !== undefined) {
        const entry = versions.find(v => v.version === specificVersion);
        if (entry) {
          logCache.debug(`Backup restauré: ${key} (version ${specificVersion})`);
          return entry.value;
        }
        return null;
      }

      // Sinon, prendre la version la plus récente
      const latest = versions.reduce((latest, current) => 
        current.version > latest.version ? current : latest
      );

      logCache.debug(`Backup restauré: ${key} (version ${latest.version})`);
      return latest.value;
    } catch (error) {
      logCache.error(`Erreur restauration ${key}:`, error);
      return null;
    }
  }

  /**
   * Récupère toutes les versions d'une clé
   */
  private static async getVersions(key: string): Promise<BackupEntry[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('key');
      const request = index.getAll(key);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Nettoie les anciennes versions pour une clé
   */
  private static async cleanOldVersions(key: string, keepCount: number): Promise<void> {
    const versions = await this.getVersions(key);
    
    // Trier par version décroissante
    versions.sort((a, b) => b.version - a.version);

    // Supprimer les versions les plus anciennes
    const toDelete = versions.slice(keepCount);
    
    if (toDelete.length === 0) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      let deletedCount = 0;
      for (const entry of toDelete) {
        const request = store.delete([entry.key, entry.version]);
        request.onsuccess = () => {
          deletedCount++;
          if (deletedCount === toDelete.length) {
            logCache.debug(`${deletedCount} anciennes versions supprimées pour ${key}`);
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  /**
   * Met à jour les métadonnées de backup
   */
  private static async updateMetadata(): Promise<void> {
    try {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const countRequest = store.count();

      return new Promise((resolve, reject) => {
        countRequest.onsuccess = async () => {
          const metadata: BackupMetadata = {
            lastBackup: Date.now(),
            backupCount: countRequest.result,
            totalSize: 0, // Calculé approximativement
          };

          const metaTransaction = this.db!.transaction([this.METADATA_STORE], 'readwrite');
          const metaStore = metaTransaction.objectStore(this.METADATA_STORE);
          const putRequest = metaStore.put({ ...metadata, id: 'main' });

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };
        countRequest.onerror = () => reject(countRequest.error);
      });
    } catch (error) {
      logCache.warn('Erreur mise à jour métadonnées:', error);
    }
  }

  /**
   * Nettoie les backups expirés
   */
  static async cleanExpiredBackups(): Promise<number> {
    try {
      await this.init();
      if (!this.db) return 0;

      const cutoffTime = Date.now() - this.MAX_BACKUP_AGE;
      let deletedCount = 0;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            if (deletedCount > 0) {
              logCache.info(`${deletedCount} backups expirés supprimés`);
            }
            resolve(deletedCount);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logCache.error('Erreur nettoyage backups expirés:', error);
      return 0;
    }
  }

  /**
   * Liste tous les backups disponibles
   */
  static async listBackups(): Promise<Array<{ key: string; versions: number; latest: number }>> {
    try {
      await this.init();
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries: BackupEntry[] = request.result || [];
          
          // Grouper par clé
          const grouped = entries.reduce((acc, entry) => {
            if (!acc[entry.key]) {
              acc[entry.key] = [];
            }
            acc[entry.key].push(entry);
            return acc;
          }, {} as Record<string, BackupEntry[]>);

          // Formatter le résultat
          const result = Object.entries(grouped).map(([key, versions]) => ({
            key,
            versions: versions.length,
            latest: Math.max(...versions.map(v => v.version)),
          }));

          resolve(result);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logCache.error('Erreur liste backups:', error);
      return [];
    }
  }

  /**
   * Efface tous les backups
   */
  static async clearAll(): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          logCache.info('Tous les backups ont été supprimés');
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logCache.error('Erreur suppression backups:', error);
    }
  }

  /**
   * Obtient les métadonnées de backup
   */
  static async getMetadata(): Promise<BackupMetadata | null> {
    try {
      await this.init();
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.METADATA_STORE], 'readonly');
        const store = transaction.objectStore(this.METADATA_STORE);
        const request = store.get('main');

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logCache.error('Erreur lecture métadonnées:', error);
      return null;
    }
  }

  /**
   * Affiche un rapport sur l'état des backups
   */
  static async printReport(): Promise<void> {
    const metadata = await this.getMetadata();
    const backups = await this.listBackups();

    logCache.info('Rapport Backups:');
    if (metadata) {
      const age = Date.now() - metadata.lastBackup;
      logCache.info(`   Dernier backup: il y a ${Math.round(age / 1000)}s`);
      logCache.info(`   Nombre de backups: ${metadata.backupCount}`);
    }
    logCache.info(`   Clés sauvegardées: ${backups.length}`);
    backups.forEach(backup => {
      logCache.debug(`     - ${backup.key}: ${backup.versions} version(s)`);
    });
  }
}

// Initialiser au chargement et nettoyer les backups expirés
CacheBackup.init().then(() => {
  CacheBackup.cleanExpiredBackups();
}).catch(err => {
  logCache.warn('Impossible d\'initialiser le système de backup:', err);
});
