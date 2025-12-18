/**
 * useRdvMap - Hook pour charger les RDV de la carte
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useApogeeUsers } from '@/shared/api/apogee/useApogeeUsers';

interface MapRdvUser {
  id: number;
  name: string;
  color: string;
}

export interface MapRdv {
  rdvId: number;
  projectId: number;
  lat: number;
  lng: number;
  startAt: string;
  durationMin: number;
  univers: string;
  address: string;
  users: MapRdvUser[];
}

interface UseRdvMapOptions {
  date: Date;
  techIds?: number[];
  agencySlug?: string;
}

interface UseRdvMapResult {
  rdvs: MapRdv[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  technicians: { id: number; name: string; color: string }[];
}

export function useRdvMap({ date, techIds, agencySlug }: UseRdvMapOptions): UseRdvMapResult {
  const { agence } = useAuth();
  
  // Charger TOUS les techniciens de l'agence via useApogeeUsers (indépendant des RDV)
  const { users: apogeeUsers, loading: usersLoading } = useApogeeUsers();
  
  // Déterminer l'agence cible
  const targetAgency = agencySlug || agence;
  
  // Query key basée sur date + techIds + agency
  const queryKey = [
    'rdv-map',
    format(date, 'yyyy-MM-dd'),
    techIds?.join(',') || 'all',
    targetAgency,
  ];
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: {
          date: format(date, 'yyyy-MM-dd'),
          techIds: techIds?.length ? techIds : undefined,
          agencySlug: targetAgency,
        },
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du chargement');
      }
      
      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }
      
      return result.data as MapRdv[];
    },
    enabled: !!targetAgency,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
  
  // Liste complète des techniciens (type "technicien" uniquement) depuis apiGetUsers
  const technicians = useMemo(() => {
    if (!apogeeUsers?.length) return [];
    
    return apogeeUsers
      .filter(u => u.type === 'technicien' || u.type === 'tech' || u.type === 'Technicien')
      .map(u => ({
        id: u.id,
        name: u.firstname || u.name || `User ${u.id}`,
        // Couleur depuis data.bgcolor.hex ou fallback
        color: u.data?.bgcolor?.hex || u.data?.bgcolor?.hex8 || '#6366f1',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [apogeeUsers]);
  
  return {
    rdvs: data || [],
    isLoading: isLoading || usersLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    technicians,
  };
}

/**
 * Calcule les bounds pour centrer la carte sur les RDV
 */
export function calculateBounds(rdvs: MapRdv[]): [[number, number], [number, number]] | null {
  if (rdvs.length === 0) return null;
  
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  
  rdvs.forEach(rdv => {
    minLng = Math.min(minLng, rdv.lng);
    maxLng = Math.max(maxLng, rdv.lng);
    minLat = Math.min(minLat, rdv.lat);
    maxLat = Math.max(maxLat, rdv.lat);
  });
  
  // Ajouter un padding de 10%
  const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  
  return [
    [minLng - lngPadding, minLat - latPadding],
    [maxLng + lngPadding, maxLat + latPadding],
  ];
}

export default useRdvMap;
