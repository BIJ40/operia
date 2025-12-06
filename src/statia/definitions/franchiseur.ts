/**
 * StatIA V2 - Métriques Franchiseur (réseau, benchmark agences)
 * Métriques réservées aux rôles N3+ avec scope multi-agences
 */

import { StatDefinition } from './types';
import { extractProjectUniverses } from '../engine/normalizers';

// =============================================================================
// 1. CA & STRUCTURE RÉSEAU
// =============================================================================

const caReseauTotal: StatDefinition = {
  id: 'ca_reseau_total',
  label: 'CA réseau total',
  description: 'CA HT total cumulé sur l\'ensemble des agences du réseau',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'sum',
  unit: '€',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    let total = 0;
    let factureCount = 0;
    let avoirCount = 0;

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;

      total += montantNet;
      if (typeFacture === 'avoir') avoirCount++;
      else factureCount++;
    }

    return {
      value: total,
      breakdown: { factureCount, avoirCount, total },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factureCount + avoirCount }
    };
  }
};

const caMoyenParAgence: StatDefinition = {
  id: 'ca_moyen_par_agence',
  label: 'CA moyen par agence',
  description: 'CA HT moyen par agence du réseau sur la période',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'avg',
  unit: '€',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const caParAgence: Record<string, number> = {};

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;

      caParAgence[agenceId] = (caParAgence[agenceId] || 0) + montantNet;
    }

    const agences = Object.keys(caParAgence);
    const total = Object.values(caParAgence).reduce((s, v) => s + v, 0);
    const moyenne = agences.length > 0 ? total / agences.length : 0;

    return {
      value: moyenne,
      breakdown: { agenceCount: agences.length, total },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

const dispersionCaAgences: StatDefinition = {
  id: 'dispersion_ca_agences',
  label: 'Dispersion du CA entre agences',
  description: 'Écart-type des CA agences pour détecter les écarts de performance',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '€',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const caParAgence: Record<string, number> = {};

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;

      caParAgence[agenceId] = (caParAgence[agenceId] || 0) + montantNet;
    }

    const values = Object.values(caParAgence);
    if (values.length < 2) {
      return { value: 0, breakdown: { agenceCount: values.length, ecartType: 0 } };
    }

    const moyenne = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - moyenne, 2), 0) / values.length;
    const ecartType = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      value: ecartType,
      breakdown: { agenceCount: values.length, ecartType, min, max, moyenne },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

const partCaTop10Agences: StatDefinition = {
  id: 'part_ca_top_10_agences',
  label: 'Part du CA réalisée par le top 10 agences',
  description: 'Part du CA réseau réalisée par les 10 agences les plus performantes',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const topN = params.filters?.topN || 10;
    const caParAgence: Record<string, number> = {};

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;

      caParAgence[agenceId] = (caParAgence[agenceId] || 0) + montantNet;
    }

    const sorted = Object.entries(caParAgence).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    const topAgences = sorted.slice(0, topN);
    const caTop = topAgences.reduce((s, [, v]) => s + v, 0);
    const taux = total > 0 ? (caTop / total) * 100 : 0;

    return {
      value: taux,
      breakdown: { topN, caTop, total, agenceCount: sorted.length },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

const tauxCroissanceCaReseauVsN1: StatDefinition = {
  id: 'taux_croissance_ca_reseau_vs_n_1',
  label: 'Croissance CA réseau vs N-1',
  description: 'Variation du CA réseau par rapport à la même période N-1',
  category: 'reseau',
  source: 'factures',
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const startN1 = new Date(start);
    startN1.setFullYear(startN1.getFullYear() - 1);
    const endN1 = new Date(end);
    endN1.setFullYear(endN1.getFullYear() - 1);

    let caCurrentPeriod = 0;
    let caN1 = 0;

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);

      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;

      if (d >= start && d <= end) {
        caCurrentPeriod += montantNet;
      } else if (d >= startN1 && d <= endN1) {
        caN1 += montantNet;
      }
    }

    const taux = caN1 > 0 ? ((caCurrentPeriod - caN1) / caN1) * 100 : (caCurrentPeriod > 0 ? 100 : 0);

    return {
      value: taux,
      breakdown: { caCurrentPeriod, caN1 },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

// =============================================================================
// 2. BENCHMARK AGENCES
// =============================================================================

const topAgencesParCa: StatDefinition = {
  id: 'top_agences_par_ca',
  label: 'Top agences par CA',
  description: 'Classement des agences du réseau selon leur CA HT',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'sum',
  unit: '€',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const topN = params.filters?.topN || 20;
    const caParAgence: Record<string, number> = {};

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;

      caParAgence[agenceId] = (caParAgence[agenceId] || 0) + montantNet;
    }

    const sorted = Object.entries(caParAgence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    const result: Record<string, number> = {};
    sorted.forEach(([agenceId, ca]) => {
      result[agenceId] = ca;
    });

    return {
      value: result,
      breakdown: { agenceCount: Object.keys(caParAgence).length, topN },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

const topAgencesParCroissanceCa: StatDefinition = {
  id: 'top_agences_par_croissance_ca',
  label: 'Top agences par croissance de CA',
  description: 'Classement des agences selon leur croissance de CA vs N-1',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const topN = params.filters?.topN || 20;
    const startN1 = new Date(start);
    startN1.setFullYear(startN1.getFullYear() - 1);
    const endN1 = new Date(end);
    endN1.setFullYear(endN1.getFullYear() - 1);

    const caCurrent: Record<string, number> = {};
    const caN1: Record<string, number> = {};

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;

      if (d >= start && d <= end) {
        caCurrent[agenceId] = (caCurrent[agenceId] || 0) + montantNet;
      } else if (d >= startN1 && d <= endN1) {
        caN1[agenceId] = (caN1[agenceId] || 0) + montantNet;
      }
    }

    const allAgences = new Set([...Object.keys(caCurrent), ...Object.keys(caN1)]);
    const croissances: Array<{ agenceId: string; taux: number }> = [];

    allAgences.forEach(agenceId => {
      const current = caCurrent[agenceId] || 0;
      const n1 = caN1[agenceId] || 0;
      const taux = n1 > 0 ? ((current - n1) / n1) * 100 : (current > 0 ? 100 : 0);
      croissances.push({ agenceId, taux });
    });

    croissances.sort((a, b) => b.taux - a.taux);
    const result: Record<string, number> = {};
    croissances.slice(0, topN).forEach(({ agenceId, taux }) => {
      result[agenceId] = taux;
    });

    return {
      value: result,
      breakdown: { agenceCount: allAgences.size, topN },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

const classementAgencesParPanierMoyenReseau: StatDefinition = {
  id: 'classement_agences_par_panier_moyen_reseau',
  label: 'Classement agences par panier moyen réseau',
  description: 'Classement des agences selon leur panier moyen par dossier',
  category: 'reseau',
  source: ['factures', 'projects'],
  dimensions: ['agence'],
  aggregation: 'avg',
  unit: '€',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const topN = params.filters?.topN || 20;

    const caParAgence: Record<string, number> = {};
    const dossiersParAgence: Record<string, Set<number>> = {};

    // Comptabiliser le CA par agence
    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const projectId = f.projectId;
      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;

      caParAgence[agenceId] = (caParAgence[agenceId] || 0) + montantNet;

      if (projectId) {
        if (!dossiersParAgence[agenceId]) dossiersParAgence[agenceId] = new Set();
        dossiersParAgence[agenceId].add(projectId);
      }
    }

    const paniers: Array<{ agenceId: string; panier: number }> = [];
    Object.keys(caParAgence).forEach(agenceId => {
      const nbDossiers = dossiersParAgence[agenceId]?.size || 1;
      const panier = caParAgence[agenceId] / nbDossiers;
      paniers.push({ agenceId, panier });
    });

    paniers.sort((a, b) => b.panier - a.panier);
    const result: Record<string, number> = {};
    paniers.slice(0, topN).forEach(({ agenceId, panier }) => {
      result[agenceId] = panier;
    });

    return {
      value: result,
      breakdown: { agenceCount: paniers.length, topN },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

const tauxCouvertureUniversReseau: StatDefinition = {
  id: 'taux_couverture_univers_reseau',
  label: 'Taux de couverture univers par agence',
  description: 'Pourcentage d\'univers exploités par chaque agence vs univers théoriques réseau',
  category: 'reseau',
  source: ['factures', 'interventions'],
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const projectsById = new Map(data.projects.map(p => [p.id, p]));
    const universParAgence: Record<string, Set<string>> = {};
    const allUnivers = new Set<string>();

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const project = projectsById.get(f.projectId);
      const universes = extractProjectUniverses(project);

      universes.forEach(u => {
        allUnivers.add(u);
        if (!universParAgence[agenceId]) universParAgence[agenceId] = new Set();
        universParAgence[agenceId].add(u);
      });
    }

    const nbUniversReference = allUnivers.size || 1;
    const result: Record<string, number> = {};

    Object.entries(universParAgence).forEach(([agenceId, univSet]) => {
      result[agenceId] = (univSet.size / nbUniversReference) * 100;
    });

    return {
      value: result,
      breakdown: { nbUniversReference, agenceCount: Object.keys(universParAgence).length },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

const mixUniversParAgence: StatDefinition = {
  id: 'mix_univers_par_agence',
  label: 'Mix univers par agence',
  description: 'Répartition du CA par univers pour chaque agence du réseau',
  category: 'reseau',
  source: ['factures', 'interventions'],
  dimensions: ['agence', 'univers'],
  aggregation: 'sum',
  unit: '€',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const projectsById = new Map(data.projects.map(p => [p.id, p]));
    const caParAgenceUnivers: Record<string, Record<string, number>> = {};

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const project = projectsById.get(f.projectId);
      const universes = extractProjectUniverses(project);

      const typeFacture = (f.typeFacture || '').toLowerCase();
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
      const share = universes.length > 0 ? montantNet / universes.length : montantNet;

      if (!caParAgenceUnivers[agenceId]) caParAgenceUnivers[agenceId] = {};

      universes.forEach(u => {
        caParAgenceUnivers[agenceId][u] = (caParAgenceUnivers[agenceId][u] || 0) + share;
      });

      if (universes.length === 0) {
        caParAgenceUnivers[agenceId]['Non catégorisé'] = (caParAgenceUnivers[agenceId]['Non catégorisé'] || 0) + montantNet;
      }
    }

    return {
      value: caParAgenceUnivers,
      breakdown: { agenceCount: Object.keys(caParAgenceUnivers).length },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

// =============================================================================
// 3. QUALITÉ / SAV – VISION RÉSEAU
// =============================================================================

const tauxSavMoyenReseau: StatDefinition = {
  id: 'taux_sav_moyen_reseau',
  label: 'Taux de SAV moyen réseau',
  description: 'Taux de SAV moyen sur l\'ensemble des agences du réseau',
  category: 'sav',
  source: ['interventions', 'projects'],
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    let totalInterventions = 0;
    let savCount = 0;

    for (const inter of data.interventions) {
      const dateStr = inter.dateReelle || inter.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const state = (inter.state || '').toLowerCase();
      if (state === 'canceled' || state === 'cancelled') continue;

      totalInterventions++;
      const type2 = (inter.type2 || '').toLowerCase();
      if (type2 === 'sav') savCount++;
    }

    const taux = totalInterventions > 0 ? (savCount / totalInterventions) * 100 : 0;

    return {
      value: taux,
      breakdown: { savCount, totalInterventions },
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: totalInterventions }
    };
  }
};

const agencesAuDessusTauxSavSeuil: StatDefinition = {
  id: 'agences_au_dessus_taux_sav_seuil',
  label: 'Agences au-dessus d\'un seuil de SAV',
  description: 'Liste des agences dont le taux de SAV dépasse un seuil défini',
  category: 'sav',
  source: ['interventions', 'projects'],
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const seuil = 5; // Seuil par défaut 5%
    const interventionsParAgence: Record<string, { total: number; sav: number }> = {};

    for (const inter of data.interventions) {
      const dateStr = inter.dateReelle || inter.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const state = (inter.state || '').toLowerCase();
      if (state === 'canceled' || state === 'cancelled') continue;

      const agenceId = inter.agencyId || inter.agency_id || 'unknown';
      if (!interventionsParAgence[agenceId]) {
        interventionsParAgence[agenceId] = { total: 0, sav: 0 };
      }

      interventionsParAgence[agenceId].total++;
      const type2 = (inter.type2 || '').toLowerCase();
      if (type2 === 'sav') interventionsParAgence[agenceId].sav++;
    }

    const result: Record<string, number> = {};
    Object.entries(interventionsParAgence).forEach(([agenceId, counts]) => {
      const taux = counts.total > 0 ? (counts.sav / counts.total) * 100 : 0;
      if (taux > seuil) {
        result[agenceId] = taux;
      }
    });

    return {
      value: result,
      breakdown: { seuil, agencesEnAlerte: Object.keys(result).length },
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: data.interventions.length }
    };
  }
};

const tauxDossiersMultiVisitesReseau: StatDefinition = {
  id: 'taux_dossiers_multi_visites_reseau',
  label: 'Taux dossiers multi-visites réseau',
  description: 'Proportion de dossiers multi-visites sur l\'ensemble des agences',
  category: 'dossiers',
  source: ['projects', 'interventions'],
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const interventionsParDossier: Record<number, number> = {};

    for (const inter of data.interventions) {
      const dateStr = inter.dateReelle || inter.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const state = (inter.state || '').toLowerCase();
      if (state === 'canceled' || state === 'cancelled') continue;

      const projectId = inter.projectId;
      if (projectId) {
        interventionsParDossier[projectId] = (interventionsParDossier[projectId] || 0) + 1;
      }
    }

    const dossiers = Object.keys(interventionsParDossier);
    const multiVisites = dossiers.filter(id => interventionsParDossier[Number(id)] >= 2).length;
    const taux = dossiers.length > 0 ? (multiVisites / dossiers.length) * 100 : 0;

    return {
      value: taux,
      breakdown: { multiVisites, totalDossiers: dossiers.length },
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: data.interventions.length }
    };
  }
};

// =============================================================================
// 4. RECOUVREMENT / RISQUE – VISION RÉSEAU
// =============================================================================

const tauxRecouvrementMoyenReseau: StatDefinition = {
  id: 'taux_recouvrement_moyen_reseau',
  label: 'Taux de recouvrement moyen réseau',
  description: 'Taux de recouvrement moyen sur l\'ensemble des agences',
  category: 'recouvrement',
  source: 'factures',
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    let totalFacture = 0;
    let totalEncaisse = 0;

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const typeFacture = (f.typeFacture || '').toLowerCase();
      if (typeFacture === 'avoir') continue;

      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const reste = f.data?.calcReglementsReste ?? f.calcReglementsReste ?? 0;
      const encaisse = montant - reste;

      totalFacture += montant;
      totalEncaisse += encaisse;
    }

    const taux = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;

    return {
      value: taux,
      breakdown: { totalFacture, totalEncaisse },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

const topAgencesParRestantDu: StatDefinition = {
  id: 'top_agences_par_restant_du',
  label: 'Top agences par encours de factures',
  description: 'Classement des agences selon le montant restant dû',
  category: 'recouvrement',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'sum',
  unit: '€',
  compute: (data, params) => {
    const { start, end } = params.dateRange;
    const topN = params.filters?.topN || 20;
    const resteParAgence: Record<string, number> = {};

    for (const f of data.factures) {
      const dateStr = f.dateReelle || f.date;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const typeFacture = (f.typeFacture || '').toLowerCase();
      if (typeFacture === 'avoir') continue;

      const agenceId = f.agencyId || f.agency_id || 'unknown';
      const reste = f.data?.calcReglementsReste ?? f.calcReglementsReste ?? 0;

      resteParAgence[agenceId] = (resteParAgence[agenceId] || 0) + reste;
    }

    const sorted = Object.entries(resteParAgence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    const result: Record<string, number> = {};
    sorted.forEach(([agenceId, reste]) => {
      result[agenceId] = reste;
    });

    return {
      value: result,
      breakdown: { agenceCount: Object.keys(resteParAgence).length, topN },
      metadata: { computedAt: new Date(), source: 'factures', recordCount: data.factures.length }
    };
  }
};

// =============================================================================
// 5. PROCESS / CONFORMITÉ
// =============================================================================

const tauxDossiersSansDevisParAgence: StatDefinition = {
  id: 'taux_dossiers_sans_devis_par_agence',
  label: 'Taux de dossiers sans devis par agence',
  description: 'Proportion de dossiers sans aucun devis, par agence',
  category: 'qualite',
  source: ['projects', 'devis'],
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;

    // Dossiers par agence dans la période
    const dossiersParAgence: Record<string, Set<number>> = {};
    const dossiersAvecDevis = new Set<number>();

    for (const p of data.projects) {
      const dateStr = p.date || p.created_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = p.agencyId || p.agency_id || 'unknown';
      if (!dossiersParAgence[agenceId]) dossiersParAgence[agenceId] = new Set();
      dossiersParAgence[agenceId].add(p.id);
    }

    // Identifier les dossiers qui ont un devis
    for (const devis of data.devis) {
      if (devis.projectId) dossiersAvecDevis.add(devis.projectId);
    }

    const result: Record<string, number> = {};
    Object.entries(dossiersParAgence).forEach(([agenceId, dossierSet]) => {
      const total = dossierSet.size;
      const sansDevis = [...dossierSet].filter(id => !dossiersAvecDevis.has(id)).length;
      const taux = total > 0 ? (sansDevis / total) * 100 : 0;
      result[agenceId] = taux;
    });

    return {
      value: result,
      breakdown: { agenceCount: Object.keys(dossiersParAgence).length },
      metadata: { computedAt: new Date(), source: 'projects', recordCount: data.projects.length }
    };
  }
};

const tauxDossiersSansFactureParAgence: StatDefinition = {
  id: 'taux_dossiers_sans_facture_par_agence',
  label: 'Taux de dossiers sans facture par agence',
  description: 'Proportion de dossiers clôturés sans facture émise, par agence',
  category: 'qualite',
  source: ['projects', 'factures'],
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data, params) => {
    const { start, end } = params.dateRange;

    // Dossiers clôturés par agence
    const dossiersClotures: Record<string, Set<number>> = {};
    const dossiersAvecFacture = new Set<number>();

    for (const p of data.projects) {
      const state = (p.state || '').toLowerCase();
      if (!['clos', 'closed', 'done', 'invoiced'].includes(state)) continue;

      const dateStr = p.date || p.created_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < start || d > end) continue;

      const agenceId = p.agencyId || p.agency_id || 'unknown';
      if (!dossiersClotures[agenceId]) dossiersClotures[agenceId] = new Set();
      dossiersClotures[agenceId].add(p.id);
    }

    for (const f of data.factures) {
      if (f.projectId) dossiersAvecFacture.add(f.projectId);
    }

    const result: Record<string, number> = {};
    Object.entries(dossiersClotures).forEach(([agenceId, dossierSet]) => {
      const total = dossierSet.size;
      const sansFacture = [...dossierSet].filter(id => !dossiersAvecFacture.has(id)).length;
      const taux = total > 0 ? (sansFacture / total) * 100 : 0;
      result[agenceId] = taux;
    });

    return {
      value: result,
      breakdown: { agenceCount: Object.keys(dossiersClotures).length },
      metadata: { computedAt: new Date(), source: 'projects', recordCount: data.projects.length }
    };
  }
};

// =============================================================================
// EXPORT
// =============================================================================

export const franchiseurDefinitions: Record<string, StatDefinition> = {
  // CA & Structure réseau
  ca_reseau_total: caReseauTotal,
  ca_moyen_par_agence: caMoyenParAgence,
  dispersion_ca_agences: dispersionCaAgences,
  part_ca_top_10_agences: partCaTop10Agences,
  taux_croissance_ca_reseau_vs_n_1: tauxCroissanceCaReseauVsN1,

  // Benchmark agences
  top_agences_par_ca: topAgencesParCa,
  top_agences_par_croissance_ca: topAgencesParCroissanceCa,
  classement_agences_par_panier_moyen_reseau: classementAgencesParPanierMoyenReseau,
  taux_couverture_univers_reseau: tauxCouvertureUniversReseau,
  mix_univers_par_agence: mixUniversParAgence,

  // Qualité / SAV réseau
  taux_sav_moyen_reseau: tauxSavMoyenReseau,
  agences_au_dessus_taux_sav_seuil: agencesAuDessusTauxSavSeuil,
  taux_dossiers_multi_visites_reseau: tauxDossiersMultiVisitesReseau,

  // Recouvrement réseau
  taux_recouvrement_moyen_reseau: tauxRecouvrementMoyenReseau,
  top_agences_par_restant_du: topAgencesParRestantDu,

  // Process / Conformité
  taux_dossiers_sans_devis_par_agence: tauxDossiersSansDevisParAgence,
  taux_dossiers_sans_facture_par_agence: tauxDossiersSansFactureParAgence,
};
