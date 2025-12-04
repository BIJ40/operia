/**
 * Hook React Query pour le Comparatif Agences StatIA
 */

import { useQuery } from '@tanstack/react-query';
import { computeComparatifAgences, ComparatifAgencesParams, ComparatifAgencesResult } from '../engines/comparatifAgencesEngine';

export function useStatiaComparatifAgences(params: ComparatifAgencesParams) {
  return useQuery<ComparatifAgencesResult>({
    queryKey: ['statia-comparatif-agences', params.dateStart.toISOString(), params.dateEnd.toISOString(), params.scopeAgencies],
    queryFn: () => computeComparatifAgences(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
