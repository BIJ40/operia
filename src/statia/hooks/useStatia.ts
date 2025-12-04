/**
 * StatIA V1 - React Hook pour l'utilisation dans les composants
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { StatParams, StatResult, DateRange } from '../definitions/types';
import { getMetric, getMetrics, listAvailableMetrics } from '../api/getMetric';
import { getMetricForAgency, AgencyMetricParams } from '../api/getMetricForAgency';
import { getMetricForNetwork, NetworkMetricParams, NetworkStatResult } from '../api/getMetricForNetwork';
import { ApogeeDataServices } from '../engine/loaders';

/**
 * Hook pour récupérer une métrique StatIA
 */
export function useStatiaMetric(
  statId: string,
  params: StatParams,
  services: ApogeeDataServices | null,
  options?: { enabled?: boolean; staleTime?: number }
) {
  return useQuery({
    queryKey: ['statia', statId, params.agencySlug, params.dateRange],
    queryFn: async () => {
      if (!services) throw new Error('Services not available');
      return getMetric(statId, params, services);
    },
    enabled: !!services && options?.enabled !== false,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes par défaut
  });
}

/**
 * Hook pour récupérer plusieurs métriques StatIA
 */
export function useStatiaMetrics(
  statIds: string[],
  params: StatParams,
  services: ApogeeDataServices | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['statia-multi', statIds.join(','), params.agencySlug, params.dateRange],
    queryFn: async () => {
      if (!services) throw new Error('Services not available');
      return getMetrics(statIds, params, services);
    },
    enabled: !!services && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour récupérer une métrique pour une agence spécifique
 */
export function useStatiaForAgency(
  statId: string,
  agencySlug: string,
  params: AgencyMetricParams,
  services: ApogeeDataServices | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['statia-agency', statId, agencySlug, params.dateRange],
    queryFn: async () => {
      if (!services) throw new Error('Services not available');
      return getMetricForAgency(statId, agencySlug, params, services);
    },
    enabled: !!services && !!agencySlug && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour récupérer une métrique agrégée pour le réseau
 */
export function useStatiaForNetwork(
  statId: string,
  agencySlugs: string[],
  params: NetworkMetricParams,
  services: ApogeeDataServices | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['statia-network', statId, agencySlugs.join(','), params.dateRange],
    queryFn: async () => {
      if (!services) throw new Error('Services not available');
      return getMetricForNetwork(statId, agencySlugs, params, services);
    },
    enabled: !!services && agencySlugs.length > 0 && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour lister les métriques disponibles
 */
export function useAvailableMetrics() {
  return useMemo(() => listAvailableMetrics(), []);
}

/**
 * Hook utilitaire pour créer les paramètres de date
 */
export function useDateRangeParams(
  startDate: Date | string,
  endDate: Date | string
): DateRange {
  return useMemo(() => ({
    start: typeof startDate === 'string' ? new Date(startDate) : startDate,
    end: typeof endDate === 'string' ? new Date(endDate) : endDate,
  }), [startDate, endDate]);
}
