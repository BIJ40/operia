/**
 * Veille Apporteurs Engine
 * Service de consolidation qui fusionne les 3 métriques de veille
 */

import { LoadedData, StatParams } from '../definitions/types';
import { 
  apporteursDormants, 
  apporteursEnDeclassement, 
  apporteursSousSeuil,
  ApporteurDormant,
  ApporteurEnDeclassement,
  ApporteurSousSeuil
} from '../definitions/veilleApporteurs';

// ==================== TYPES ====================

export interface VeilleApporteurConsolide {
  apporteurId: string;
  apporteurNom: string;
  // Dormant
  lastProjectDate: string | null;
  joursInactivite: number;
  // Déclassement
  CA_A_HT: number;
  CA_B_HT: number;
  variationPct: number | null;
  // Sous seuil
  CA_HT: number;
  seuilCA: number;
  niveauCriticite: 'critique' | 'attention' | 'ok';
  // Flags consolidés
  isDormant: boolean;
  isEnDeclassement: boolean;
  isSousSeuil: boolean;
  isNouveau: boolean;
  // Score de risque (0-100)
  scoreRisque: number;
}

export interface VeilleApporteursParams {
  periodeAStart: Date;
  periodeAEnd: Date;
  periodeBStart?: Date;
  periodeBEnd?: Date;
  seuilInactivite: number; // jours
  seuilCA: number; // €
}

export interface VeilleApporteursResult {
  apporteurs: VeilleApporteurConsolide[];
  kpis: {
    totalActifs: number;
    dormants: number;
    enDeclassement: number;
    sousSeuil: number;
    nouveaux: number;
    sains: number; // Aucun flag
  };
  periodes: {
    A: { start: string; end: string };
    B: { start: string; end: string };
  };
  seuils: {
    inactivite: number;
    CA: number;
  };
}

// ==================== ENGINE ====================

/**
 * Calcule le score de risque d'un apporteur (0-100)
 */
function calculateScoreRisque(apporteur: {
  isDormant: boolean;
  isEnDeclassement: boolean;
  isSousSeuil: boolean;
  joursInactivite: number;
  variationPct: number | null;
  niveauCriticite: string;
}): number {
  let score = 0;
  
  // Dormant: +30 points de base, +1 point par tranche de 10 jours au-delà de 30
  if (apporteur.isDormant) {
    score += 30;
    score += Math.min(20, Math.floor((apporteur.joursInactivite - 30) / 10));
  }
  
  // Déclassement: points selon variation
  if (apporteur.isEnDeclassement && apporteur.variationPct !== null) {
    const variationAbs = Math.abs(apporteur.variationPct);
    score += Math.min(30, variationAbs / 2); // Max 30 points
  }
  
  // Sous seuil: points selon criticité
  if (apporteur.isSousSeuil) {
    if (apporteur.niveauCriticite === 'critique') {
      score += 25;
    } else if (apporteur.niveauCriticite === 'attention') {
      score += 15;
    }
  }
  
  return Math.min(100, Math.round(score));
}

/**
 * Service principal de veille apporteurs
 */
export function computeVeilleApporteurs(
  data: LoadedData,
  veilleParams: VeilleApporteursParams
): VeilleApporteursResult {
  // Construire les params StatIA pour chaque métrique
  const baseParams: StatParams = {
    dateRange: {
      start: veilleParams.periodeAStart,
      end: veilleParams.periodeAEnd,
    },
    filters: {
      seuilJours: veilleParams.seuilInactivite,
    } as any,
  };
  
  // Ajouter les filtres spécifiques
  const declassementParams: StatParams = {
    ...baseParams,
    filters: {
      ...baseParams.filters,
      periodeBStart: veilleParams.periodeBStart?.toISOString(),
      periodeBEnd: veilleParams.periodeBEnd?.toISOString(),
    } as any,
  };
  
  const sousSeuilParams: StatParams = {
    ...baseParams,
    filters: {
      ...baseParams.filters,
      seuilCA: veilleParams.seuilCA,
    } as any,
  };
  
  // Exécuter les 3 métriques
  const dormantResult = apporteursDormants.compute(data, baseParams);
  const declassementResult = apporteursEnDeclassement.compute(data, declassementParams);
  const sousSeuilResult = apporteursSousSeuil.compute(data, sousSeuilParams);
  
  // Extraire les listes
  const dormantsList: ApporteurDormant[] = dormantResult.breakdown?.liste || [];
  const declassementList: ApporteurEnDeclassement[] = declassementResult.breakdown?.liste || [];
  const sousSeuilList: ApporteurSousSeuil[] = sousSeuilResult.breakdown?.liste || [];
  
  // Créer des maps pour fusion rapide
  const dormantMap = new Map<string, ApporteurDormant>();
  for (const d of dormantsList) {
    dormantMap.set(d.apporteurId, d);
  }
  
  const declassementMap = new Map<string, ApporteurEnDeclassement>();
  for (const d of declassementList) {
    declassementMap.set(d.apporteurId, d);
  }
  
  const sousSeuilMap = new Map<string, ApporteurSousSeuil>();
  for (const s of sousSeuilList) {
    sousSeuilMap.set(s.apporteurId, s);
  }
  
  // Fusionner par apporteurId
  const allApporteurIds = new Set<string>([
    ...dormantMap.keys(),
    ...declassementMap.keys(),
    ...sousSeuilMap.keys(),
  ]);
  
  const consolidated: VeilleApporteurConsolide[] = [];
  
  for (const apporteurId of allApporteurIds) {
    const dormant = dormantMap.get(apporteurId);
    const declassement = declassementMap.get(apporteurId);
    const sousSeuil = sousSeuilMap.get(apporteurId);
    
    // Nom depuis n'importe quelle source
    const apporteurNom = dormant?.apporteurNom || 
                         declassement?.apporteurNom || 
                         sousSeuil?.apporteurNom || 
                         `Apporteur ${apporteurId}`;
    
    const isDormant = dormantMap.has(apporteurId);
    const isEnDeclassement = declassement?.tag === 'en_declassement';
    const isSousSeuil = sousSeuilMap.has(apporteurId);
    const isNouveau = declassement?.tag === 'nouveau';
    
    const entry: VeilleApporteurConsolide = {
      apporteurId,
      apporteurNom,
      // Dormant
      lastProjectDate: dormant?.lastProjectDate || null,
      joursInactivite: dormant?.joursInactivite ?? 0,
      // Déclassement
      CA_A_HT: declassement?.CA_A_HT ?? 0,
      CA_B_HT: declassement?.CA_B_HT ?? 0,
      variationPct: declassement?.variationPct ?? null,
      // Sous seuil - utiliser CA_A_HT pour cohérence
      CA_HT: declassement?.CA_A_HT ?? sousSeuil?.CA_HT ?? 0,
      seuilCA: veilleParams.seuilCA,
      niveauCriticite: sousSeuil?.niveauCriticite ?? 'ok',
      // Flags
      isDormant,
      isEnDeclassement,
      isSousSeuil,
      isNouveau,
      // Score
      scoreRisque: 0,
    };
    
    // Calculer le score de risque
    entry.scoreRisque = calculateScoreRisque(entry);
    
    consolidated.push(entry);
  }
  
  // Trier par score de risque décroissant
  consolidated.sort((a, b) => b.scoreRisque - a.scoreRisque);
  
  // Calculer les KPIs
  const kpis = {
    totalActifs: consolidated.length,
    dormants: consolidated.filter(a => a.isDormant).length,
    enDeclassement: consolidated.filter(a => a.isEnDeclassement).length,
    sousSeuil: consolidated.filter(a => a.isSousSeuil).length,
    nouveaux: consolidated.filter(a => a.isNouveau).length,
    sains: consolidated.filter(a => !a.isDormant && !a.isEnDeclassement && !a.isSousSeuil).length,
  };
  
  // Récupérer les périodes depuis les résultats
  const periodesFromResult = declassementResult.breakdown as any;
  
  return {
    apporteurs: consolidated,
    kpis,
    periodes: {
      A: periodesFromResult?.periodeA || {
        start: veilleParams.periodeAStart.toISOString(),
        end: veilleParams.periodeAEnd.toISOString(),
      },
      B: periodesFromResult?.periodeB || {
        start: veilleParams.periodeBStart?.toISOString() || '',
        end: veilleParams.periodeBEnd?.toISOString() || '',
      },
    },
    seuils: {
      inactivite: veilleParams.seuilInactivite,
      CA: veilleParams.seuilCA,
    },
  };
}
