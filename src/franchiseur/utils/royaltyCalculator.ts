/**
 * Utilitaire de calcul des redevances par tranches progressives
 * 
 * Exemple avec CA = 600 000€ et tranches standard:
 * - 0 à 500 000€ : 4% → 20 000€
 * - 500 001 à 600 000€ : 3% → 3 000€
 * - Total redevance = 23 000€
 */

export interface RoyaltyTier {
  from_amount: number;
  to_amount: number | null;
  percentage: number;
}

export interface RoyaltyCalculationDetail {
  tier: RoyaltyTier;
  baseAmount: number; // Montant de CA dans cette tranche
  royaltyAmount: number; // Redevance pour cette tranche
}

export interface RoyaltyCalculationResult {
  totalCA: number;
  totalRoyalty: number;
  effectiveRate: number; // Taux effectif global (%)
  details: RoyaltyCalculationDetail[];
}

/**
 * Tranches par défaut (quasi-totalité des agences)
 */
export const DEFAULT_TIERS: RoyaltyTier[] = [
  { from_amount: 0, to_amount: 500000, percentage: 4 },
  { from_amount: 500000, to_amount: 650000, percentage: 3 },
  { from_amount: 650000, to_amount: 800000, percentage: 2.5 },
  { from_amount: 800000, to_amount: 1000000, percentage: 1.5 },
  { from_amount: 1000000, to_amount: null, percentage: 1 },
];

/**
 * Tranches fixes pour certaines agences
 */
export const FIXED_RATE_TIERS = {
  '2%': [{ from_amount: 0, to_amount: null, percentage: 2 }],
  '3.5%': [{ from_amount: 0, to_amount: null, percentage: 3.5 }],
};

/**
 * Calcule les redevances par tranches progressives
 * 
 * @param ca - Chiffre d'affaires cumulé annuel
 * @param tiers - Configuration des tranches (triées par from_amount croissant)
 * @returns Détail du calcul avec total et détail par tranche
 */
export function calculateRoyalties(
  ca: number,
  tiers: RoyaltyTier[]
): RoyaltyCalculationResult {
  if (ca <= 0 || tiers.length === 0) {
    return {
      totalCA: ca,
      totalRoyalty: 0,
      effectiveRate: 0,
      details: [],
    };
  }

  // Trier les tranches par montant de départ
  const sortedTiers = [...tiers].sort((a, b) => a.from_amount - b.from_amount);
  
  const details: RoyaltyCalculationDetail[] = [];
  let remainingCA = ca;

  for (const tier of sortedTiers) {
    if (remainingCA <= 0) break;

    const tierStart = tier.from_amount;
    const tierEnd = tier.to_amount ?? Infinity;
    
    // Montant de CA attribuable à cette tranche
    const tierWidth = tierEnd - tierStart;
    const caInTier = Math.min(remainingCA, tierWidth);
    
    if (caInTier > 0) {
      const royaltyAmount = caInTier * (tier.percentage / 100);
      
      details.push({
        tier,
        baseAmount: caInTier,
        royaltyAmount,
      });
      
      remainingCA -= caInTier;
    }
  }

  const totalRoyalty = details.reduce((sum, d) => sum + d.royaltyAmount, 0);
  const effectiveRate = ca > 0 ? (totalRoyalty / ca) * 100 : 0;

  return {
    totalCA: ca,
    totalRoyalty,
    effectiveRate,
    details,
  };
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
