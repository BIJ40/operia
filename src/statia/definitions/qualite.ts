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
 * DELAI_CREATION_DOSSIER_PREMIER_DEVIS_ENVOYE
 * Source : apiGetProjects (created_at + data.history)
 * Périmètre : dossiers ayant au moins une transition d'état * => Devis envoyé (kind=2)
 * Date de début : project.created_at (timestamp ISO)
 * Date de fin : première history.dateModif où labelKind se termine par " => Devis envoyé"
 * Format dateModif : "dd/MM/yyyy HH:mm:ss" (heure locale France)
 * Unité : jours
 * Exclusions : dossiers sans devis envoyé, dossiers sans history cohérente
 */

// Parser une date au format "dd/MM/yyyy HH:mm:ss" (format Apogée)
function parseDateModifApogee(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Format attendu: "dd/MM/yyyy HH:mm:ss" ou "dd/MM/yyyy"
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (!match) {
    // Essayer format ISO au cas où
    const isoDate = new Date(dateStr);
    return isNaN(isoDate.getTime()) ? null : isoDate;
  }
  
  const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = match;
  // Créer la date en heure locale (Europe/Paris assumé)
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1, // mois 0-indexé
    parseInt(day, 10),
    parseInt(hours, 10),
    parseInt(minutes, 10),
    parseInt(seconds, 10)
  );
  
  return isNaN(date.getTime()) ? null : date;
}

export const delaiDossierPremierDevis: StatDefinition = {
  id: 'delai_dossier_premier_devis',
  label: 'Délai 1er devis',
  description: 'Nombre de jours moyen entre création du dossier et premier devis envoyé',
  category: 'qualite',
  source: ['projects'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    console.log('[StatIA] =============== DELAI 1ER DEVIS COMPUTE START ===============');
    const { projects } = data;
    console.log('[StatIA] delai_dossier_premier_devis - projects:', projects?.length ?? 0);
    
    const delais: number[] = [];
    let debugStats = { 
      totalProjets: 0, 
      horsPeriode: 0,
      canceled: 0, 
      noCreatedAt: 0, 
      noHistory: 0,
      noDevisEnvoye: 0, 
      invalidDateModif: 0,
      negative: 0, 
      ok: 0 
    };
    
    for (const project of projects) {
      debugStats.totalProjets++;
      
      // Ignorer les projets annulés
      if (project.state === 'canceled') {
        debugStats.canceled++;
        continue;
      }
      
      // Date de création du dossier = project.created_at (format ISO)
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
      
      // Filtre de période sur la date de création
      if (!isWithinInterval(createdAt, { start: params.dateRange.start, end: params.dateRange.end })) {
        debugStats.horsPeriode++;
        continue;
      }
      
      // Chercher dans data.history
      const history = project.data?.history || [];
      if (!Array.isArray(history) || history.length === 0) {
        debugStats.noHistory++;
        continue;
      }
      
      // Trouver toutes les transitions "* => Devis envoyé" (kind=2)
      // labelKind doit se terminer par " => Devis envoyé" (avec espace avant =>)
      const devisEnvoyeEntries = history
        .filter((h: any) => {
          // kind === 2 = transition d'état (optionnel mais recommandé)
          const kind = h.kind;
          const labelKind = (h.labelKind || '').trim();
          
          // Le labelKind doit se terminer par " => Devis envoyé" ou "=> Devis envoyé"
          const endsWithDevisEnvoye = labelKind.toLowerCase().endsWith('=> devis envoyé');
          
          // Si kind est défini, vérifier qu'il est égal à 2
          if (kind !== undefined && kind !== 2) {
            return false;
          }
          
          return endsWithDevisEnvoye;
        });
      
      if (devisEnvoyeEntries.length === 0) {
        debugStats.noDevisEnvoye++;
        continue;
      }
      
      // Parser les dateModif (format "dd/MM/yyyy HH:mm:ss")
      const parsedDates = devisEnvoyeEntries
        .map((h: any) => parseDateModifApogee(h.dateModif))
        .filter((d: Date | null): d is Date => d !== null);
      
      if (parsedDates.length === 0) {
        debugStats.invalidDateModif++;
        continue;
      }
      
      // Trier par date croissante et prendre la PREMIÈRE (premier envoi de devis)
      parsedDates.sort((a, b) => a.getTime() - b.getTime());
      const firstDevisDate = parsedDates[0];
      
      const diffMs = firstDevisDate.getTime() - createdAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      // Ignorer les délais négatifs ou aberrants
      if (!Number.isFinite(diffDays) || diffDays < 0) {
        debugStats.negative++;
        continue;
      }
      
      delais.push(diffDays);
      debugStats.ok++;
    }
    
    console.log('[StatIA] delai_dossier_premier_devis debug:', debugStats);
    console.log('[StatIA] delais sample (jours):', delais.slice(0, 10).map(d => Math.round(d)));
    
    // Si aucun dossier avec devis envoyé → renvoyer null, pas 0
    const moyenne = delais.length > 0 
      ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)
      : null;
    
    return {
      value: moyenne,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: delais.length,
      },
      breakdown: {
        nbDossiersAvecDevis: delais.length,
        min: delais.length > 0 ? Math.round(Math.min(...delais)) : null,
        max: delais.length > 0 ? Math.round(Math.max(...delais)) : null,
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
