import { useQuery } from "@tanstack/react-query";
import { api, setApiBaseUrl } from "@/apogee-connect/services/api";
import { parseISO, getMonth, getYear } from "date-fns";
import { logApogee } from "@/lib/logger";

interface Facture {
  id: string;
  dateReelle?: string;
  date?: string;
  totalHT?: number;
  data?: {
    totalHT?: number;
    totalBrutHT?: number;
  };
  typeFacture?: string;
  type?: string;
}

function getFactureTotalHT(facture: Facture): number {
  if (typeof facture.totalHT === 'number') return facture.totalHT;
  if (typeof facture.totalHT === 'string') return parseFloat(facture.totalHT) || 0;
  if (facture.data?.totalHT) return parseFloat(String(facture.data.totalHT)) || 0;
  if (facture.data?.totalBrutHT) return parseFloat(String(facture.data.totalBrutHT)) || 0;
  return 0;
}

export function useAgencyMonthlyCA(agencySlug: string | undefined, year: number) {
  return useQuery({
    queryKey: ['agency-monthly-ca', agencySlug, year],
    queryFn: async (): Promise<number[]> => {
      if (!agencySlug) {
        throw new Error('Agency slug is required');
      }

      // Set API base URL for this agency
      const baseUrl = `https://${agencySlug}.hc-apogee.fr/api/`;
      setApiBaseUrl(baseUrl);
      
      logApogee.info(`Fetching monthly CA for agency ${agencySlug}, year ${year}`);

      // Fetch invoices
      const facturesResponse = await api.getFactures();
      const factures: Facture[] = Array.isArray(facturesResponse) 
        ? facturesResponse 
        : (facturesResponse as { data?: Facture[] })?.data || [];

      logApogee.debug(`Received ${factures.length} invoices`);

      // Initialize monthly CA array (12 months)
      const monthlyCA: number[] = Array(12).fill(0);

      // Process each invoice
      for (const facture of factures) {
        const dateStr = facture.dateReelle || facture.date;
        if (!dateStr) continue;

        try {
          const date = parseISO(dateStr);
          const invoiceYear = getYear(date);
          
          if (invoiceYear !== year) continue;

          const month = getMonth(date); // 0-11
          const typeFacture = (facture.typeFacture || facture.type || 'facture').toLowerCase();
          let totalHT = getFactureTotalHT(facture);

          // Avoirs (credit notes) as negative
          if (typeFacture === 'avoir') {
            totalHT = -Math.abs(totalHT);
          }

          monthlyCA[month] += totalHT;
        } catch (e) {
          logApogee.warn(`Invalid date for invoice:`, dateStr);
        }
      }

      logApogee.info(`Monthly CA calculated for ${year}:`, monthlyCA);
      return monthlyCA;
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
