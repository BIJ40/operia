// ==============================================
// STATiA-BY-BIJ - RULES ENGINE v1.0
// Export centralisé des règles métier HelpConfort
// ==============================================

// Re-export depuis domain/rules.ts pour compatibilité
export { STATIA_RULES, type StatiaRules } from '../domain/rules';

// ============================================
// RÈGLES JSON SÉRIALISABLES (pour backend/IA)
// ============================================

export const STATIA_RULES_JSON = {
  project: {
    statusComptableSource: "apiGetProjects.state",
    interventionNeverDefinesAccounting: true
  },
  CA: {
    source: "apiGetFactures.data.totalHT",
    includeStates: ["sent", "paid", "partial", "partially_paid", "overdue", "validee", "validated", "payee", "cloturee", "closed", "invoice_sent", "invoice", "pending"],
    excludeStates: ["draft", "brouillon", "cancelled", "canceled", "annulee", "annulée", "pro_forma", "proforma", "pro-forma"],
    avoir: "subtract",
    duClientSource: "apiGetFactures.data.calcReglementsReste"
  },
  technicians: {
    productiveTypes: ["depannage", "repair", "travaux", "work"],
    nonProductiveTypes: ["RT", "rdv", "rdvtech", "sav", "diagnostic", "TH"],
    timeAllocation: "prorata_duree_visites_validees",
    timeSourceField: "interventions.visites[].duree",
    RT_generates_NO_CA: true,
    // Règles d'identification des techniciens
    identification: {
      rules: [
        "user.isTechnicien === true",
        "user.type === 'technicien'",
        "(user.type === 'utilisateur' && user.data.universes.length > 0)"
      ],
      activeCheck: "user.is_on === true || user.isActive === true"
    },
    // Règles d'exclusion des interventions
    exclusions: {
      RT: {
        conditions: [
          "intervention.data?.biRt?.isValidated === true",
          "intervention.data?.type2 === 'RT'",
          "intervention.type2?.toUpperCase() === 'RT'"
        ]
      },
      SAV: {
        conditions: [
          "type2.toLowerCase().includes('sav')",
          "type.toLowerCase().includes('sav')"
        ]
      }
    },
    // Règles d'inclusion (types productifs)
    productiveCheck: {
      condition: "intervention.data?.biDepan || intervention.data?.biTvx",
      description: "Seules les interventions avec biDepan ou biTvx sont productives"
    },
    // Visites
    visites: {
      validState: "validated",
      minDuree: 1,
      technicienSource: "visite.usersIds"
    },
    // Répartition CA
    caAllocation: {
      method: "prorata_temps",
      formula: "caTech = caFactureHT * (dureeTech / dureeTotaleProjet)",
      multiUnivers: "uniform_distribution"
    }
  },
  devis: {
    transformation: {
      ratioNumber: "count(devis_ayant_facture(projectId)) / total_devis_envoyes",
      ratioMontant: "sum(montant_facturé) / sum(montant_devisé)"
    },
    diagnosticResolution: {
      type2_A_DEFINIR: {
        rule: "chooseValidated",
        logic: [
          { path: "biDepan.items.isValidated", type: "depannage" },
          { path: "biTvx.items.isValidated", type: "travaux" },
          { path: "biRt.items.isValidated", type: "rt" }
        ]
      }
    }
  },
  interventions: {
    determineRealType: "diagnosticResolution",
    validStates: ["validated", "done", "finished"],
    excludeStates: ["draft", "canceled", "refused"]
  },
  apporteurs: {
    source: "apiGetProjects.commanditaireId",
    excludeSAV: true,
    CA: "sum(factures.totalHT where commanditaireId = X)"
  },
  univers: {
    source: "apiGetProjects.universes",
    fallbackSources: ["apiGetProjects.data.univers", "apiGetProjects.univers"],
    multiUniverseAllocation: "uniform_distribution",
    normalization: {
      "amelioration_logement": "pmr",
      "amelioration-logement": "pmr",
      "ame_logement": "pmr",
      "volets": "volet_roulant",
      "volet": "volet_roulant"
    },
    excludedUniverses: ["mobilier", "travaux_xterieurs", "travaux_exterieurs"],
    defaultIfEmpty: "ignore_facture"
  },
  sav: {
    identification: "linked_dossier",
    caImpact: 0,
    technicianStatsImpact: false,
    costCalculation: ["temps_passe", "nb_visites", "pourcentage_facture_parent"]
  },
  dates: {
    use: "depends_on_metric",
    factures: "dateReelle",
    interventions: "dateReelle",
    projects: "date"
  },
  groupBy: [
    "technicien",
    "apporteur",
    "univers",
    "type_intervention",
    "type_devis",
    "mois",
    "semaine",
    "annee",
    "ville",
    "client",
    "dossier"
  ],
  aggregations: ["sum", "count", "avg", "min", "max", "median", "ratio"],
  errors: {
    interventionWithoutProject: "error_intervention_without_project",
    projectWithoutApporteur: "assign_inconnu",
    factureWithoutHT: "compute_from_TTC"
  },
  synonyms: {
    apporteur: ["commanditaire", "prescripteur"],
    univers: ["metier", "domaine"],
    rt: ["releve technique", "rdv technique"],
    sav: ["service apres vente", "garantie", "retour chantier"],
    travaux: ["tvx", "work", "reparation"],
    technicien: ["intervenant", "ouvrier"]
  },
  nlp: {
    par: "groupBy",
    sur_la_periode: "date between {{date_from}} and {{date_to}}"
  }
};

// ============================================
// HELPERS POUR L'APPLICATION DES RÈGLES
// ============================================

/**
 * Résout le type réel d'une intervention "A DEFINIR"
 */
export function resolveInterventionType(intervention: any): string {
  const type2 = intervention.type2 || intervention.data?.type2;
  
  // Si type2 n'est pas "A DEFINIR", retourner tel quel
  if (type2 && type2.toUpperCase() !== 'A DEFINIR') {
    return type2;
  }
  
  // Appliquer la règle de résolution diagnostique
  const logic = STATIA_RULES_JSON.devis.diagnosticResolution.type2_A_DEFINIR.logic;
  
  for (const check of logic) {
    const pathParts = check.path.split('.');
    let value = intervention;
    
    for (const part of pathParts) {
      value = value?.[part];
    }
    
    if (value === true) {
      return check.type;
    }
  }
  
  return 'non_defini';
}

/**
 * Vérifie si une intervention est productive (génère du CA)
 */
export function isProductiveIntervention(intervention: any): boolean {
  const type = resolveInterventionType(intervention);
  const typeLower = type.toLowerCase();
  
  return STATIA_RULES_JSON.technicians.productiveTypes.some(
    t => typeLower.includes(t.toLowerCase())
  );
}

/**
 * Vérifie si une intervention est SAV
 * RÈGLE MÉTIER STRICTE: type2 === "SAV" (égalité exacte) au niveau intervention OU visite OU picto SAV
 */
export function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.data?.type2 || intervention.type2 || '').toLowerCase().trim();
  if (type2 === 'sav') return true;
  
  // Vérifier les visites
  const visites = intervention.data?.visites || intervention.visites || [];
  if (Array.isArray(visites)) {
    const hasSAVVisite = visites.some((visite: any) => {
      const visiteType2 = (visite.type2 || visite.data?.type2 || '').toLowerCase().trim();
      return visiteType2 === 'sav';
    });
    if (hasSAVVisite) return true;
  }
  
  const pictos = intervention.data?.pictosInterv || [];
  if (Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().trim() === 'sav')) {
    return true;
  }
  return false;
}

/**
 * Retourne le champ date approprié selon la source
 */
export function getDateField(source: string): string {
  const dateMapping = STATIA_RULES_JSON.dates as Record<string, string>;
  return dateMapping[source] || 'date';
}

/**
 * Normalise les synonymes NLP vers les termes canoniques
 */
export function normalizeSynonym(term: string): string {
  const termLower = term.toLowerCase().trim();
  
  for (const [canonical, synonyms] of Object.entries(STATIA_RULES_JSON.synonyms)) {
    if (termLower === canonical) return canonical;
    if (synonyms.some(s => termLower.includes(s.toLowerCase()))) {
      return canonical;
    }
  }
  
  return term;
}

/**
 * Parse une requête NLP et extrait les dimensions groupBy
 */
export function parseNLPGroupBy(query: string): string[] {
  const dimensions: string[] = [];
  const queryLower = query.toLowerCase();
  
  // Détecter "par X" patterns
  const parMatches = queryLower.matchAll(/par\s+(\w+)/g);
  for (const match of parMatches) {
    const term = normalizeSynonym(match[1]);
    if (STATIA_RULES_JSON.groupBy.includes(term)) {
      dimensions.push(term);
    }
  }
  
  return dimensions;
}

// ============================================
// HELPER CENTRALISÉ EXTRACTION FACTURE
// Source de vérité unique pour tous les calculs CA
// ============================================

export interface FactureMeta {
  date: Date | null;
  dateStr: string | null;
  typeFacture: string;
  isAvoir: boolean;
  montantBrutHT: number; // valeur absolue
  montantNetHT: number;  // signé (facture + / avoir -)
}

/**
 * Extrait les métadonnées d'une facture de façon unifiée
 * RÈGLES APPLIQUÉES :
 * - Date : dateReelle > date > dateEmission > created_at
 * - Type : typeFacture > type > data.type > state
 * - Montant : data.totalHT > totalHT > montantHT
 * - Avoir : montant négatif si type === "avoir"
 */
export function extractFactureMeta(facture: any): FactureMeta {
  // Date unifiée avec priorité STATIA_RULES (AJOUT de "date" en 2ème position)
  const dateStr = facture.dateReelle 
    || facture.date 
    || facture.dateEmission 
    || facture.created_at 
    || facture.data?.dateReelle 
    || facture.data?.date
    || facture.data?.dateEmission 
    || null;
  
  let date: Date | null = null;
  if (dateStr) {
    // Essayer d'abord le format ISO
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      date = d;
    } else {
      // CRITICAL FIX: Parser le format français DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss
      const dateOnlyStr = String(dateStr).split(' ')[0]; // Prendre juste la partie date
      const parts = dateOnlyStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const frDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(frDate.getTime())) date = frDate;
      }
    }
  }
  
  // Type facture unifié avec ordre de priorité cohérent
  const typeFactureRaw = facture.typeFacture || facture.type || facture.data?.type || facture.state || "";
  const typeFacture = String(typeFactureRaw).toLowerCase();
  const isAvoir = typeFacture === "avoir";
  
  // Montant unifié : data.totalHT > totalHT > montantHT
  const montantRaw = facture.data?.totalHT ?? facture.totalHT ?? facture.montantHT ?? 0;
  const montantBrut = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
  
  const montantBrutHT = Math.abs(montantBrut);
  const montantNetHT = isAvoir ? -montantBrutHT : montantBrutHT;
  
  return { date, dateStr, typeFacture, isAvoir, montantBrutHT, montantNetHT };
}

/**
 * Vérifie si un état de facture est inclus dans le CA
 */
export function isFactureStateIncluded(state: string): boolean {
  return STATIA_RULES_JSON.CA.includeStates.includes(state.toLowerCase());
}

/**
 * Retourne la configuration de groupBy pour un champ
 */
export function getGroupByConfig(dimension: string): { field: string; source: string } | null {
  const mappings: Record<string, { field: string; source: string }> = {
    technicien: { field: 'userId', source: 'interventions' },
    apporteur: { field: 'data.commanditaireId', source: 'projects' },
    univers: { field: 'data.universes', source: 'projects' },
    type_intervention: { field: 'type', source: 'interventions' },
    type_devis: { field: 'state', source: 'devis' },
    mois: { field: 'dateReelle', source: 'factures' },
    semaine: { field: 'dateReelle', source: 'factures' },
    annee: { field: 'dateReelle', source: 'factures' },
    ville: { field: 'data.ville', source: 'projects' },
    client: { field: 'clientId', source: 'projects' },
    dossier: { field: 'projectId', source: 'factures' },
  };
  
  return mappings[dimension] || null;
}
