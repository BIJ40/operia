/**
 * useRdvMap - Hook pour charger les RDV de la carte
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useProfile } from '@/contexts/ProfileContext';
import { useApogeeUsers } from '@/shared/api/apogee/useApogeeUsers';
import { buildTechMap } from '@/apogee-connect/utils/techTools';

interface MapRdvUser {
  id: number;
  name: string;
  color: string;
}

export interface MapRdv {
  rdvId: number;
  projectId: number;
  projectRef: string;
  clientName: string;
  lat: number;
  lng: number;
  startAt: string;
  endAt?: string; // Fin du créneau (startAt + durationMin) - ajouté v2
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

  // Déterminer l'agence cible
  const targetAgency = agencySlug || agence;

  // Charger TOUS les techniciens de l'agence via useApogeeUsers (indépendant des RDV)
  const { users: apogeeUsers, loading: usersLoading } = useApogeeUsers({
    agencySlug: targetAgency,
  });

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
    staleTime: 10 * 60 * 1000, // 10 minutes - cache plus long
    gcTime: 30 * 60 * 1000, // Garder en cache 30 min
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Garder les données précédentes pendant le chargement
  });
  
  // Liste des techniciens ACTIFS (is_on=true) via buildTechMap (même logique que /stats-hub)
  const technicians = useMemo(() => {
    if (!apogeeUsers?.length) return [];
    
    // buildTechMap filtre is_on=true + isTechnicien/type approprié
    const techMap = buildTechMap(apogeeUsers);
    
    return Object.values(techMap)
      .map(t => ({
        id: t.id,
        name: `${t.prenom} ${t.nom}`.trim() || `Tech ${t.id}`,
        color: t.color,
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
