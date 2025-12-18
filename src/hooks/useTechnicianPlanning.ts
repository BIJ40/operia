/**
 * Hook for fetching technician's today planning with offline support
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  getTodayKey,
  getCachedPlanning,
  cachePlanningData,
  type TechnicianAppointment,
} from '@/lib/offline/db';

interface UseTechnicianPlanningResult {
  appointments: TechnicianAppointment[];
  isLoading: boolean;
  isFromCache: boolean;
  lastFetchedAt: number | null;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTechnicianTodayPlanning(): UseTechnicianPlanningResult {
  const { user } = useAuth();
  const isOnline = useNetworkStatus();

  const [appointments, setAppointments] = useState<TechnicianAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateKey = getTodayKey();

  // Fetch from server
  const fetchFromServer = useCallback(async (): Promise<TechnicianAppointment[] | null> => {
    if (!user) {
      console.log('[Planning] No user, cannot fetch');
      return null;
    }

    try {
      // For now, we'll create mock data since we don't have the actual interventions table
      // In production, this would call an edge function or query interventions
      console.log('[Planning] Fetching planning for user:', user.id);

      // TODO: Replace with actual API call when interventions table is ready
      // const { data, error } = await supabase.functions.invoke('get-technician-planning', {
      //   body: { date: new Date().toISOString().split('T')[0] }
      // });

      // Mock data for development
      const mockAppointments: TechnicianAppointment[] = [
        {
          id: 'mock-1',
          project_id: 12345,
          date: new Date().toISOString().split('T')[0],
          time_start: '09:00',
          time_end: '10:30',
          type: 'rt',
          status: 'planned',
          client_name: 'M. Dupont',
          address: '123 rue de la Paix',
          city: 'Paris',
          postal_code: '75001',
          description: 'Relevé technique plomberie - Recherche de fuite',
          univers: ['plomberie'],
        },
        {
          id: 'mock-2',
          project_id: 12346,
          date: new Date().toISOString().split('T')[0],
          time_start: '11:00',
          time_end: '12:00',
          type: 'depannage',
          status: 'planned',
          client_name: 'Mme Martin',
          address: '45 avenue des Champs',
          city: 'Lyon',
          postal_code: '69001',
          description: 'Dépannage urgent - Fuite sous évier',
          univers: ['plomberie'],
        },
        {
          id: 'mock-3',
          project_id: 12347,
          date: new Date().toISOString().split('T')[0],
          time_start: '14:00',
          time_end: '17:00',
          type: 'travaux',
          status: 'planned',
          client_name: 'SCI Les Lilas',
          address: '78 boulevard Victor Hugo',
          city: 'Marseille',
          postal_code: '13001',
          description: 'Travaux de rénovation salle de bain',
          univers: ['plomberie', 'carrelage'],
        },
      ];

      return mockAppointments;
    } catch (err) {
      console.error('[Planning] Fetch error:', err);
      throw err;
    }
  }, [user]);

  // Load from cache
  const loadFromCache = useCallback(async (): Promise<boolean> => {
    try {
      const cached = await getCachedPlanning(dateKey);
      if (cached && cached.data.length > 0) {
        console.log('[Planning] Loaded from cache:', cached.data.length, 'appointments');
        setAppointments(cached.data);
        setLastFetchedAt(cached.fetched_at);
        setIsFromCache(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Planning] Cache load error:', err);
      return false;
    }
  }, [dateKey]);

  // Main fetch function
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Try to fetch from server
        const data = await fetchFromServer();
        if (data) {
          setAppointments(data);
          setIsFromCache(false);
          setLastFetchedAt(Date.now());

          // Cache the data
          await cachePlanningData(dateKey, data);
          console.log('[Planning] Cached', data.length, 'appointments');
        }
      } else {
        // Offline - load from cache
        const hasCache = await loadFromCache();
        if (!hasCache) {
          setError('Aucune donnée en cache disponible');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);

      // Try to load from cache as fallback
      const hasCache = await loadFromCache();
      if (!hasCache) {
        setAppointments([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, fetchFromServer, loadFromCache, dateKey]);

  // Initial load
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && isFromCache) {
      console.log('[Planning] Online again, refreshing...');
      refetch();
    }
  }, [isOnline]);

  return {
    appointments,
    isLoading,
    isFromCache,
    lastFetchedAt,
    error,
    refetch,
  };
}
