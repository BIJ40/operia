/**
 * useRoyaltyAutoValues — Auto-calculates royalty charges for the P&L
 * 
 * - HC Redevance (externe_redevances_hc_assistance): progressive/degressive royalty
 *   based on cumulative annual CA and the agency's configured tiers
 * - HC FCN (externe_redevances_hc_fcn): 1% of monthly CA, capped at 400€
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateRoyalties, DEFAULT_TIERS, RoyaltyTier } from '@/franchiseur/utils/royaltyCalculator';

const HC_FCN_RATE = 0.01;
const HC_FCN_CAP = 400;

export interface RoyaltyAutoValues {
  externe_redevances_hc_assistance: number;
  externe_redevances_hc_fcn: number;
}

export function useRoyaltyAutoValues(year: number, month: number, currentMonthCA?: number) {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['royalty-auto-values', agencyId, year, month, currentMonthCA],
    enabled: !!agencyId && year > 0 && month >= 1 && month <= 12,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RoyaltyAutoValues> => {
      // 1. Get the agency's royalty config (tiers)
      const { data: config } = await supabase
        .from('agency_royalty_config')
        .select('id')
        .eq('agency_id', agencyId!)
        .eq('is_active', true)
        .maybeSingle();

      let tiers: RoyaltyTier[] = DEFAULT_TIERS;
      if (config) {
        const { data: dbTiers } = await supabase
          .from('agency_royalty_tiers')
          .select('from_amount, to_amount, percentage')
          .eq('config_id', config.id)
          .order('tier_order');
        if (dbTiers && dbTiers.length > 0) {
          tiers = dbTiers.map(t => ({
            from_amount: t.from_amount,
            to_amount: t.to_amount,
            percentage: t.percentage,
          }));
        }
      }

      // 2. Get cumulative CA for the year up to this month
      //    (from agency_financial_months for previous months)
      const { data: previousMonths } = await (supabase as any)
        .from('agency_financial_months')
        .select('month, ca_total')
        .eq('agency_id', agencyId)
        .eq('year', year)
        .lt('month', month)
        .order('month');

      const previousCA = (previousMonths ?? []).reduce(
        (sum: number, m: any) => sum + (m.ca_total ?? 0),
        0
      );
      const monthCA = currentMonthCA ?? 0;
      const cumulCA = previousCA + monthCA;

      // 3. Calculate HC Redevance for this month
      //    = royalty(cumul_CA) - royalty(previous_cumul_CA)
      const royaltyCumul = calculateRoyalties(cumulCA, tiers);
      const royaltyPrevious = calculateRoyalties(previousCA, tiers);
      const hcRedevance = Math.round((royaltyCumul.totalRoyalty - royaltyPrevious.totalRoyalty) * 100) / 100;

      // 4. Calculate HC FCN = min(CA_month × 1%, 400€)
      const hcFcn = Math.round(Math.min(monthCA * HC_FCN_RATE, HC_FCN_CAP) * 100) / 100;

      return {
        externe_redevances_hc_assistance: hcRedevance,
        externe_redevances_hc_fcn: hcFcn,
      };
    },
  });
}
