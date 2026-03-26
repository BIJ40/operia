/**
 * useFinancialStats — Main hook for the Financier Tab
 * V2: Snapshot mode — loads ALL invoices up to end date (stock à date)
 */

import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { buildFinancialAnalysis } from '@/apogee-connect/utils/financialCalculations';
import type { FinancialAnalysis } from '@/apogee-connect/types/financial';
import { parseISO, isBefore, isEqual } from 'date-fns';

export function useFinancialStats() {
  const { filters } = useFilters();
  const { isAgencyReady, currentAgency } = useAgency();
  const agencySlug = currentAgency?.slug || '';

  return useQuery<FinancialAnalysis>({
    queryKey: ['financial-stats', agencySlug, filters.dateRange.end.toISOString()],
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const allData = await DataService.loadAllData(true, false, agencySlug);

      // SNAPSHOT MODE: include all invoices emitted UP TO the end date
      // This gives a true "stock à date" view of outstanding debt
      const endDate = filters.dateRange.end;
      const facturesFiltered = (allData.factures || []).filter(f => {
        const dateRaw = (f as any).dateReelle || (f as any).dateEmission || (f as any).date || (f as any).created_at;
        if (!dateRaw) return false;
        try {
          const d = parseISO(dateRaw);
          return isBefore(d, endDate) || isEqual(d, endDate);
        } catch {
          return false;
        }
      });

      return buildFinancialAnalysis(
        facturesFiltered,
        allData.projects || [],
        allData.clients || [],
        endDate // Use end date as reference for aging calculations
      );
    },
  });
}
