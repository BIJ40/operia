/**
 * Insights Engine - Règles déterministes pour recommandations commerciales
 * Pas d'IA : règles codées en dur basées sur les seuils métier
 */

import type { AggregatedKPIs, UniversAggregated } from './aggregators';

export type InsightLevel = 'info' | 'warning' | 'danger' | 'opportunity';

export interface Insight {
  id: string;
  level: InsightLevel;
  title: string;
  description: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

// ─── Known universes for opportunity detection ──────────────────────
const ALL_KNOWN_UNIVERSES = [
  'Plomberie', 'Électricité', 'Menuiserie', 'Vitrerie',
  'Peinture', 'Serrurerie', 'Chauffage', 'Climatisation',
  'Rénovation', 'Multiservice',
];

/**
 * Génère les insights pour un apporteur individuel
 */
export function generateApporteurInsights(
  kpis: AggregatedKPIs,
  universData: UniversAggregated[],
  kpisPreviousPeriod?: AggregatedKPIs,
  allApporteursMedianPanier?: number,
  allApporteursMedianDelai?: number,
): Insight[] {
  const insights: Insight[] = [];

  // ─── Règle 1: Univers manquants (opportunité) ─────────────────────
  const presentUniverses = new Set(universData.filter(u => u.ca_ht > 0).map(u => u.univers_code));
  for (const univ of ALL_KNOWN_UNIVERSES) {
    if (!presentUniverses.has(univ)) {
      insights.push({
        id: `univers_missing_${univ.toLowerCase()}`,
        level: 'opportunity',
        title: `Univers non exploité : ${univ}`,
        description: `Aucun CA enregistré en ${univ} sur la période. Opportunité de développement commercial.`,
        metric: 'univers',
      });
    }
  }

  // ─── Règle 2: Taux devis non signés élevé ─────────────────────────
  if (kpis.devis_total >= 10 && kpis.devis_non_signes > 0) {
    const tauxNonSignes = kpis.devis_non_signes / kpis.devis_total;
    if (tauxNonSignes > 0.45) {
      insights.push({
        id: 'devis_non_signes_eleve',
        level: 'warning',
        title: 'Taux de devis non signés élevé',
        description: `${Math.round(tauxNonSignes * 100)}% des devis ne sont pas signés (${kpis.devis_non_signes}/${kpis.devis_total}). Revoir le processus de relance et le positionnement tarifaire.`,
        metric: 'taux_devis_non_signes',
        value: tauxNonSignes * 100,
        threshold: 45,
      });
    }
  }

  // ─── Règle 3: Panier moyen faible vs médiane ─────────────────────
  if (allApporteursMedianPanier && kpis.panier_moyen !== null) {
    const seuil = allApporteursMedianPanier * 0.8;
    if (kpis.panier_moyen < seuil) {
      insights.push({
        id: 'panier_faible',
        level: 'warning',
        title: 'Panier moyen sous la médiane',
        description: `Panier moyen de ${Math.round(kpis.panier_moyen)}€ vs médiane ${Math.round(allApporteursMedianPanier)}€. Envisager de monter en gamme ou élargir le scope des interventions.`,
        metric: 'panier_moyen',
        value: kpis.panier_moyen,
        threshold: seuil,
      });
    }
  }

  // ─── Règle 4: Tendance CA négative ────────────────────────────────
  if (kpisPreviousPeriod && kpisPreviousPeriod.ca_ht > 0) {
    const ratio = kpis.ca_ht / kpisPreviousPeriod.ca_ht;
    if (ratio < 0.85) {
      const drop = Math.round((1 - ratio) * 100);
      insights.push({
        id: 'tendance_ca_negative',
        level: 'danger',
        title: `Baisse CA de ${drop}%`,
        description: `Le CA a chuté de ${drop}% par rapport à la période précédente (${Math.round(kpis.ca_ht)}€ vs ${Math.round(kpisPreviousPeriod.ca_ht)}€). Action commerciale requise.`,
        metric: 'ca_ht',
        value: ratio * 100,
        threshold: 85,
      });
    }
  }

  // ─── Règle 5: Tendance dossiers négative ──────────────────────────
  if (kpisPreviousPeriod && kpisPreviousPeriod.dossiers_received > 0) {
    const ratio = kpis.dossiers_received / kpisPreviousPeriod.dossiers_received;
    if (ratio < 0.80) {
      const drop = Math.round((1 - ratio) * 100);
      insights.push({
        id: 'tendance_dossiers_negative',
        level: 'danger',
        title: `Baisse dossiers de ${drop}%`,
        description: `Le nombre de dossiers a baissé de ${drop}% (${kpis.dossiers_received} vs ${kpisPreviousPeriod.dossiers_received}). Renforcer la relation commerciale.`,
        metric: 'dossiers',
        value: ratio * 100,
        threshold: 80,
      });
    }
  }

  // ─── Règle 6: Délai qui explose ───────────────────────────────────
  if (allApporteursMedianDelai && kpis.delai_dossier_devis_avg !== null) {
    const seuil = allApporteursMedianDelai * 1.5;
    if (kpis.delai_dossier_devis_avg > seuil) {
      insights.push({
        id: 'delai_explose',
        level: 'warning',
        title: 'Délai dossier→devis excessif',
        description: `Délai moyen de ${kpis.delai_dossier_devis_avg.toFixed(1)}j vs médiane ${allApporteursMedianDelai.toFixed(1)}j. Process à revoir côté agence.`,
        metric: 'delai_dossier_devis',
        value: kpis.delai_dossier_devis_avg,
        threshold: seuil,
      });
    }
  }

  // ─── Règle 7: Dossiers sans devis élevé ───────────────────────────
  if (kpis.dossiers_received >= 5) {
    const tauxSansDevis = kpis.dossiers_sans_devis / kpis.dossiers_received;
    if (tauxSansDevis > 0.40) {
      insights.push({
        id: 'dossiers_sans_devis',
        level: 'warning',
        title: 'Beaucoup de dossiers sans devis',
        description: `${Math.round(tauxSansDevis * 100)}% des dossiers n'ont pas de devis associé. Perte de CA potentiel.`,
        metric: 'taux_sans_devis',
        value: tauxSansDevis * 100,
        threshold: 40,
      });
    }
  }

  return insights;
}

/**
 * Génère les alertes pour la page Veille (tous apporteurs)
 */
export function generateAlerts(
  apporteurs: Array<{
    apporteur_id: string;
    apporteur_name: string;
    current: AggregatedKPIs;
    previous: AggregatedKPIs;
  }>,
): Array<Insight & { apporteur_id: string; apporteur_name: string }> {
  const alerts: Array<Insight & { apporteur_id: string; apporteur_name: string }> = [];

  for (const a of apporteurs) {
    // Baisse CA > 20%
    if (a.previous.ca_ht > 0) {
      const ratio = a.current.ca_ht / a.previous.ca_ht;
      if (ratio < 0.80) {
        alerts.push({
          ...a,
          id: `alert_ca_${a.apporteur_id}`,
          level: 'danger',
          title: `Baisse CA -${Math.round((1 - ratio) * 100)}%`,
          description: `${a.apporteur_name}: CA ${Math.round(a.current.ca_ht)}€ vs ${Math.round(a.previous.ca_ht)}€`,
          metric: 'ca_ht',
          value: ratio * 100,
          threshold: 80,
        });
      }
    }

    // Baisse dossiers > 25%
    if (a.previous.dossiers_received > 3) {
      const ratio = a.current.dossiers_received / a.previous.dossiers_received;
      if (ratio < 0.75) {
        alerts.push({
          ...a,
          id: `alert_dossiers_${a.apporteur_id}`,
          level: 'warning',
          title: `Baisse dossiers -${Math.round((1 - ratio) * 100)}%`,
          description: `${a.apporteur_name}: ${a.current.dossiers_received} vs ${a.previous.dossiers_received} dossiers`,
          metric: 'dossiers',
          value: ratio * 100,
          threshold: 75,
        });
      }
    }

    // Hausse devis non signés
    if (a.current.devis_total >= 5 && a.current.taux_transfo_devis !== null) {
      if (a.current.taux_transfo_devis < 40) {
        alerts.push({
          ...a,
          id: `alert_transfo_${a.apporteur_id}`,
          level: 'warning',
          title: `Taux transfo faible: ${a.current.taux_transfo_devis.toFixed(0)}%`,
          description: `${a.apporteur_name}: seulement ${a.current.devis_signed}/${a.current.devis_total} devis signés`,
          metric: 'taux_transfo',
          value: a.current.taux_transfo_devis,
          threshold: 40,
        });
      }
    }
  }

  return alerts.sort((a, b) => {
    const levelOrder: Record<InsightLevel, number> = { danger: 0, warning: 1, opportunity: 2, info: 3 };
    return (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3);
  });
}
