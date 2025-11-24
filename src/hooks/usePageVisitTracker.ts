import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PageVisitData {
  blockId: string;
  blockTitle: string;
  blockSlug: string;
  categorySlug: string;
  scope: 'apogee' | 'apporteur' | 'helpconfort';
}

const VISIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function usePageVisitTracker(visitData: PageVisitData | null) {
  const { user } = useAuth();
  const lastVisitRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    if (!user || !visitData) return;

    const trackVisit = async () => {
      try {
        const visitKey = `${visitData.scope}-${visitData.blockId}`;
        const now = Date.now();
        const lastVisit = lastVisitRef.current[visitKey];

        // Ne pas enregistrer si déjà visité récemment (moins de 5 min)
        if (lastVisit && (now - lastVisit) < VISIT_COOLDOWN_MS) {
          return;
        }

        // Enregistrer la visite
        const { error } = await supabase
          .from('user_history')
          .insert({
            user_id: user.id,
            block_id: visitData.blockId,
            block_title: visitData.blockTitle,
            block_slug: visitData.blockSlug,
            category_slug: visitData.categorySlug,
            scope: visitData.scope
          });

        if (!error) {
          lastVisitRef.current[visitKey] = now;
        }
      } catch (error) {
        console.error('Error tracking page visit:', error);
      }
    };

    trackVisit();
  }, [user, visitData]);
}
