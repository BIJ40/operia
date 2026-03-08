import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useProfile } from '@/contexts/ProfileContext';
import { CacheManager } from '@/lib/cache-manager';
import { logCache, logError } from '@/lib/logger';
import { safeMutation } from '@/lib/safeQuery';

const QUOTA_WARNING_THRESHOLD = 80; // Alerte à 80% d'utilisation
const CHECK_INTERVAL = 5 * 60 * 1000; // Vérifier toutes les 5 minutes

export const useStorageQuota = () => {
  const { user, agence } = useAuth();

  useEffect(() => {
    if (!user?.email) return;

    const checkStorageQuota = async () => {
      try {
        // Nettoyer les caches expirés d'abord
        CacheManager.cleanExpiredEntries();
        
        // Obtenir les métriques avec CacheManager
        const metrics = CacheManager.getCacheMetrics();
        
        // Calculer également la taille totale de localStorage pour surveillance
        let totalSize = 0;
        const cacheKeys: Record<string, number> = {};

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            if (value) {
              const size = new Blob([value]).size;
              totalSize += size;
              cacheKeys[key] = size;
            }
          }
        }

        // Estimer la limite du quota (5MB pour la plupart des navigateurs)
        const quotaLimit = 5 * 1024 * 1024; // 5 MB
        const percentageUsed = (totalSize / quotaLimit) * 100;

        logCache.debug(`LocalStorage: ${(totalSize / 1024).toFixed(2)} KB utilisés (${percentageUsed.toFixed(1)}%)`);
        logCache.debug(`Cache géré: ${(metrics.totalSize / 1024).toFixed(2)} KB dans ${metrics.entryCount} entrées`);

        // Si on dépasse le seuil, créer une alerte
        if (percentageUsed >= QUOTA_WARNING_THRESHOLD) {
          logCache.warn(`Quota localStorage élevé: ${percentageUsed.toFixed(1)}%`);
          
          const alertResult = await safeMutation(
            supabase.from('storage_quota_alerts').insert({
              user_id: user.id,
              user_email: user.email,
              user_agence: agence || null,
              quota_used_bytes: totalSize,
              quota_total_bytes: quotaLimit,
              percentage_used: parseFloat(percentageUsed.toFixed(2)),
              cache_keys: cacheKeys
            }),
            'STORAGE_QUOTA_ALERT_CREATE'
          );

          if (!alertResult.success) {
            logError('use-storage-quota', 'Failed to create quota alert', alertResult.error);
          }

          // Si on dépasse 90%, utiliser CacheManager pour nettoyer intelligemment
          if (percentageUsed >= 90) {
            logCache.warn('Nettoyage automatique du localStorage (quota > 90%)');
            await CacheManager.printReport();
            
            // CacheManager gère automatiquement le nettoyage intelligent
            // Forcer un nettoyage supplémentaire si nécessaire
            const neededSpace = totalSize - (quotaLimit * 0.7); // Descendre sous 70%
            if (neededSpace > 0) {
              // Nettoyer les plus anciennes entrées
              const oldMetrics = CacheManager.getCacheMetrics();
              CacheManager.clearAll();
              const newMetrics = CacheManager.getCacheMetrics();
              logCache.info(`Nettoyage: ${oldMetrics.entryCount - newMetrics.entryCount} entrées supprimées`);
            }
          }
        }
      } catch (error) {
        logCache.error('Erreur lors de la vérification du quota:', error);
      }
    };

    // Vérifier au montage
    checkStorageQuota();

    // Vérifier périodiquement
    const interval = setInterval(checkStorageQuota, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, agence]);
};
