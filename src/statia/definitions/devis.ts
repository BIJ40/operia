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

// ============= METRIC: Délai moyen d'acceptation =============

/**
 * Délai moyen entre émission et validation du devis
 * Pour chaque devis validé/accepté : délai = date_validation - date_émission
 * États validés : accepted, validated, signed, order, invoice
 * Date émission : date ou dateReelle (champ Apogée principal)
 * Date validation : dateValidation ou dateAcceptation ou dateSignature
 */
export const delaiMoyenAcceptationDevis: StatDefinition = {
  id: 'delai_moyen_acceptation_devis',
  label: 'Délai Moyen Validation Devis',
  description: 'Nombre de jours moyen entre émission et validation du devis',
  category: 'devis',
  source: 'devis',
  aggregation: 'avg',
  unit: 'jours',
  dimensions: [],
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    // États considérés comme "validés/acceptés"
    const VALIDATED_STATES = ['accepted', 'validated', 'signed', 'order', 'invoice'];

    let sumDelais = 0;
    let count = 0;
    let minDelai: number | null = null;
    let maxDelai: number | null = null;

    for (const d of devis || []) {
      // 1) Vérifier l'état du devis (doit être validé)
      const state = String(d.state || d.statut || d.data?.state || '').toLowerCase();
      if (!VALIDATED_STATES.includes(state)) continue;

      // 2) Date d'émission (date principale Apogée)
      const dateEmisStr = d.date || d.dateReelle || d.data?.date || d.data?.dateReelle || d.created_at;
      if (!dateEmisStr) continue;

      const dateEmis = new Date(dateEmisStr);
      if (isNaN(dateEmis.getTime())) continue;

      // 3) Filtre période sur date d'émission
      if (params.dateRange) {
        if (dateEmis < params.dateRange.start || dateEmis > params.dateRange.end) {
          continue;
        }
      }

      // 4) Date de validation/acceptation
      // Essayer plusieurs champs possibles dans l'ordre de priorité
      const dateValStr =
        d.dateValidation ||
        d.data?.dateValidation ||
        d.dateAcceptation ||
        d.data?.dateAcceptation ||
        d.dateSignature ||
        d.data?.dateSignature ||
        d.dateSigned ||
        d.data?.dateSigned;

      // Si pas de date de validation explicite, on ne peut pas calculer le délai
      if (!dateValStr) continue;

      const dateVal = new Date(dateValStr);
      if (isNaN(dateVal.getTime())) continue;

      // 5) Calcul du délai en jours
      const diffMs = dateVal.getTime() - dateEmis.getTime();
      const delaiJours = diffMs / (1000 * 60 * 60 * 24);

      // Ignorer les délais négatifs (incohérence de données)
      if (delaiJours < 0) continue;
      
      // Ignorer les délais > 365 jours (probablement erreur de données)
      if (delaiJours > 365) continue;

      sumDelais += delaiJours;
      count++;

      if (minDelai === null || delaiJours < minDelai) minDelai = delaiJours;
      if (maxDelai === null || delaiJours > maxDelai) maxDelai = delaiJours;
    }

    const delaiMoyen = count > 0 ? sumDelais / count : 0;

    logDebug('STATIA', 'delaiMoyenAcceptationDevis - RESULT', {
      count,
      delaiMoyen: Math.round(delaiMoyen * 10) / 10,
      minDelai,
      maxDelai,
    });

    return {
      value: Math.round(delaiMoyen * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: count,
      },
      breakdown: {
        nbDevisAnalyses: count,
        min: minDelai !== null ? Math.round(minDelai * 10) / 10 : null,
        max: maxDelai !== null ? Math.round(maxDelai * 10) / 10 : null,
      },
    };
  },
};

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
 * Pour chaque devis validé : délai = date_validation - date_émission
 * Filtre période sur la date d'émission du devis
 */
export const delaiMoyenValidationDevis: StatDefinition = {
  id: 'delai_moyen_validation_devis',
  label: 'Délai moyen validation devis',
  description:
    "Nombre de jours moyen entre l'émission et la validation des devis",
  category: 'devis',
  source: 'devis',
  unit: 'jours',
  dimensions: [],
  aggregation: 'avg',

  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    const VALIDATED_STATES = ['validated', 'signed', 'order'];

    let sumDelais = 0;
    let count = 0;
    let minDelai: number | null = null;
    let maxDelai: number | null = null;

    for (const d of devis) {
      const state = String(d.state || '').toLowerCase();
      if (!VALIDATED_STATES.includes(state)) continue;

      // Date d'émission
      const dateEmisStr =
        d.dateEnvoi ||
        d.dateReelle ||
        d.date ||
        d.created_at;

      if (!dateEmisStr) continue;
      const dateEmis = new Date(dateEmisStr);
      if (isNaN(dateEmis.getTime())) continue;

      // Filtre période sur date d'émission
      if (params.dateRange) {
        if (
          dateEmis < params.dateRange.start ||
          dateEmis > params.dateRange.end
        ) {
          continue;
        }
      }

      // Date de validation
      const dateValStr =
        d.data?.dateValidation ||
        d.dateValidation ||
        d.data?.dateAcceptation ||
        d.updated_at;

      if (!dateValStr) continue;
      const dateVal = new Date(dateValStr);
      if (isNaN(dateVal.getTime())) continue;

      const diffMs = dateVal.getTime() - dateEmis.getTime();
      const delaiJours = diffMs / (1000 * 60 * 60 * 24);

      // On ignore les valeurs négatives
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

export const devisDefinitions = {
  taux_transformation_devis_nombre: tauxTransformationDevisNombre,
  taux_transformation_devis_montant: tauxTransformationDevisMontant,
  nombre_devis: nombreDevis,
  montant_devis: montantDevis,
  devis_signes_non_factures: devisSignesNonFactures,
  delai_moyen_acceptation_devis: delaiMoyenAcceptationDevis,
  delai_moyen_validation_devis: delaiMoyenValidationDevis,
  repartition_devis_par_univers: repartitionDevisParUnivers,
  repartition_devis_par_type_apporteur: repartitionDevisParTypeApporteur,
  delai_devis_apres_intervention: delaiDevisApresIntervention,
};
