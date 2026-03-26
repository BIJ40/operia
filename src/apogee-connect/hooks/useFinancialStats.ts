/**
 * useFinancialStats — Main hook for the Financier Tab
 * Loads Apogee data and computes full financial analysis
 */

import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { buildFinancialAnalysis } from '@/apogee-connect/utils/financialCalculations';
import type { FinancialAnalysis } from '@/apogee-connect/types/financial';
import { isWithinInterval, parseISO } from 'date-fns';

export function useFinancialStats() {
  const { filters } = useFilters();
  const { isAgencyReady, currentAgency } = useAgency();
  const agencySlug = currentAgency?.slug || '';

  return useQuery<FinancialAnalysis>({
    queryKey: ['financial-stats', agencySlug, filters.dateRange.start.toISOString(), filters.dateRange.end.toISOString()],
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const allData = await DataService.loadAllData(true, false, agencySlug);

      // Filter invoices by date range
      const facturesFiltered = (allData.factures || []).filter(f => {
        const dateRaw = (f as any).dateReelle || (f as any).dateEmission || (f as any).date || (f as any).created_at;
        if (!dateRaw) return false;
        try {
          const d = parseISO(dateRaw);
          return isWithinInterval(d, { start: filters.dateRange.start, end: filters.dateRange.end });
        } catch {
          return false;
        }
      });

      return buildFinancialAnalysis(
        facturesFiltered,
        allData.projects || [],
        allData.clients || [],
        new Date()
      );
    },
  });
}
