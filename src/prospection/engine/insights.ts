/**
 * Insights Engine - Règles déterministes pour recommandations commerciales
 * Pas d'IA : règles codées en dur basées sur les seuils métier
 * 
 * IMPORTANT: Ne PAS inventer d'univers. Seuls les univers réellement présents
 * dans les données Apogée sont utilisés.
 */

import type { AggregatedKPIs, UniversAggregated } from './aggregators';
import type { AdaptiveScore } from './adaptiveScoring';

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

/**
 * Génère les insights pour un apporteur individuel
 * Basé uniquement sur les données réelles — pas d'univers inventés
 */
export function generateApporteurInsights(
  kpis: AggregatedKPIs,
  universData: UniversAggregated[],
  kpisPreviousPeriod?: AggregatedKPIs,
  allApporteursMedianPanier?: number,
  allApporteursMedianDelai?: number,
  adaptiveScore?: AdaptiveScore | null,
): Insight[] {
  const insights: Insight[] = [];

  // ─── Insights adaptatifs (basés sur le scoring historique) ─────────
  if (adaptiveScore) {
    const { metrics, level } = adaptiveScore;
    
    if (level === 'danger' || level === 'warning') {
      if (metrics.ca.variationPct < -15) {
        insights.push({
          id: 'adaptive_ca_baisse',
          level: level === 'danger' ? 'danger' : 'warning',
          title: `CA en baisse de ${Math.abs(metrics.ca.variationPct)}% vs historique`,
          description: `Moyenne récente ${formatEuroInsight(metrics.ca.recent)}/mois vs moyenne historique ${formatEuroInsight(metrics.ca.avg)}/mois. Tendance à surveiller.`,
          metric: 'ca_trend',
          value: metrics.ca.variationPct,
        });
      }
      if (metrics.dossiers.variationPct < -20) {
        insights.push({
          id: 'adaptive_dossiers_baisse',
          level: 'warning',
          title: `Volume dossiers en baisse de ${Math.abs(metrics.dossiers.variationPct)}%`,
          description: `${metrics.dossiers.recent}/mois récemment vs ${metrics.dossiers.avg}/mois en moyenne. L'apporteur confie moins de dossiers.`,
          metric: 'dossiers_trend',
          value: metrics.dossiers.variationPct,
        });
      }
    }

    if (level === 'positive' || level === 'excellent') {
      if (metrics.ca.variationPct > 20) {
        insights.push({
          id: 'adaptive_ca_hausse',
          level: 'opportunity',
          title: `CA en hausse de ${metrics.ca.variationPct}% vs historique`,
          description: `Moyenne récente ${formatEuroInsight(metrics.ca.recent)}/mois vs ${formatEuroInsight(metrics.ca.avg)}/mois. Apporteur en croissance, à fidéliser.`,
          metric: 'ca_trend',
          value: metrics.ca.variationPct,
        });
      }
    }

    if (metrics.tauxTransfo.variationPct !== null && Math.abs(metrics.tauxTransfo.variationPct) > 15) {
      const isUp = metrics.tauxTransfo.variationPct > 0;
      insights.push({
        id: 'adaptive_transfo_trend',
        level: isUp ? 'opportunity' : 'warning',
        title: `Taux de transformation ${isUp ? 'en amélioration' : 'en baisse'} (${isUp ? '+' : ''}${metrics.tauxTransfo.variationPct}%)`,
        description: `Récent: ${metrics.tauxTransfo.recent}% vs historique: ${metrics.tauxTransfo.avg}%.`,
        metric: 'transfo_trend',
        value: metrics.tauxTransfo.variationPct,
      });
    }
  }

  // ─── Règle 1: Concentration univers (opportunité de diversification) ──
  if (universData.length >= 2) {
    const totalCA = universData.reduce((s, u) => s + u.ca_ht, 0);
    if (totalCA > 0 && universData[0]) {
      const topPct = (universData[0].ca_ht / totalCA) * 100;
      if (topPct > 70) {
        insights.push({
          id: 'univers_concentration',
          level: 'info',
          title: `${Math.round(topPct)}% du CA sur ${universData[0].univers_code}`,
          description: `Forte concentration sur un seul univers. Diversifier pour réduire la dépendance.`,
          metric: 'univers_concentration',
          value: topPct,
        });
      }
    }
  }

  // ─── Règle 2: Dossiers transformés directement (sans devis) ───────────
  if (kpis.dossiers_avec_facture_sans_devis > 0 && kpis.dossiers_received >= 3) {
    const pct = Math.round((kpis.dossiers_avec_facture_sans_devis / kpis.dossiers_received) * 100);
    insights.push({
      id: 'dossiers_directs',
      level: 'info',
      title: `${kpis.dossiers_avec_facture_sans_devis} dossier(s) facturé(s) sans devis`,
      description: `${pct}% des dossiers ont été facturés directement (dépannages, urgences). Bonne réactivité.`,
      metric: 'dossiers_directs',
      value: pct,
    });
  }

  // ─── Règle 3: Taux transfo dossier→facture ───────────────────────────
  if (kpis.taux_transfo_dossier !== null && kpis.dossiers_received >= 5) {
    if (kpis.taux_transfo_dossier < 50) {
      insights.push({
        id: 'transfo_dossier_faible',
        level: 'warning',
        title: `Taux dossier→facture faible: ${kpis.taux_transfo_dossier.toFixed(0)}%`,
        description: `Moins de la moitié des dossiers aboutissent à une facture. Identifier les blocages.`,
        metric: 'taux_transfo_dossier',
        value: kpis.taux_transfo_dossier,
        threshold: 50,
      });
    } else if (kpis.taux_transfo_dossier > 80) {
      insights.push({
        id: 'transfo_dossier_excellent',
        level: 'info',
        title: `Excellent taux dossier→facture: ${kpis.taux_transfo_dossier.toFixed(0)}%`,
        description: `Plus de 80% des dossiers génèrent du CA. Apporteur de qualité.`,
        metric: 'taux_transfo_dossier',
        value: kpis.taux_transfo_dossier,
      });
    }
  }

  // ─── Règle 4: Taux devis non signés élevé ─────────────────────────
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

  // ─── Règle 5: Panier moyen faible vs médiane ─────────────────────
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

  // ─── Règle 6: Tendance CA négative ────────────────────────────────
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

  // ─── Règle 7: Tendance dossiers négative ──────────────────────────
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

  // ─── Règle 8: Délai qui explose ───────────────────────────────────
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

  return insights;
}

function formatEuroInsight(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
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
