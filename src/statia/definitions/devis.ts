/**
 * StatIA V1 - Définitions des métriques Devis
 * Aligné sur la logique legacy de dashboardCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { isFactureStateIncluded } from '../engine/normalizers';
import { logDebug } from '@/lib/logger';

/**
 * Taux de Transformation Devis (en nombre)
 * Aligné sur la logique legacy : envoyés = sent/accepted/invoice, acceptés = accepted/invoice
 */
export const tauxTransformationDevisNombre: StatDefinition = {
  id: 'taux_transformation_devis_nombre',
  label: 'Taux Transformation Devis (Nombre)',
  description: 'Pourcentage de devis transformés en factures (en nombre)',
  category: 'devis',
  source: 'devis',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    let devisEnvoyes = 0;
    let devisAcceptes = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Récupérer l'état du devis
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      
      // Devis envoyés = sent, accepted, invoice (ceux qui ont été présentés au client)
      if (state === 'sent' || state === 'accepted' || state === 'invoice') {
        devisEnvoyes++;
        
        // Devis acceptés = accepted ou invoice (facturé)
        if (state === 'accepted' || state === 'invoice') {
          devisAcceptes++;
        }
      }
    }
    
    const taux = devisEnvoyes > 0 ? (devisAcceptes / devisEnvoyes) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10, // Arrondir à 1 décimale
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: devisEnvoyes,
      },
      breakdown: {
        totalDevis: devisEnvoyes,
        devisTransformes: devisAcceptes,
        devisNonTransformes: devisEnvoyes - devisAcceptes,
      }
    };
  }
};

/**
 * Taux de Transformation Devis (en montant)
 * Aligné sur la logique legacy : envoyés = sent/accepted/invoice, acceptés = accepted/invoice
 */
export const tauxTransformationDevisMontant: StatDefinition = {
  id: 'taux_transformation_devis_montant',
  label: 'Taux Transformation Devis (Montant)',
  description: 'Pourcentage de devis transformés en factures (en montant HT)',
  category: 'devis',
  source: 'devis',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    let totalMontantEnvoye = 0;
    let totalMontantAccepte = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Récupérer l'état du devis
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      const montantHT = d.data?.totalHT ?? d.totalHT ?? 0;
      
      // Devis envoyés = sent, accepted, invoice
      if (state === 'sent' || state === 'accepted' || state === 'invoice') {
        totalMontantEnvoye += montantHT;
        
        // Devis acceptés = accepted ou invoice
        if (state === 'accepted' || state === 'invoice') {
          totalMontantAccepte += montantHT;
        }
      }
    }
    
    const taux = totalMontantEnvoye > 0 ? (totalMontantAccepte / totalMontantEnvoye) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: devis.length,
      },
      breakdown: {
        totalMontantDevise: totalMontantEnvoye,
        totalMontantTransforme: totalMontantAccepte,
        montantNonTransforme: totalMontantEnvoye - totalMontantAccepte,
      }
    };
  }
};

/**
 * Nombre de Devis émis (envoyés au client)
 */
export const nombreDevis: StatDefinition = {
  id: 'nombre_devis',
  label: 'Nombre de Devis',
  description: 'Nombre total de devis envoyés (sent/accepted/invoice)',
  category: 'devis',
  source: 'devis',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    let count = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Compter uniquement les devis envoyés (sent, accepted, invoice)
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      if (state === 'sent' || state === 'accepted' || state === 'invoice') {
        count++;
      }
    }
    
    return {
      value: count,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: count,
      }
    };
  }
};

/**
 * Montant total des Devis émis (TOUS les devis de la période)
 * Somme de tous les HT des devis, sans filtrage par état
 */
export const montantDevis: StatDefinition = {
  id: 'montant_devis',
  label: 'Montant Devis HT',
  description: 'Montant total HT de tous les devis émis sur la période',
  category: 'devis',
  source: 'devis',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    logDebug('STATIA', 'montantDevis - START', {
      nbDevisTotal: devis.length,
      dateRange: params.dateRange ? { 
        start: params.dateRange.start.toISOString(), 
        end: params.dateRange.end.toISOString() 
      } : 'none',
      sampleDevis: devis.slice(0, 3).map(d => ({
        id: d.id,
        state: d.state || d.statut || d.data?.state,
        totalHT: d.data?.totalHT ?? d.totalHT,
        date: d.dateReelle || d.date || d.data?.dateReelle || d.data?.date,
      }))
    });
    
    let totalHT = 0;
    let count = 0;
    let skippedByDate = 0;
    let skippedByState = 0;
    
    for (const d of devis) {
      // Filtre par date
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr && params.dateRange) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          skippedByDate++;
          continue;
        }
        if (date < params.dateRange.start || date > params.dateRange.end) {
          skippedByDate++;
          continue;
        }
      }
      
      // Exclure uniquement les brouillons et annulés
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      if (state === 'draft' || state === 'brouillon' || state === 'cancelled' || state === 'annule') {
        skippedByState++;
        continue;
      }
      
      // Sommer le montant HT (forcer en number pour éviter concaténation de strings)
      const rawMontant = d.data?.totalHT ?? d.totalHT ?? 0;
      const montant = typeof rawMontant === 'string' ? parseFloat(rawMontant) || 0 : Number(rawMontant) || 0;
      totalHT += montant;
      count++;
    }
    
    logDebug('STATIA', 'montantDevis - RESULT', {
      totalHT,
      count,
      skippedByDate,
      skippedByState,
    });
    
    return {
      value: totalHT,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: count,
      },
      breakdown: {
        nbDevis: count,
        totalHT: totalHT,
      }
    };
  }
};

/**
 * Devis signés mais non facturés
 * Stock de travaux à lancer / facturer
 * Périmètre : devis avec état ∈ {accepted, validated, signed, order}
 * Filtre : aucun mouvement de facture sur le projet (0 facture, ou facture totale = 0)
 */
export const devisSignesNonFactures: StatDefinition = {
  id: 'devis_signes_non_factures',
  label: 'Devis Signés Non Facturés',
  description: 'Stock de devis acceptés/signés sans aucune facture associée',
  category: 'devis',
  source: ['devis', 'factures'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, factures } = data;
    
    // États considérés comme "signés/acceptés"
    const SIGNED_STATES = ['accepted', 'validated', 'signed', 'order'];
    
    // 1) Index des projets facturés (utilisant isFactureStateIncluded, sans filtre de date)
    const facturedProjectIds = new Set<string>();
    for (const f of factures || []) {
      const factureState = f.state || f.status || f.statut 
        || f.data?.state || f.data?.status || f.paymentStatus || '';
      
      // Utiliser la même règle que pour le CA
      if (!isFactureStateIncluded(factureState)) continue;
      
      const pidRaw = f.projectId || f.project_id || f.data?.projectId;
      if (!pidRaw) continue;
      facturedProjectIds.add(String(pidRaw));
    }
    
    let montantTotalHT = 0;
    let nbDevis = 0;
    const projetsNonFactures = new Set<string>();
    
    // 2) Parcours des devis signés de la période
    for (const d of devis || []) {
      // Vérifier l'état du devis (signé/accepté)
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      if (!SIGNED_STATES.includes(state)) continue;
      
      // Filtre par date (date du devis)
      const dateStr = d.dateReelle || d.date || d.created_at;
      if (!dateStr) continue;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) continue;
      
      // Récupérer le projectId
      const pidRaw = d.projectId || d.data?.projectId;
      if (!pidRaw) continue;
      const pid = String(pidRaw);
      
      // PROJET DEJA FACTURÉ ? → on ignore ce devis
      if (facturedProjectIds.has(pid)) continue;
      
      // Calcul du montant
      const montantRaw = d.data?.totalHT ?? d.totalHT ?? d.montantHT ?? 0;
      const montant = typeof montantRaw === 'string' ? parseFloat(montantRaw) || 0 : Number(montantRaw) || 0;
      
      montantTotalHT += montant;
      nbDevis++;
      projetsNonFactures.add(pid);
    }
    
    logDebug('STATIA', 'devisSignesNonFactures - RESULT', {
      montantTotalHT: Math.round(montantTotalHT * 100) / 100,
      nbDevis,
      nbProjets: projetsNonFactures.size,
      facturedProjectsCount: facturedProjectIds.size,
    });
    
    return {
      value: {
        montantTotalHT: Math.round(montantTotalHT * 100) / 100,
        nbDevis,
        nbProjets: projetsNonFactures.size,
      },
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: nbDevis,
      },
    };
  }
};

// ============= HELPERS =============

function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
}

function extractProjectUniverses(project: any): string[] {
  const universes = project?.data?.universes || project?.universes || [];
  if (Array.isArray(universes) && universes.length > 0) {
    return universes.map((u: any) => {
      const label = typeof u === 'string' ? u : (u?.label || u?.name || u?.code || '');
      return label || 'Non catégorisé';
    }).filter(Boolean);
  }
  return ['Non catégorisé'];
}

function normalizeApporteurType(raw: any): string {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return 'Clients Directs';
  if (['assureur', 'assurance', 'assureurs'].includes(v)) return 'Assureurs';
  if (['bailleur', 'bailleurs', 'bailleur_social'].includes(v)) return 'Bailleurs';
  if (['syndic', 'copro', 'copropriete'].includes(v)) return 'Syndics';
  if (['maintenance', 'mainteneur'].includes(v)) return 'Maintenance';
  if (['gestion', 'gestionnaire'].includes(v)) return 'Gestionnaires';
  if (['pro', 'professionnel', 'professionnels'].includes(v)) return 'Professionnels';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

// ============= METRIC: Répartition devis par univers =============

// ============= METRIC: Répartition devis par univers =============

/**
 * Répartition des devis par univers
 * nb devis, montant HT, panier moyen par univers
 */
export const repartitionDevisParUnivers: StatDefinition = {
  id: 'repartition_devis_par_univers',
  label: 'Répartition Devis par Univers',
  description: 'Nombre de devis, montant HT et panier moyen par univers',
  category: 'devis',
  source: ['devis', 'projects'],
  dimensions: ['univers'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects } = data;
    const SENT_STATES = ['sent', 'accepted', 'validated', 'signed', 'order', 'invoice'];
    
    // Index projects
    const projectsById = new Map<string, any>();
    for (const p of projects || []) {
      projectsById.set(String(p.id), p);
    }
    
    const statsByUnivers: Record<string, { nbDevis: number; montantHT: number }> = {};
    
    for (const d of devis || []) {
      const dateStr = d.dateReelle || d.date || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr && params.dateRange) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      if (!SENT_STATES.includes(state)) continue;
      
      const projectId = String(d.projectId || d.data?.projectId || '');
      const project = projectsById.get(projectId);
      const univers = extractProjectUniverses(project);
      const montant = parseNumber(d.data?.totalHT ?? d.totalHT);
      const share = montant / univers.length;
      
      for (const u of univers) {
        if (!statsByUnivers[u]) statsByUnivers[u] = { nbDevis: 0, montantHT: 0 };
        statsByUnivers[u].nbDevis += 1 / univers.length;
        statsByUnivers[u].montantHT += share;
      }
    }
    
    const result: Record<string, { nbDevis: number; montantHT: number; panierMoyen: number }> = {};
    let totalHT = 0;
    
    for (const [univers, stats] of Object.entries(statsByUnivers)) {
      const nbDevis = Math.round(stats.nbDevis);
      result[univers] = {
        nbDevis,
        montantHT: Math.round(stats.montantHT * 100) / 100,
        panierMoyen: nbDevis > 0 ? Math.round((stats.montantHT / nbDevis) * 100) / 100 : 0,
      };
      totalHT += stats.montantHT;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'devis', recordCount: Object.keys(result).length },
      breakdown: { totalHT, nbUnivers: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Répartition devis par type d'apporteur =============

/**
 * Répartition des devis par type d'apporteur
 */
export const repartitionDevisParTypeApporteur: StatDefinition = {
  id: 'repartition_devis_par_type_apporteur',
  label: 'Répartition Devis par Type Apporteur',
  description: 'Nombre de devis, montant HT et panier moyen par type d\'apporteur',
  category: 'devis',
  source: ['devis', 'projects', 'clients'],
  dimensions: ['type_apporteur'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects, clients } = data;
    const SENT_STATES = ['sent', 'accepted', 'validated', 'signed', 'order', 'invoice'];
    
    // Index projects
    const projectsById = new Map<string, any>();
    for (const p of projects || []) {
      projectsById.set(String(p.id), p);
    }
    
    // Index clients for type
    const clientsById = new Map<string, { type: string }>();
    for (const c of clients || []) {
      const rawType = c.data?.type || c.data?.typeApporteur || c.data?.categorie || c.categorie || null;
      clientsById.set(String(c.id), { type: normalizeApporteurType(rawType) });
    }
    
    const statsByType: Record<string, { nbDevis: number; montantHT: number }> = {};
    
    for (const d of devis || []) {
      const dateStr = d.dateReelle || d.date || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr && params.dateRange) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      if (!SENT_STATES.includes(state)) continue;
      
      const projectId = String(d.projectId || d.data?.projectId || '');
      const project = projectsById.get(projectId);
      const cmdId = project?.data?.commanditaireId || project?.commanditaireId;
      const typeApporteur = cmdId ? (clientsById.get(String(cmdId))?.type || 'Clients Directs') : 'Clients Directs';
      
      const montant = parseNumber(d.data?.totalHT ?? d.totalHT);
      
      if (!statsByType[typeApporteur]) statsByType[typeApporteur] = { nbDevis: 0, montantHT: 0 };
      statsByType[typeApporteur].nbDevis++;
      statsByType[typeApporteur].montantHT += montant;
    }
    
    const result: Record<string, { nbDevis: number; montantHT: number; panierMoyen: number }> = {};
    let totalHT = 0;
    
    for (const [type, stats] of Object.entries(statsByType)) {
      result[type] = {
        nbDevis: stats.nbDevis,
        montantHT: Math.round(stats.montantHT * 100) / 100,
        panierMoyen: stats.nbDevis > 0 ? Math.round((stats.montantHT / stats.nbDevis) * 100) / 100 : 0,
      };
      totalHT += stats.montantHT;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'devis', recordCount: Object.keys(result).length },
      breakdown: { totalHT, nbTypes: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Délai émission devis après intervention =============

/**
 * Délai entre intervention (RDV/RT) et émission du devis
 * Mesure la réactivité commerciale
 */
export const delaiDevisApresIntervention: StatDefinition = {
  id: 'delai_devis_apres_intervention',
  label: 'Délai Devis après Intervention',
  description: 'Délai moyen entre le RDV/relevé technique et l\'émission du devis (en jours)',
  category: 'devis',
  source: ['devis', 'projects', 'interventions'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects, interventions } = data;
    const SENT_STATES = ['sent', 'accepted', 'validated', 'signed', 'order', 'invoice'];
    
    // Index projects
    const projectsById = new Map<string, any>();
    for (const p of projects || []) {
      projectsById.set(String(p.id), p);
    }
    
    // Trouver la première intervention (RT/RDV) par projet
    const firstInterventionByProject = new Map<string, Date>();
    for (const inter of interventions || []) {
      const projectId = String(inter.projectId || inter.data?.projectId || '');
      if (!projectId) continue;
      
      const dateStr = inter.dateReelle || inter.date || inter.data?.dateReelle || inter.data?.date;
      if (!dateStr) continue;
      const dateInter = new Date(dateStr);
      if (isNaN(dateInter.getTime())) continue;
      
      const existing = firstInterventionByProject.get(projectId);
      if (!existing || dateInter < existing) {
        firstInterventionByProject.set(projectId, dateInter);
      }
    }
    
    const delais: number[] = [];
    
    for (const d of devis || []) {
      const dateDevisStr = d.dateReelle || d.date || d.data?.dateReelle || d.data?.date || d.dateEnvoi || d.data?.dateEnvoi;
      if (!dateDevisStr) continue;
      const dateDevis = new Date(dateDevisStr);
      if (isNaN(dateDevis.getTime())) continue;
      
      // Filtre par période
      if (params.dateRange) {
        if (dateDevis < params.dateRange.start || dateDevis > params.dateRange.end) continue;
      }
      
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      if (!SENT_STATES.includes(state)) continue;
      
      const projectId = String(d.projectId || d.data?.projectId || '');
      const dateIntervention = firstInterventionByProject.get(projectId);
      if (!dateIntervention) continue;
      
      const delaiJours = (dateDevis.getTime() - dateIntervention.getTime()) / (1000 * 60 * 60 * 24);
      // Exclure les délais négatifs ou aberrants (> 180 jours)
      if (delaiJours >= 0 && delaiJours <= 180) {
        delais.push(delaiJours);
      }
    }
    
    if (delais.length === 0) {
      return {
        value: null,
        metadata: { computedAt: new Date(), source: 'devis', recordCount: 0 }
      };
    }
    
    const moyenne = delais.reduce((a, b) => a + b, 0) / delais.length;
    const sorted = [...delais].sort((a, b) => a - b);
    const mediane = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    return {
      value: Math.round(moyenne * 10) / 10,
      metadata: { computedAt: new Date(), source: 'devis', recordCount: delais.length },
      breakdown: {
        moyenne: Math.round(moyenne * 10) / 10,
        mediane: Math.round(mediane * 10) / 10,
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        nbDevisAnalyses: delais.length,
      }
    };
  }
};

// ============= METRIC: Délai moyen validation devis =============

/**
 * Délai moyen validation devis
 * Nombre de jours moyen entre l'émission (dateReelle) et la validation (dateStateCommande)
 * États validés : order, invoice (devis commandés/facturés)
 * Filtre période sur la date d'émission (dateReelle)
 */
export const delaiMoyenValidationDevis: StatDefinition = {
  id: 'delai_moyen_validation_devis',
  label: 'Délai moyen validation devis',
  description:
    "Nombre de jours moyen entre l'émission (dateReelle) et la validation (dateStateCommande) des devis",
  category: 'devis',
  source: ['devis'],
  unit: 'jours',
  dimensions: [],
  aggregation: 'avg',

  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;

    // États validés : order (commandé), invoice (facturé)
    const VALIDATED_STATES = ['order', 'invoice'];

    let sumDelais = 0;
    let count = 0;
    let minDelai: number | null = null;
    let maxDelai: number | null = null;

    for (const d of devis) {
      const state = String(d.state || '').toLowerCase();
      if (!VALIDATED_STATES.includes(state)) continue;

      // Date d'émission = dateReelle (champ principal GetDevis)
      const dateEmisStr: string | null = d.dateReelle || null;
      if (!dateEmisStr) continue;

      const dateEmis = new Date(dateEmisStr);
      if (isNaN(dateEmis.getTime())) continue;

      // Filtre période sur la date d'émission
      if (params.dateRange) {
        if (
          dateEmis < params.dateRange.start ||
          dateEmis > params.dateRange.end
        ) {
          continue;
        }
      }

      // Date de validation = dateStateCommande (présent dans GetDevis)
      const dateValStr: string | null = d.dateStateCommande || null;
      if (!dateValStr) continue;

      const dateVal = new Date(dateValStr);
      if (isNaN(dateVal.getTime())) continue;

      const diffMs = dateVal.getTime() - dateEmis.getTime();
      const delaiJours = diffMs / (1000 * 60 * 60 * 24);

      // On ignore les valeurs négatives (données incohérentes)
      if (delaiJours < 0) continue;

      sumDelais += delaiJours;
      count++;

      if (minDelai === null || delaiJours < minDelai) minDelai = delaiJours;
      if (maxDelai === null || delaiJours > maxDelai) maxDelai = delaiJours;
    }

    const delaiMoyen = count > 0 ? sumDelais / count : 0;
    const value = Math.round(delaiMoyen * 10) / 10;

    return {
      value,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: count,
      },
      breakdown: {
        devisPrisEnCompte: count,
        min: minDelai !== null ? Math.round(minDelai * 10) / 10 : null,
        max: maxDelai !== null ? Math.round(maxDelai * 10) / 10 : null,
      },
    };
  },
};

// ============= METRIC: CA Planifié (devis "to order" uniquement) =============

/**
 * CA Planifié — CA HT des dossiers planifiés
 * 
 * RÈGLE MÉTIER (figée) :
 * - Dossier planifié = au moins 1 intervention planifiée dans la période
 * - Devis comptabilisé = status === "to order" (équivalent accepté/commandé)
 * - CA HT = somme HT des devis "to order", 1 fois par dossier
 * - On ignore tous les autres devis (brouillon, refusé, annulé, etc.)
 */
export const caPlanifie: StatDefinition = {
  id: 'ca_planifie',
  label: 'CA Planifié',
  description: 'CA HT des dossiers avec intervention planifiée et devis accepté (to order)',
  category: 'devis',
  source: ['devis', 'interventions'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, interventions } = data;
    
    const dateMin = params.dateRange.start;
    const dateMax = params.dateRange.end;
    
    // Helper: parser une date avec fallbacks multiples
    const parseDate = (s?: string | null): Date | null => {
      if (!s) return null;
      const iso = s.includes(' ') ? s.replace(' ', 'T') : s;
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    
    // Helper: récupérer le projectId avec tous les alias possibles
    const getProjectId = (x: any): number | null => {
      const v = x?.projectId ?? x?.project_id ?? x?.refId ?? x?.ref_id ?? x?.dossierId ?? x?.dossier_id ?? x?.data?.projectId ?? null;
      return v == null ? null : Number(v);
    };
    
    // Helper: récupérer le montant HT
    const getHT = (d: any): number => {
      const raw = d?.data?.totalHT ?? d?.totalHT ?? d?.total_ht ?? 0;
      return typeof raw === 'string' ? parseFloat(raw.replace(',', '.')) || 0 : Number(raw) || 0;
    };
    
    // Helper: vérifier si le devis est accepté (to order)
    const isAcceptedDevis = (d: any): boolean => {
      const status = String(d?.status ?? d?.state ?? d?.statut ?? d?.data?.state ?? d?.data?.status ?? '').trim().toLowerCase();
      return [
        'to order', 'to_order', 'order',
        'accepted', 'signed', 'validated',
        'commande', 'commandé', 'à commander',
        'devis_accepte', 'devis_valide',
      ].includes(status);
    };
    
    // 1️⃣ Règle métier "mois dominant" : compter 100% du CA sur le mois
    //    qui contient le plus d'interventions (tie-break = premier mois chrono)
    
    // Phase A : grouper les interventions par (projectId, mois YYYY-MM)
    const itvCountByProjectMonth = new Map<number, Map<string, number>>();
    
    for (const itv of interventions ?? []) {
      const pid = getProjectId(itv);
      if (!pid) continue;
      
      const dateStr = itv.date ?? itv.start ?? itv.dateDebut ?? itv.dateReelle ?? itv.data?.date;
      const d = parseDate(dateStr);
      if (!d) continue;
      
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (!itvCountByProjectMonth.has(pid)) {
        itvCountByProjectMonth.set(pid, new Map());
      }
      const monthMap = itvCountByProjectMonth.get(pid)!;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    }
    
    // Phase B : pour chaque projet, déterminer le mois dominant
    // Phase C : ne retenir le projet que si son mois dominant est dans [dateMin, dateMax]
    const dateMinMonth = `${dateMin.getFullYear()}-${String(dateMin.getMonth() + 1).padStart(2, '0')}`;
    const dateMaxMonth = `${dateMax.getFullYear()}-${String(dateMax.getMonth() + 1).padStart(2, '0')}`;
    
    const plannedProjects = new Set<number>();
    
    for (const [pid, monthMap] of itvCountByProjectMonth) {
      let dominantMonth = '';
      let dominantCount = 0;
      
      for (const [month, count] of monthMap) {
        if (count > dominantCount || (count === dominantCount && month < dominantMonth)) {
          dominantMonth = month;
          dominantCount = count;
        }
      }
      
      // Ne retenir que si le mois dominant tombe dans la période demandée
      if (dominantMonth >= dateMinMonth && dominantMonth <= dateMaxMonth) {
        plannedProjects.add(pid);
      }
    }
    
    // 2️⃣ Récupérer les devis acceptés par dossier (1 seul devis max par dossier)
    const acceptedDevisByProject = new Map<number, any>();
    
    for (const dv of devis ?? []) {
      if (!isAcceptedDevis(dv)) continue;
      
      const pid = getProjectId(dv);
      if (!pid) continue;
      
      // 1 devis accepté max par dossier (logique "to order")
      acceptedDevisByProject.set(pid, dv);
    }
    
    // 3️⃣ Calculer le CA HT planifié
    let caHtTotal = 0;
    const details: Array<{ projectId: number; caHt: number }> = [];
    
    for (const projectId of plannedProjects) {
      const dv = acceptedDevisByProject.get(projectId);
      if (!dv) continue;
      
      const ht = getHT(dv);
      caHtTotal += ht;
      details.push({ projectId, caHt: ht });
    }
    
    details.sort((a, b) => b.caHt - a.caHt);
    
    logDebug('STATIA', 'caPlanifie - RESULT', {
      nbDossiersPlannifies: plannedProjects.size,
      nbDossiersAvecDevisAcceptes: details.length,
      caHtTotal: Math.round(caHtTotal * 100) / 100,
    });
    
    return {
      value: Math.round(caHtTotal * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: details.length,
      },
      breakdown: {
        nbDossiersPlannifies: plannedProjects.size,
        nbDossiersAvecDevisAcceptes: details.length,
        caHtTotal: Math.round(caHtTotal * 100) / 100,
        details: details.slice(0, 10), // Top 10 pour debug
      },
    };
  },
};

export const devisDefinitions = {
  taux_transformation_devis_nombre: tauxTransformationDevisNombre,
  taux_transformation_devis_montant: tauxTransformationDevisMontant,
  nombre_devis: nombreDevis,
  montant_devis: montantDevis,
  devis_signes_non_factures: devisSignesNonFactures,
  delai_moyen_validation_devis: delaiMoyenValidationDevis,
  repartition_devis_par_univers: repartitionDevisParUnivers,
  repartition_devis_par_type_apporteur: repartitionDevisParTypeApporteur,
  delai_devis_apres_intervention: delaiDevisApresIntervention,
  ca_planifie: caPlanifie,
};
