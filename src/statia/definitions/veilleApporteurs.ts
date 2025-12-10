/**
 * StatIA - Métriques de Veille Apporteurs
 * 
 * Trois métriques pour le radar apporteurs:
 * 1. apporteurs_dormants - Apporteurs sans projet depuis X jours
 * 2. apporteurs_en_declassement - Apporteurs avec CA en baisse période A vs B
 * 3. apporteurs_sous_seuil - Apporteurs sous seuil CA HT
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractFactureMeta, isFactureStateIncluded } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';

// ==================== TYPES ====================

export interface ApporteurDormant {
  apporteurId: string;
  apporteurNom: string;
  lastProjectDate: string | null;
  joursInactivite: number;
}

export interface ApporteurEnDeclassement {
  apporteurId: string;
  apporteurNom: string;
  CA_A_HT: number;
  CA_B_HT: number;
  variationPct: number | null;
  tag: 'en_declassement' | 'stable' | 'croissance' | 'nouveau';
}

export interface ApporteurSousSeuil {
  apporteurId: string;
  apporteurNom: string;
  CA_HT: number;
  seuilCA: number;
  niveauCriticite: 'critique' | 'attention' | 'ok';
}

// ==================== HELPERS ====================

/**
 * Mapping apporteurId → nom depuis la table clients
 * Seuls les clients avec commanditaire = true sont des apporteurs
 */
function mapApporteurs(clients: any[]): Map<string, string> {
  const map = new Map<string, string>();
  
  for (const c of clients) {
    // Vérifier que c'est bien un apporteur (commanditaire)
    const isCommanditaire = c.commanditaire === true || 
                            c.data?.commanditaire === true ||
                            c.isCommanditaire === true;
    
    // On inclut tous les clients qu'on retrouve comme commanditaireId
    // Car le flag commanditaire peut ne pas être fiable
    const id = String(c.id);
    const nom =
      c.displayName ||
      c.raisonSociale ||
      c.nom ||
      c.name ||
      c.label ||
      c.data?.nom ||
      c.data?.name ||
      c.data?.raisonSociale ||
      `Apporteur ${id}`;
    
    map.set(id, nom);
  }
  
  return map;
}

/**
 * Extraire les IDs des apporteurs utilisés dans les projets
 */
function extractUsedApporteurIds(projects: any[]): Set<string> {
  const ids = new Set<string>();
  for (const p of projects) {
    const cmdId = p.data?.commanditaireId || p.commanditaireId;
    if (cmdId) {
      ids.add(String(cmdId));
    }
  }
  return ids;
}

// ==================== MÉTRIQUE 1: APPORTEURS DORMANTS ====================

export const apporteursDormants: StatDefinition = {
  id: 'apporteurs_dormants',
  label: 'Apporteurs dormants',
  description: 'Apporteurs sans nouveau projet depuis X jours (seuil configurable)',
  category: 'apporteur',
  source: ['projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    
    const apporteursById = mapApporteurs(clients);
    const usedApporteurIds = extractUsedApporteurIds(projects);
    
    // Map: apporteurId -> { lastDate, nom }
    const lastActivityByApporteur = new Map<string, { date: Date | null; nom: string }>();
    
    // Initialiser tous les apporteurs utilisés
    for (const apporteurId of usedApporteurIds) {
      const nom = apporteursById.get(apporteurId) || `Apporteur ${apporteurId}`;
      lastActivityByApporteur.set(apporteurId, { date: null, nom });
    }
    
    // Trouver la dernière date de projet pour chaque apporteur
    for (const project of projects) {
      const apporteurId = project.data?.commanditaireId || project.commanditaireId;
      if (!apporteurId) continue;
      
      const idStr = String(apporteurId);
      const dateStr = project.created_at || project.date;
      if (!dateStr) continue;
      
      try {
        const date = new Date(dateStr);
        const current = lastActivityByApporteur.get(idStr);
        
        if (current && (!current.date || date > current.date)) {
          current.date = date;
        }
      } catch {
        continue;
      }
    }
    
    // Seuil d'inactivité (par défaut 30 jours)
    const seuilInactivite = params.filters?.seuilJours ?? 30;
    const now = new Date();
    
    const dormants: ApporteurDormant[] = [];
    
    lastActivityByApporteur.forEach((data, apporteurId) => {
      const joursInactivite = data.date 
        ? Math.floor((now.getTime() - data.date.getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Jamais eu de projet
      
      if (joursInactivite > seuilInactivite) {
        dormants.push({
          apporteurId,
          apporteurNom: data.nom,
          lastProjectDate: data.date?.toISOString().split('T')[0] || null,
          joursInactivite,
        });
      }
    });
    
    // Trier par jours d'inactivité décroissants
    dormants.sort((a, b) => b.joursInactivite - a.joursInactivite);
    
    return {
      value: dormants.length,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: dormants.length,
      },
      breakdown: {
        seuilInactivite,
        liste: dormants,
        totalApporteurs: lastActivityByApporteur.size,
        totalActifs: lastActivityByApporteur.size - dormants.length,
      }
    };
  }
};

// ==================== MÉTRIQUE 2: APPORTEURS EN DECLASSEMENT ====================

export const apporteursEnDeclassement: StatDefinition = {
  id: 'apporteurs_en_declassement',
  label: 'Apporteurs en déclassement',
  description: 'Apporteurs avec CA en baisse entre période A et période B',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'count',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const apporteursById = mapApporteurs(clients);
    
    // Périodes depuis les filtres (custom) ou dateRange (défaut)
    // Période A: dateRange principal
    // Période B: filters.periodeB ou 30 jours avant période A
    const periodeA = {
      start: params.dateRange.start,
      end: params.dateRange.end,
    };
    
    // Calculer la durée de période A
    const dureePeriodeA = Math.ceil((periodeA.end.getTime() - periodeA.start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Période B: juste avant période A, même durée
    const periodeB = {
      start: new Date(periodeA.start.getTime() - dureePeriodeA * 24 * 60 * 60 * 1000),
      end: new Date(periodeA.start.getTime() - 1), // Jour avant le début de A
    };
    
    // Override si fourni dans les filtres
    if ((params.filters as any)?.periodeBStart && (params.filters as any)?.periodeBEnd) {
      periodeB.start = new Date((params.filters as any).periodeBStart);
      periodeB.end = new Date((params.filters as any).periodeBEnd);
    }
    
    // CA par apporteur pour chaque période
    const caByApporteurA = new Map<string, { ca: number; nom: string }>();
    const caByApporteurB = new Map<string, { ca: number; nom: string }>();
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      
      if (!apporteurId) continue;
      
      const idStr = String(apporteurId);
      const nom = apporteursById.get(idStr) || `Apporteur ${apporteurId}`;
      
      // Période A
      if (date >= periodeA.start && date <= periodeA.end) {
        const current = caByApporteurA.get(idStr) || { ca: 0, nom };
        current.ca += meta.montantNetHT;
        caByApporteurA.set(idStr, current);
      }
      
      // Période B
      if (date >= periodeB.start && date <= periodeB.end) {
        const current = caByApporteurB.get(idStr) || { ca: 0, nom };
        current.ca += meta.montantNetHT;
        caByApporteurB.set(idStr, current);
      }
    }
    
    // Fusionner et calculer les variations
    const allApporteurIds = new Set([...caByApporteurA.keys(), ...caByApporteurB.keys()]);
    const resultats: ApporteurEnDeclassement[] = [];
    let enDeclassementCount = 0;
    
    for (const apporteurId of allApporteurIds) {
      const dataA = caByApporteurA.get(apporteurId);
      const dataB = caByApporteurB.get(apporteurId);
      
      const CA_A_HT = dataA?.ca ?? 0;
      const CA_B_HT = dataB?.ca ?? 0;
      const nom = dataA?.nom || dataB?.nom || `Apporteur ${apporteurId}`;
      
      let variationPct: number | null = null;
      let tag: ApporteurEnDeclassement['tag'] = 'stable';
      
      if (CA_B_HT === 0 && CA_A_HT > 0) {
        tag = 'nouveau';
        variationPct = null; // N/A pour les nouveaux
      } else if (CA_B_HT > 0) {
        variationPct = ((CA_A_HT - CA_B_HT) / CA_B_HT) * 100;
        
        if (variationPct < -5) {
          tag = 'en_declassement';
          enDeclassementCount++;
        } else if (variationPct > 5) {
          tag = 'croissance';
        } else {
          tag = 'stable';
        }
      }
      
      resultats.push({
        apporteurId,
        apporteurNom: nom,
        CA_A_HT,
        CA_B_HT,
        variationPct,
        tag,
      });
    }
    
    // Trier par variation croissante (les plus en déclin en premier)
    resultats.sort((a, b) => {
      if (a.variationPct === null) return 1;
      if (b.variationPct === null) return -1;
      return a.variationPct - b.variationPct;
    });
    
    return {
      value: enDeclassementCount,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: resultats.length,
      },
      breakdown: {
        liste: resultats,
        periodeA: { start: periodeA.start.toISOString(), end: periodeA.end.toISOString() },
        periodeB: { start: periodeB.start.toISOString(), end: periodeB.end.toISOString() },
        totalApporteurs: resultats.length,
        enDeclassement: enDeclassementCount,
        stables: resultats.filter(r => r.tag === 'stable').length,
        enCroissance: resultats.filter(r => r.tag === 'croissance').length,
        nouveaux: resultats.filter(r => r.tag === 'nouveau').length,
      }
    };
  }
};

// ==================== MÉTRIQUE 3: APPORTEURS SOUS SEUIL ====================

export const apporteursSousSeuil: StatDefinition = {
  id: 'apporteurs_sous_seuil',
  label: 'Apporteurs sous seuil CA',
  description: 'Apporteurs avec CA HT inférieur au seuil configuré',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'count',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const apporteursById = mapApporteurs(clients);
    
    // Seuil CA HT (défaut 5000€)
    const seuilCA = (params.filters as any)?.seuilCA ?? 5000;
    
    // CA par apporteur sur la période
    const caByApporteur = new Map<string, { ca: number; nom: string }>();
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      
      if (!apporteurId) continue;
      
      const idStr = String(apporteurId);
      const nom = apporteursById.get(idStr) || `Apporteur ${apporteurId}`;
      
      const current = caByApporteur.get(idStr) || { ca: 0, nom };
      current.ca += meta.montantNetHT;
      caByApporteur.set(idStr, current);
    }
    
    // Identifier ceux sous seuil
    const sousSeuil: ApporteurSousSeuil[] = [];
    let sousSeuilCount = 0;
    
    // Seuils de criticité
    const seuilCritique = seuilCA * 0.3; // < 30% du seuil = critique
    const seuilAttention = seuilCA * 0.7; // < 70% du seuil = attention
    
    caByApporteur.forEach((data, apporteurId) => {
      if (data.ca < seuilCA) {
        let niveauCriticite: ApporteurSousSeuil['niveauCriticite'] = 'ok';
        
        if (data.ca < seuilCritique) {
          niveauCriticite = 'critique';
        } else if (data.ca < seuilAttention) {
          niveauCriticite = 'attention';
        }
        
        sousSeuil.push({
          apporteurId,
          apporteurNom: data.nom,
          CA_HT: data.ca,
          seuilCA,
          niveauCriticite,
        });
        sousSeuilCount++;
      }
    });
    
    // Trier par CA croissant (les plus bas en premier)
    sousSeuil.sort((a, b) => a.CA_HT - b.CA_HT);
    
    return {
      value: sousSeuilCount,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: sousSeuil.length,
      },
      breakdown: {
        liste: sousSeuil,
        seuilCA,
        totalApporteurs: caByApporteur.size,
        sousSeuil: sousSeuilCount,
        critiques: sousSeuil.filter(a => a.niveauCriticite === 'critique').length,
        attention: sousSeuil.filter(a => a.niveauCriticite === 'attention').length,
      }
    };
  }
};

// ==================== EXPORTS ====================

export const veilleApporteursDefinitions = {
  apporteurs_dormants: apporteursDormants,
  apporteurs_en_declassement: apporteursEnDeclassement,
  apporteurs_sous_seuil: apporteursSousSeuil,
};
