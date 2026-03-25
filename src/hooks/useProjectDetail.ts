/**
 * useProjectDetail — Hook React Query pour enrichissement à la demande
 * 
 * RÈGLES STRICTES:
 * - Ne s'active QUE quand ref est fourni (action explicite utilisateur)
 * - Ne JAMAIS utiliser dans une boucle ou un map sur une liste
 * - Ne JAMAIS activer au hover, scroll, ou mount d'une card
 * - staleTime 10min pour éviter les appels doublons
 */

import { useQuery } from '@tanstack/react-query';
import { getProjectDetail, type ProjectDetailResult } from '@/services/projectDetailLoader';

interface UseProjectDetailOptions {
  /** Ref du dossier — le hook ne s'active que si fourni */
  ref: string | null | undefined;
  /** Slug de l'agence */
  agencySlug: string | null | undefined;
  /** Désactiver manuellement (défaut: false) */
  disabled?: boolean;
}

export function useProjectDetail({ ref, agencySlug, disabled = false }: UseProjectDetailOptions) {
  return useQuery<ProjectDetailResult>({
    queryKey: ['project-detail', agencySlug, ref],
    queryFn: () => getProjectDetail(ref!, agencySlug!),
    enabled: !!ref && !!agencySlug && !disabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Un seul retry — ne jamais boucler
    refetchOnWindowFocus: false,
  });
}
