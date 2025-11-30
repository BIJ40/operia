import { useState, useEffect, useCallback } from 'react';
import { CacheBackup } from '@/lib/cache-backup';
import { CacheManager } from '@/lib/cache-manager';
import { logError } from '@/lib/logger';

interface BackupInfo {
  key: string;
  versions: number;
  latest: number;
}

interface BackupMetadata {
  lastBackup: number;
  backupCount: number;
  totalSize: number;
}

export function useCacheBackup() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [metadata, setMetadata] = useState<BackupMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const [backupList, meta] = await Promise.all([
        CacheBackup.listBackups(),
        CacheBackup.getMetadata(),
      ]);
      setBackups(backupList);
      setMetadata(meta);
    } catch (error) {
      logError('Erreur chargement backups:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const restoreBackup = useCallback(async (key: string, version?: number) => {
    try {
      const value = await CacheBackup.restore(key, version);
      if (value) {
        // Resauvegarder dans localStorage
        CacheManager.setItem(key, value);
        return true;
      }
      return false;
    } catch (error) {
      logError(`Erreur restauration backup ${key}:`, error);
      return false;
    }
  }, []);

  const cleanExpiredBackups = useCallback(async () => {
    try {
      const count = await CacheBackup.cleanExpiredBackups();
      await loadBackups();
      return count;
    } catch (error) {
      logError('Erreur nettoyage backups expirés:', error);
      return 0;
    }
  }, [loadBackups]);

  const clearAllBackups = useCallback(async () => {
    try {
      await CacheBackup.clearAll();
      await loadBackups();
      return true;
    } catch (error) {
      logError('Erreur suppression backups:', error);
      return false;
    }
  }, [loadBackups]);

  const printReport = useCallback(async () => {
    await CacheManager.printReport();
  }, []);

  return {
    backups,
    metadata,
    loading,
    loadBackups,
    restoreBackup,
    cleanExpiredBackups,
    clearAllBackups,
    printReport,
  };
}
