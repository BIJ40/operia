import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const QUOTA_WARNING_THRESHOLD = 80; // Alerte à 80% d'utilisation
const CHECK_INTERVAL = 5 * 60 * 1000; // Vérifier toutes les 5 minutes

export const useStorageQuota = () => {
  const { user, agence } = useAuth();

  useEffect(() => {
    if (!user?.email) return;

    const checkStorageQuota = async () => {
      try {
        // Calculer la taille utilisée
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

        console.log(`📊 LocalStorage: ${(totalSize / 1024).toFixed(2)} KB utilisés (${percentageUsed.toFixed(1)}%)`);

        // Si on dépasse le seuil, créer une alerte
        if (percentageUsed >= QUOTA_WARNING_THRESHOLD) {
          console.warn(`⚠️ Quota localStorage élevé: ${percentageUsed.toFixed(1)}%`);
          
          await supabase.from('storage_quota_alerts').insert({
            user_id: user.id,
            user_email: user.email,
            user_agence: agence || null,
            quota_used_bytes: totalSize,
            quota_total_bytes: quotaLimit,
            percentage_used: parseFloat(percentageUsed.toFixed(2)),
            cache_keys: cacheKeys
          });
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du quota:', error);
      }
    };

    // Vérifier au montage
    checkStorageQuota();

    // Vérifier périodiquement
    const interval = setInterval(checkStorageQuota, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, agence]);
};
