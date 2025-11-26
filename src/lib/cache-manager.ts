/**
 * Cache Manager - Gestionnaire intelligent de cache localStorage
 * Évite les erreurs QuotaExceededError avec nettoyage automatique et backup automatique
 */

import { CacheBackup } from './cache-backup';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  size: number; // Taille en bytes
}

interface CacheMetrics {
  totalSize: number;
  entryCount: number;
  oldestEntry: number | null;
}

export class CacheManager {
  private static readonly MAX_CACHE_SIZE = 4 * 1024 * 1024; // 4MB max (sur ~5MB total)
  private static readonly MAX_ENTRY_SIZE = 1 * 1024 * 1024; // 1MB max par entrée
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes par défaut

  /**
   * Calcule la taille d'une entrée en bytes
   */
  private static calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Obtient les métriques du cache GÉRÉS PAR CACHEMANAGER UNIQUEMENT
   */
  static getCacheMetrics(): CacheMetrics {
    let totalSize = 0;
    let entryCount = 0;
    let oldestEntry: number | null = null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('_cache') || key.includes('Cache'))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            // Compter UNIQUEMENT les caches CacheManager (avec timestamp + ttl + size)
            if (parsed.timestamp && parsed.ttl && parsed.size !== undefined) {
              const size = new Blob([value]).size;
              totalSize += size;
              entryCount++;

              if (!oldestEntry || parsed.timestamp < oldestEntry) {
                oldestEntry = parsed.timestamp;
              }
            }
          }
        } catch {}
      }
    }

    return { totalSize, entryCount, oldestEntry };
  }

  /**
   * Nettoie les entrées les plus anciennes GÉRÉES PAR CACHEMANAGER jusqu'à libérer l'espace nécessaire
   */
  private static cleanOldestEntries(neededSpace: number): boolean {
    const cacheEntries: Array<{ key: string; timestamp: number; size: number }> = [];

    // Collecter UNIQUEMENT les entrées de cache CacheManager
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('_cache') || key.includes('Cache'))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            // Ne nettoyer QUE les caches CacheManager (avec timestamp + ttl + size)
            if (parsed.timestamp && parsed.ttl && parsed.size !== undefined) {
              const size = new Blob([value]).size;
              cacheEntries.push({ key, timestamp: parsed.timestamp, size });
            }
          }
        } catch {}
      }
    }

    // Trier par timestamp (les plus anciens en premier)
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);

    let freedSpace = 0;
    let removedCount = 0;

    // Supprimer les plus anciens jusqu'à avoir assez d'espace
    for (const entry of cacheEntries) {
      if (freedSpace >= neededSpace) break;

      try {
        localStorage.removeItem(entry.key);
        freedSpace += entry.size;
        removedCount++;
        console.log(`🗑️ Cache supprimé: ${entry.key} (${(entry.size / 1024).toFixed(2)} KB)`);
      } catch (e) {
        console.error(`Erreur suppression ${entry.key}:`, e);
      }
    }

    console.log(`✅ Nettoyage: ${removedCount} entrées supprimées, ${(freedSpace / 1024).toFixed(2)} KB libérés`);
    return freedSpace >= neededSpace;
  }

  /**
   * Nettoie les entrées expirées
   * IMPORTANT: Ne nettoie QUE les entrées gérées par CacheManager (avec timestamp + ttl + size)
   */
  static cleanExpiredEntries(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      // Ne nettoyer QUE les caches gérés par CacheManager
      if (key && (key.includes('_cache') || key.includes('Cache'))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            // IMPORTANT: Vérifier que c'est bien un cache CacheManager (a les 3 champs)
            if (parsed.timestamp && parsed.ttl && parsed.size !== undefined) {
              const age = now - parsed.timestamp;
              if (age > parsed.ttl) {
                localStorage.removeItem(key);
                cleanedCount++;
                console.log(`🗑️ Cache expiré supprimé: ${key}`);
              }
            }
          }
        } catch (e) {
          // Ignorer les erreurs de parsing sans supprimer
          console.warn(`⚠️ Erreur parsing cache ${key}:`, e);
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} entrées expirées nettoyées`);
    }
    return cleanedCount;
  }

  /**
   * Sauvegarde une entrée dans le cache avec gestion intelligente de l'espace
   */
  static setItem<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): boolean {
    try {
      // Nettoyer les entrées expirées d'abord
      this.cleanExpiredEntries();

      const size = this.calculateSize(data);

      // Vérifier si l'entrée est trop volumineuse
      if (size > this.MAX_ENTRY_SIZE) {
        console.warn(`⚠️ Entrée trop volumineuse pour le cache: ${key} (${(size / 1024).toFixed(2)} KB)`);
        return false;
      }

      const entry: CacheEntry<T> & { ttl: number } = {
        data,
        timestamp: Date.now(),
        size,
        ttl,
      };

      const entryString = JSON.stringify(entry);
      const entrySize = new Blob([entryString]).size;

      // Obtenir les métriques actuelles
      const metrics = this.getCacheMetrics();
      const projectedSize = metrics.totalSize + entrySize;

      // Si on dépasse la limite, nettoyer les anciennes entrées
      if (projectedSize > this.MAX_CACHE_SIZE) {
        const neededSpace = projectedSize - this.MAX_CACHE_SIZE + (this.MAX_CACHE_SIZE * 0.2); // Libérer 20% supplémentaire
        console.log(`⚠️ Cache plein (${(metrics.totalSize / 1024).toFixed(2)} KB), nettoyage de ${(neededSpace / 1024).toFixed(2)} KB...`);
        
        const cleaned = this.cleanOldestEntries(neededSpace);
        if (!cleaned) {
          console.warn('❌ Impossible de libérer assez d\'espace dans le cache');
          return false;
        }
      }

      // Tenter de sauvegarder
      localStorage.setItem(key, entryString);
      
      // Sauvegarder automatiquement dans IndexedDB pour backup
      CacheBackup.backup(key, data).catch(err => {
        console.warn(`⚠️ Backup automatique échoué pour ${key}:`, err);
      });
      
      console.log(`💾 Cache sauvegardé: ${key} (${(entrySize / 1024).toFixed(2)} KB, TTL: ${ttl / 1000}s)`);
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error('❌ QuotaExceededError malgré le nettoyage:', e);
        
        // Dernier recours: nettoyer TOUS les caches
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.includes('_cache') || key.includes('Cache'))) {
              localStorage.removeItem(key);
            }
          }
          console.log('🧹 Tous les caches ont été nettoyés');
        } catch {}
      } else {
        console.error('Erreur sauvegarde cache:', e);
      }
      return false;
    }
  }

  /**
   * Récupère une entrée du cache avec restauration automatique depuis backup en cas d'erreur
   */
  static getItem<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      if (!value) {
        // Tenter de restaurer depuis le backup
        console.log(`⚠️ Cache absent: ${key}, tentative de restauration depuis backup...`);
        return this.restoreFromBackup<T>(key);
      }

      const entry: CacheEntry<T> & { ttl: number } = JSON.parse(value);
      const age = Date.now() - entry.timestamp;

      // Vérifier si l'entrée est expirée
      if (entry.ttl && age > entry.ttl) {
        localStorage.removeItem(key);
        console.log(`⏰ Cache expiré: ${key} (${Math.round(age / 1000)}s)`);
        
        // Tenter de restaurer depuis le backup si disponible
        return this.restoreFromBackup<T>(key);
      }

      console.log(`⚡ Cache hit: ${key} (${Math.round(age / 1000)}s)`);
      return entry.data;
    } catch (e) {
      console.warn(`❌ Erreur lecture cache ${key}:`, e);
      
      // Tenter de restaurer depuis le backup
      console.log(`♻️ Tentative de restauration depuis backup pour ${key}...`);
      const restored = this.restoreFromBackup<T>(key);
      
      if (restored) {
        // Sauvegarder à nouveau dans localStorage
        this.setItem(key, restored);
        console.log(`✅ Cache restauré et resauvegardé: ${key}`);
      }
      
      // Supprimer l'entrée corrompue de localStorage
      try {
        localStorage.removeItem(key);
      } catch {}
      
      return restored;
    }
  }

  /**
   * Restaure une entrée depuis le système de backup IndexedDB (synchrone via cache local)
   */
  private static restoreFromBackup<T>(key: string): T | null {
    // Tentative de restauration asynchrone, mais retourne null immédiatement
    // pour ne pas bloquer l'exécution
    CacheBackup.restore(key).then(value => {
      if (value) {
        console.log(`✅ Backup trouvé pour ${key}, resauvegarde dans localStorage...`);
        this.setItem(key, value);
      } else {
        console.log(`⚠️ Aucun backup trouvé pour ${key}`);
      }
    }).catch(err => {
      console.warn(`❌ Erreur restauration backup ${key}:`, err);
    });
    
    return null;
  }

  /**
   * Supprime une entrée du cache
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Cache supprimé: ${key}`);
    } catch (e) {
      console.warn(`Erreur suppression cache ${key}:`, e);
    }
  }

  /**
   * Nettoie tous les caches GÉRÉS PAR CACHEMANAGER UNIQUEMENT
   * IMPORTANT: Ne touche pas aux caches d'autres systèmes
   */
  static clearAll(): void {
    let count = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('_cache') || key.includes('Cache'))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            // Ne supprimer QUE les caches CacheManager (avec timestamp + ttl + size)
            if (parsed.timestamp && parsed.ttl && parsed.size !== undefined) {
              localStorage.removeItem(key);
              count++;
            }
          }
        } catch {}
      }
    }
    console.log(`🧹 ${count} entrées de cache CacheManager supprimées`);
  }

  /**
   * Affiche un rapport sur l'état du cache et des backups
   */
  static async printReport(): Promise<void> {
    const metrics = this.getCacheMetrics();
    const usagePercent = (metrics.totalSize / this.MAX_CACHE_SIZE) * 100;
    
    console.log('📊 Rapport Cache localStorage:');
    console.log(`   Taille totale: ${(metrics.totalSize / 1024).toFixed(2)} KB / ${(this.MAX_CACHE_SIZE / 1024).toFixed(2)} KB (${usagePercent.toFixed(1)}%)`);
    console.log(`   Nombre d'entrées: ${metrics.entryCount}`);
    if (metrics.oldestEntry) {
      const age = Date.now() - metrics.oldestEntry;
      console.log(`   Entrée la plus ancienne: ${Math.round(age / 1000)}s`);
    }
    
    console.log('');
    await CacheBackup.printReport();
  }
}

// Ne PAS nettoyer automatiquement au chargement pour éviter de supprimer des caches non-CacheManager
// Le nettoyage se fera lors du premier appel à setItem() ou via cleanExpiredEntries() explicite
