/**
 * StatIA V2 - Définitions des métriques Qualité
 * Famille de métriques pour l'analyse qualité et KPI avancés (hors SAV)
 * Note: Les métriques SAV sont dans sav.ts
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, isWithinInterval, differenceInDays } from 'date-fns';
import { extractFactureMeta } from '../rules/rules';
import { extractProjectUniverses } from '../engine/normalizers';

/**
 * Taux de dossiers multi-univers
 * Pourcentage de dossiers impliquant plusieurs univers métiers
 */
export const tauxDossiersMultiUnivers: StatDefinition = {
  id: 'taux_dossiers_multi_univers',
  label: 'Taux multi-univers',
  description: 'Pourcentage de dossiers impliquant plusieurs univers',
  category: 'qualite',
  source: 'projects',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    let totalProjets = 0;
    let projetsMultiUnivers = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      totalProjets++;
      
      const universes = extractProjectUniverses(project);
      if (universes.length > 1) {
        projetsMultiUnivers++;
      }
    }
    
    const taux = totalProjets > 0 ? (projetsMultiUnivers / totalProjets) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: totalProjets,
      },
      breakdown: {
        totalProjets,
        projetsMultiUnivers,
        projetsMonoUnivers: totalProjets - projetsMultiUnivers,
      }
    };
  }
};

/**
 * Taux de dossiers sans devis
 * Dossiers facturés sans passer par un devis (dépannages directs)
 */
export const tauxDossiersSansDevis: StatDefinition = {
  id: 'taux_dossiers_sans_devis',
  label: 'Taux sans devis',
  description: 'Pourcentage de dossiers facturés sans devis préalable',
  category: 'qualite',
  source: ['projects', 'devis', 'factures'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, devis, factures } = data;
    
    // Projets avec factures
    const projetsAvecFacture = new Set<number | string>();
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!meta.date) continue;
      if (!isWithinInterval(meta.date, { start: params.dateRange.start, end: params.dateRange.end })) {
        continue;
      }
      if (facture.projectId) {
        projetsAvecFacture.add(facture.projectId);
      }
    }
    
    // Projets avec devis
    const projetsAvecDevis = new Set<number | string>();
    for (const d of devis) {
      if (d.projectId) {
        projetsAvecDevis.add(d.projectId);
      }
    }
    
    // Compter les projets facturés sans devis
    let projetsSansDevis = 0;
    for (const projectId of projetsAvecFacture) {
      if (!projetsAvecDevis.has(projectId)) {
        projetsSansDevis++;
      }
    }
    
    const totalFactures = projetsAvecFacture.size;
    const taux = totalFactures > 0 ? (projetsSansDevis / totalFactures) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: totalFactures,
      },
      breakdown: {
        totalFactures,
        projetsSansDevis,
        projetsAvecDevis: totalFactures - projetsSansDevis,
      }
    };
  }
};

/**
 * Délai moyen validation devis
 * Temps entre émission et validation d'un devis
 */
export const delaiValidationDevis: StatDefinition = {
  id: 'delai_validation_devis',
  label: 'Délai validation devis',
  description: 'Nombre de jours moyen entre émission et validation du devis',
  category: 'qualite',
  source: 'devis',
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    const delais: number[] = [];
    
    for (const d of devis) {
      const dateEmission = d.dateReelle || d.date || d.created_at;
      if (!dateEmission) continue;
      
      // Seulement les devis validés
      const state = (d.state || '').toLowerCase();
      if (!['validated', 'signed', 'order', 'accepted'].includes(state)) continue;
      
      const dateValidation = d.dateValidation || d.data?.dateValidation;
      if (!dateValidation) continue;
      
      try {
        const emissionDate = parseISO(dateEmission);
        const validationDate = parseISO(dateValidation);
        
        if (!isWithinInterval(emissionDate, { start: params.dateRange.start, end: params.dateRange.end })) {
          continue;
        }
        
        const delai = differenceInDays(validationDate, emissionDate);
        if (delai >= 0) {
          delais.push(delai);
        }
      } catch {
        continue;
      }
    }
    
    const moyenne = delais.length > 0 
      ? delais.reduce((a, b) => a + b, 0) / delais.length 
      : 0;
    
    return {
      value: Math.round(moyenne * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: delais.length,
      },
      breakdown: {
        nbDevisValides: delais.length,
        min: delais.length > 0 ? Math.min(...delais) : 0,
        max: delais.length > 0 ? Math.max(...delais) : 0,
      }
    };
  }
};

/**
 * Taux de factures avec avoir
 * Pourcentage de factures ayant généré un avoir
 */
export const tauxFacturesAvecAvoir: StatDefinition = {
  id: 'taux_factures_avec_avoir',
  label: 'Taux factures avec avoir',
  description: 'Pourcentage de factures ayant généré un avoir',
  category: 'qualite',
  source: 'factures',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalFactures = 0;
    let totalAvoirs = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!meta.date) continue;
      if (!isWithinInterval(meta.date, { start: params.dateRange.start, end: params.dateRange.end })) {
        continue;
      }
      
      if (meta.isAvoir) {
        totalAvoirs++;
      } else {
        totalFactures++;
      }
    }
    
    const taux = totalFactures > 0 ? (totalAvoirs / totalFactures) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: totalFactures + totalAvoirs,
      },
      breakdown: {
        totalFactures,
        totalAvoirs,
      }
    };
  }
};

/**
 * Montant total des avoirs
 */
export const montantTotalAvoirs: StatDefinition = {
  id: 'montant_total_avoirs',
  label: 'Montant avoirs',
  description: 'Montant total HT des avoirs émis',
  category: 'qualite',
  source: 'factures',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalAvoirs = 0;
    let count = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!meta.date) continue;
      if (!isWithinInterval(meta.date, { start: params.dateRange.start, end: params.dateRange.end })) {
        continue;
      }
      
      if (meta.isAvoir) {
        totalAvoirs += Math.abs(meta.montantNetHT);
        count++;
      }
    }
    
    return {
      value: Math.round(totalAvoirs * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: count,
      }
    };
  }
};

/**
 * Nb moyen d'interventions par dossier
 */
export const nbMoyenInterventionsParDossier: StatDefinition = {
  id: 'nb_moyen_interventions_dossier',
  label: 'Nb interventions/dossier',
  description: 'Nombre moyen d\'interventions par dossier',
  category: 'qualite',
  source: ['interventions', 'projects'],
  aggregation: 'avg',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    const interventionsParProjet = new Map<string | number, number>();
    const projetsInPeriod = new Set<string | number>();
    
    // Identifier les projets dans la période
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            projetsInPeriod.add(project.id);
          }
        } catch {
          continue;
        }
      }
    }
    
    // Compter les interventions par projet
    for (const intervention of interventions) {
      const projectId = intervention.projectId;
      if (!projectId || !projetsInPeriod.has(projectId)) continue;
      
      interventionsParProjet.set(
        projectId, 
        (interventionsParProjet.get(projectId) || 0) + 1
      );
    }
    
    const nbProjets = projetsInPeriod.size;
    const totalInterventions = Array.from(interventionsParProjet.values()).reduce((a, b) => a + b, 0);
    const moyenne = nbProjets > 0 ? totalInterventions / nbProjets : 0;
    
    return {
      value: Math.round(moyenne * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: nbProjets,
      },
      breakdown: {
        totalInterventions,
        nbProjets,
      }
    };
  }
};

/**
 * Helper: parser pour dates françaises "dd/MM/yyyy HH:mm:ss" depuis l'historique Apogée
 */
function parseFrHistoryDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [dPart, tPart] = dateStr.split(" ");
  if (!dPart || !tPart) return null;

  const [dayStr, monthStr, yearStr] = dPart.split("/");
  const [hourStr, minStr, secStr] = tPart.split(":");

  const day = Number(dayStr);
  const month = Number(monthStr) - 1; // JS: mois 0-11
  const year = Number(yearStr);
  const hour = Number(hourStr);
  const minute = Number(minStr);
  const second = Number(secStr);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Délai moyen dossier → premier devis
 * Temps entre l'ouverture du dossier (created_at) et l'envoi du premier devis
 * Basé sur project.data.history (événement "Devis envoyé")
 */
export const delaiDossierPremierDevis: StatDefinition = {
  id: 'delai_dossier_premier_devis',
  label: 'Délai 1er devis',
  description: 'Nombre de jours moyen entre ouverture du dossier et envoi du premier devis',
  category: 'qualite',
  source: 'projects',
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, _params: StatParams): StatResult => {
    console.log('[StatIA] =============== DELAI 1ER DEVIS COMPUTE START ===============');
    const { projects } = data;
    console.log('[StatIA] delai_dossier_premier_devis projects reçus:', projects?.length ?? 'undefined');
    
    const delais: number[] = [];
    let debugStats = { total: 0, canceled: 0, noCreatedAt: 0, noHistory: 0, noDevisEvent: 0, badDateParsing: 0, negative: 0, ok: 0 };
    
    // Note: Pas de filtre de date - on calcule sur TOUS les projets (comportement legacy)
    for (const project of projects) {
      debugStats.total++;
      
      // Ignorer les projets annulés
      if (project.state === 'canceled') {
        debugStats.canceled++;
        continue;
      }
      
      const createdAtStr = project.created_at;
      if (!createdAtStr) {
        debugStats.noCreatedAt++;
        continue;
      }
      
      const createdAt = new Date(createdAtStr);
      if (isNaN(createdAt.getTime())) {
        debugStats.noCreatedAt++;
        continue;
      }
      
      // Chercher le premier événement "Devis envoyé" dans l'historique
      const history = project.data?.history ?? [];
      if (!history || history.length === 0) {
        debugStats.noHistory++;
        continue;
      }
      
      const devisEvent = history.find((h: any) =>
        (h.labelKind || '').toLowerCase().includes('devis envoyé')
      );
      
      if (!devisEvent) {
        debugStats.noDevisEvent++;
        continue;
      }
      
      const dateDevis = parseFrHistoryDate(devisEvent.dateModif);
      if (!dateDevis || isNaN(dateDevis.getTime())) {
        debugStats.badDateParsing++;
        continue;
      }
      
      const diffMs = dateDevis.getTime() - createdAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      // Ignorer les valeurs négatives
      if (diffDays >= 0) {
        delais.push(diffDays);
        debugStats.ok++;
      } else {
        debugStats.negative++;
      }
    }
    
    console.log('[StatIA] delai_dossier_premier_devis debug:', debugStats);
    console.log('[StatIA] delais sample:', delais.slice(0, 5).map(d => Math.round(d)));
    
    const moyenne = delais.length > 0 
      ? delais.reduce((a, b) => a + b, 0) / delais.length 
      : 0;
    
    return {
      value: Math.round(moyenne), // KPI au jour près
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: delais.length,
      },
      breakdown: {
        nbDossiersAvecDevis: delais.length,
        min: delais.length > 0 ? Math.round(Math.min(...delais)) : 0,
        max: delais.length > 0 ? Math.round(Math.max(...delais)) : 0,
        debug: debugStats,
      }
    };
  }
};

export const qualiteDefinitions = {
  taux_dossiers_multi_univers: tauxDossiersMultiUnivers,
  taux_dossiers_sans_devis: tauxDossiersSansDevis,
  delai_validation_devis: delaiValidationDevis,
  delai_dossier_premier_devis: delaiDossierPremierDevis,
  taux_factures_avec_avoir: tauxFacturesAvecAvoir,
  montant_total_avoirs: montantTotalAvoirs,
  nb_moyen_interventions_dossier: nbMoyenInterventionsParDossier,
};
