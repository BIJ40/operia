/**
 * Aggregators - Fonctions d'agrégation des métriques daily → range
 * Utilisées par les hooks React Query pour consolider les données pré-calculées
 */

export interface DailyMetricRow {
  agence_id: string;
  apporteur_id: string;
  date: string;
  dossiers_received_count: number;
  dossiers_closed_count: number;
  devis_total_count: number;
  devis_signed_count: number;
  factures_count: number;
  ca_ht: number;
  panier_moyen: number | null;
  taux_transfo_devis: number | null;
  dossiers_sans_devis_count: number;
  devis_non_signes_count: number;
  delai_dossier_vers_devis_avg_days: number | null;
  delai_devis_vers_signature_avg_days: number | null;
  delai_signature_vers_facture_avg_days: number | null;
}

export interface UniversDailyRow {
  agence_id: string;
  apporteur_id: string;
  date: string;
  univers_code: string;
  dossiers_count: number;
  devis_count: number;
  factures_count: number;
  ca_ht: number;
}

export interface AggregatedKPIs {
  dossiers_received: number;
  dossiers_closed: number;
  devis_total: number;
  devis_signed: number;
  factures: number;
  ca_ht: number;
  panier_moyen: number | null;
  taux_transfo_devis: number | null;
  dossiers_sans_devis: number;
  devis_non_signes: number;
  delai_dossier_devis_avg: number | null;
  delai_devis_signature_avg: number | null;
  delai_signature_facture_avg: number | null;
}

export interface UniversAggregated {
  univers_code: string;
  dossiers: number;
  devis: number;
  factures: number;
  ca_ht: number;
}

/**
 * Agrège des métriques daily sur une période donnée
 */
export function aggregateDailyMetrics(rows: DailyMetricRow[]): AggregatedKPIs {
  if (rows.length === 0) {
    return {
      dossiers_received: 0, dossiers_closed: 0, devis_total: 0, devis_signed: 0,
      factures: 0, ca_ht: 0, panier_moyen: null, taux_transfo_devis: null,
      dossiers_sans_devis: 0, devis_non_signes: 0,
      delai_dossier_devis_avg: null, delai_devis_signature_avg: null, delai_signature_facture_avg: null,
    };
  }

  const sums = rows.reduce((acc, r) => ({
    dossiers_received: acc.dossiers_received + (r.dossiers_received_count || 0),
    dossiers_closed: acc.dossiers_closed + (r.dossiers_closed_count || 0),
    devis_total: acc.devis_total + (r.devis_total_count || 0),
    devis_signed: acc.devis_signed + (r.devis_signed_count || 0),
    factures: acc.factures + (r.factures_count || 0),
    ca_ht: acc.ca_ht + (r.ca_ht || 0),
    dossiers_sans_devis: acc.dossiers_sans_devis + (r.dossiers_sans_devis_count || 0),
    devis_non_signes: acc.devis_non_signes + (r.devis_non_signes_count || 0),
  }), {
    dossiers_received: 0, dossiers_closed: 0, devis_total: 0, devis_signed: 0,
    factures: 0, ca_ht: 0, dossiers_sans_devis: 0, devis_non_signes: 0,
  });

  // Moyennes pondérées pour les délais (exclure nulls)
  const avgField = (field: keyof DailyMetricRow) => {
    const vals = rows.filter(r => r[field] != null).map(r => r[field] as number);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  return {
    ...sums,
    panier_moyen: sums.factures > 0 ? Math.round(sums.ca_ht / sums.factures) : null,
    taux_transfo_devis: sums.devis_total > 0 ? Math.round((sums.devis_signed / sums.devis_total) * 10000) / 100 : null,
    delai_dossier_devis_avg: avgField('delai_dossier_vers_devis_avg_days'),
    delai_devis_signature_avg: avgField('delai_devis_vers_signature_avg_days'),
    delai_signature_facture_avg: avgField('delai_signature_vers_facture_avg_days'),
  };
}

/**
 * Agrège les métriques univers sur une période
 */
export function aggregateUniversMetrics(rows: UniversDailyRow[]): UniversAggregated[] {
  const byUnivers = new Map<string, UniversAggregated>();
  
  for (const r of rows) {
    const existing = byUnivers.get(r.univers_code) || { univers_code: r.univers_code, dossiers: 0, devis: 0, factures: 0, ca_ht: 0 };
    existing.dossiers += r.dossiers_count || 0;
    existing.devis += r.devis_count || 0;
    existing.factures += r.factures_count || 0;
    existing.ca_ht += r.ca_ht || 0;
    byUnivers.set(r.univers_code, existing);
  }

  return Array.from(byUnivers.values()).sort((a, b) => b.ca_ht - a.ca_ht);
}

/**
 * Agrège les métriques par mois pour les tendances
 */
export function aggregateByMonth(rows: DailyMetricRow[]): Array<{
  month: string;
  dossiers: number;
  ca_ht: number;
  taux_transfo: number | null;
}> {
  const byMonth = new Map<string, { dossiers: number; ca_ht: number; devis_total: number; devis_signed: number }>();

  for (const r of rows) {
    const month = r.date.slice(0, 7); // YYYY-MM
    const existing = byMonth.get(month) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0 };
    existing.dossiers += r.dossiers_received_count || 0;
    existing.ca_ht += r.ca_ht || 0;
    existing.devis_total += r.devis_total_count || 0;
    existing.devis_signed += r.devis_signed_count || 0;
    byMonth.set(month, existing);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      dossiers: d.dossiers,
      ca_ht: Math.round(d.ca_ht),
      taux_transfo: d.devis_total > 0 ? Math.round((d.devis_signed / d.devis_total) * 10000) / 100 : null,
    }));
}
