import { supabase } from '@/integrations/supabase/client';

export interface RoyaltyTier {
  tier_order: number;
  from_amount: number;
  to_amount: number | null;
  percentage: number;
}

export interface RoyaltyCalculationDetail {
  tier_order: number;
  from_amount: number;
  to_amount: number | null;
  percentage: number;
  amount_in_tier: number;
  royalty_for_tier: number;
}

export interface RoyaltyCalculationResult {
  ca_cumul_annuel: number;
  redevance_totale: number;
  detail_tranches: RoyaltyCalculationDetail[];
}

export class RoyaltyCalculationService {
  /**
   * Calculate royalties based on annual cumulative CA and tier configuration
   */
  static calculateRoyalty(caCumulAnnuel: number, tiers: RoyaltyTier[]): RoyaltyCalculationResult {
    const sortedTiers = [...tiers].sort((a, b) => a.tier_order - b.tier_order);
    const details: RoyaltyCalculationDetail[] = [];
    let redevanceTotale = 0;
    let remainingCA = caCumulAnnuel;

    for (const tier of sortedTiers) {
      if (remainingCA <= 0) break;

      const tierMin = tier.from_amount;
      const tierMax = tier.to_amount ?? Infinity;
      const tierRange = tierMax - tierMin;

      // Amount of CA that falls into this tier
      let amountInTier = 0;
      if (caCumulAnnuel <= tierMin) {
        // CA doesn't reach this tier
        continue;
      } else if (caCumulAnnuel <= tierMax) {
        // CA ends within this tier
        amountInTier = caCumulAnnuel - tierMin;
      } else {
        // CA goes beyond this tier
        amountInTier = tierRange;
      }

      const royaltyForTier = amountInTier * (tier.percentage / 100);
      redevanceTotale += royaltyForTier;

      details.push({
        tier_order: tier.tier_order,
        from_amount: tier.from_amount,
        to_amount: tier.to_amount,
        percentage: tier.percentage,
        amount_in_tier: amountInTier,
        royalty_for_tier: royaltyForTier,
      });

      remainingCA -= amountInTier;
    }

    return {
      ca_cumul_annuel: caCumulAnnuel,
      redevance_totale: redevanceTotale,
      detail_tranches: details,
    };
  }

  /**
   * Get active royalty configuration for an agency
   */
  static async getActiveConfig(agencyId: string) {
    const { data: config } = await supabase
      .from('agency_royalty_config')
      .select(`
        *,
        agency_royalty_tiers(*)
      `)
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('valid_from', { ascending: false })
      .limit(1)
      .single();

    return config;
  }

  /**
   * Save royalty calculation to database
   */
  static async saveCalculation(
    configId: string,
    agencyId: string,
    year: number,
    month: number,
    result: RoyaltyCalculationResult,
    userId: string
  ) {
    const { data, error } = await supabase
      .from('agency_royalty_calculations')
      .upsert({
        config_id: configId,
        agency_id: agencyId,
        year,
        month,
        ca_cumul_annuel: result.ca_cumul_annuel,
        redevance_calculee: result.redevance_totale,
        detail_tranches: result.detail_tranches as any,
        calculated_by: userId,
        calculated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get calculation history for an agency
   */
  static async getCalculationHistory(agencyId: string, year?: number) {
    let query = supabase
      .from('agency_royalty_calculations')
      .select('*')
      .eq('agency_id', agencyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
