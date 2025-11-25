import { parseISO, isWithinInterval } from "date-fns";

export interface UniversStats {
  univers: string;
  caHT: number;
  nbDossiers: number;
  panierMoyen: number;
  nbInterventions: number;
  tauxSAV: number | null;
}

export interface MonthlyUniversCA {
  month: string;
  [key: string]: number | string; // Clés dynamiques pour chaque univers
}

/**
 * Normaliser les slugs d'univers de l'API vers nos labels
 * Table de correspondance HARD-CODÉE (identique à enrichmentService)
 */
const normalizeUniverseSlug = (slug: string): string => {
  const normalizationMap: Record<string, string> = {
    'amelioration_logement': 'pmr',
    'amelioration-logement': 'pmr',
    'ame_logement': 'pmr',
    'volets': 'volet_roulant',
    'volet': 'volet_roulant',
  };

  const normalized = normalizationMap[slug.toLowerCase()];
  return normalized || slug.toLowerCase();
};

/**
 * Calculer les statistiques par univers
 */
export const calculateUniversStats = (
  factures: any[],
  projects: any[],
  interventions: any[],
  dateRange: { start: Date; end: Date }
): UniversStats[] => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Map pour agréger les stats par univers
  const statsParUnivers = new Map<string, {
    caHT: number;
    dossiers: Set<number>;
    interventions: number;
  }>();

  // ÉTAPE 1: Agréger CA et dossiers par univers via les factures
  factures.forEach(facture => {
    // Filtrer par période
    const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
    if (!dateReelle) return;
    
    try {
      const factureDate = parseISO(dateReelle);
      if (!isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end })) return;
    } catch {
      return;
    }

    // Exclure les avoirs
    const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
    if (typeFacture === "avoir") return;

    const project = projectsMap.get(facture.projectId);
    if (!project) return;

    // Extraire les univers du projet ET les normaliser
    const universes = (project.data?.universes || project.universes || []).map((u: string) => 
      normalizeUniverseSlug(u)
    );
    if (universes.length === 0) return;

    // Calculer le montant HT
    const montantRaw = facture.montantHT || facture.data?.montantHT || facture.data?.totalHT || facture.totalHT || "0";
    const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
    
    if (isNaN(montant)) return;

    // Si le projet a plusieurs univers, diviser le CA équitablement
    const caParUnivers = montant / universes.length;

    universes.forEach((univers: string) => {
      if (!statsParUnivers.has(univers)) {
        statsParUnivers.set(univers, {
          caHT: 0,
          dossiers: new Set(),
          interventions: 0
        });
      }

      const stats = statsParUnivers.get(univers)!;
      stats.caHT += caParUnivers;
      stats.dossiers.add(facture.projectId);
    });
  });

  // ÉTAPE 2: Agréger les interventions par univers
  interventions.forEach(interv => {
    // Filtrer par période
    const date = interv.date || interv.created_at;
    if (!date) return;
    
    try {
      const intervDate = parseISO(date);
      if (!isWithinInterval(intervDate, { start: dateRange.start, end: dateRange.end })) return;
    } catch {
      return;
    }

    const project = projectsMap.get(interv.projectId);
    if (!project) return;

    const universes = (project.data?.universes || project.universes || []).map((u: string) => 
      normalizeUniverseSlug(u)
    );
    if (universes.length === 0) return;

    universes.forEach((univers: string) => {
      if (!statsParUnivers.has(univers)) {
        statsParUnivers.set(univers, {
          caHT: 0,
          dossiers: new Set(),
          interventions: 0
        });
      }

      const stats = statsParUnivers.get(univers)!;
      stats.interventions += 1;
    });
  });

  // ÉTAPE 3: Calculer le taux SAV par univers
  const tauxSAVParUnivers = calculateTauxSAVParUnivers(interventions, projects, dateRange);

  // ÉTAPE 4: Construire le résultat
  const results: UniversStats[] = [];

  statsParUnivers.forEach((stats, univers) => {
    const nbDossiers = stats.dossiers.size;
    const panierMoyen = nbDossiers > 0 ? stats.caHT / nbDossiers : 0;

    results.push({
      univers,
      caHT: stats.caHT,
      nbDossiers,
      panierMoyen,
      nbInterventions: stats.interventions,
      tauxSAV: tauxSAVParUnivers.get(univers) || null
    });
  });

  // Trier par CA décroissant
  return results.sort((a, b) => b.caHT - a.caHT);
};

/**
 * Calculer le taux de SAV par univers
 * Taux SAV = (Nb de dossiers avec au moins 1 SAV / Nb total de dossiers de l'univers) × 100
 */
const calculateTauxSAVParUnivers = (
  interventions: any[],
  projects: any[],
  dateRange: { start: Date; end: Date }
): Map<string, number> => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // ÉTAPE 1: Identifier tous les dossiers SAV via interventions
  const projectHasSavFromInterv: Record<number, boolean> = {};
  
  interventions.forEach(interv => {
    const pid = interv.projectId;
    if (!pid) return;
    
    const pictos = interv.data?.pictosInterv ?? [];
    const type2 = interv.data?.type2 ?? null;
    
    if (pictos.includes("SAV") || type2 === "SAV") {
      projectHasSavFromInterv[pid] = true;
    }
  });
  
  // ÉTAPE 2: Identifier tous les dossiers SAV via drapeaux project
  const projectHasSavFromProject: Record<number, boolean> = {};
  
  projects.forEach(p => {
    const pid = p.id;
    const picto = p.data?.pictoInterv ?? [];
    const sinistre = p.data?.sinistre ?? null;
    
    if (picto.includes("SAV") || sinistre === "SAV") {
      projectHasSavFromProject[pid] = true;
    }
  });
  
  // ÉTAPE 3: Flag final isSAV
  const projectIsSav: Record<number, boolean> = {};
  
  projects.forEach(p => {
    const pid = p.id;
    const fromInterv = projectHasSavFromInterv[pid] === true;
    const fromProject = projectHasSavFromProject[pid] === true;
    
    projectIsSav[pid] = fromInterv || fromProject;
  });
  
  // ÉTAPE 4: Compter les dossiers par univers et les dossiers SAV par univers
  const totalProjectsParUnivers = new Map<string, Set<number>>();
  const savProjectsParUnivers = new Map<string, Set<number>>();
  
  projects.forEach(p => {
    const pid = p.id;
    const universes = (p.data?.universes || p.universes || []).map((u: string) => 
      normalizeUniverseSlug(u)
    );
    if (universes.length === 0) return;

    universes.forEach((univers: string) => {
      if (!totalProjectsParUnivers.has(univers)) {
        totalProjectsParUnivers.set(univers, new Set());
      }
      totalProjectsParUnivers.get(univers)!.add(pid);
      
      if (projectIsSav[pid]) {
        if (!savProjectsParUnivers.has(univers)) {
          savProjectsParUnivers.set(univers, new Set());
        }
        savProjectsParUnivers.get(univers)!.add(pid);
      }
    });
  });
  
  // ÉTAPE 5: Calculer le taux SAV pour chaque univers
  const tauxSAVParUnivers = new Map<string, number>();
  
  totalProjectsParUnivers.forEach((projectsSet, univers) => {
    const totalProjects = projectsSet.size;
    const savProjects = savProjectsParUnivers.get(univers)?.size || 0;
    
    if (totalProjects === 0) {
      tauxSAVParUnivers.set(univers, 0);
    } else {
      const taux = Math.round((savProjects / totalProjects) * 1000) / 10;
      tauxSAVParUnivers.set(univers, taux);
    }
  });
  
  return tauxSAVParUnivers;
};

/**
 * Calculer le CA mensuel empilé par univers
 */
export const calculateMonthlyUniversCA = (
  factures: any[],
  projects: any[],
  dateRange: { start: Date; end: Date }
): MonthlyUniversCA[] => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Map pour agréger le CA par mois et par univers
  const caParMoisEtUnivers = new Map<string, Map<string, number>>();
  
  factures.forEach(facture => {
    // Filtrer par période
    const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
    if (!dateReelle) return;
    
    try {
      const factureDate = parseISO(dateReelle);
      if (!isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end })) return;
      
      // Exclure les avoirs
      const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
      if (typeFacture === "avoir") return;
      
      const project = projectsMap.get(facture.projectId);
      if (!project) return;
      
      // Extraire les univers du projet ET les normaliser
      const universes = (project.data?.universes || project.universes || []).map((u: string) => 
        normalizeUniverseSlug(u)
      );
      if (universes.length === 0) return;
      
      // Calculer le montant HT
      const montantRaw = facture.montantHT || facture.data?.montantHT || facture.data?.totalHT || facture.totalHT || "0";
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      
      if (isNaN(montant)) return;
      
      // Diviser le CA équitablement entre les univers
      const caParUnivers = montant / universes.length;
      
      // Récupérer le mois (format: "Jan", "Fév", etc.)
      const monthKey = factureDate.toLocaleDateString('fr-FR', { month: 'short' });
      
      if (!caParMoisEtUnivers.has(monthKey)) {
        caParMoisEtUnivers.set(monthKey, new Map());
      }
      
      const monthData = caParMoisEtUnivers.get(monthKey)!;
      
      universes.forEach((univers: string) => {
        const currentCA = monthData.get(univers) || 0;
        monthData.set(univers, currentCA + caParUnivers);
      });
    } catch {
      return;
    }
  });
  
  // Construire le résultat avec tous les mois
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const result: MonthlyUniversCA[] = [];
  
  months.forEach(month => {
    const monthData = caParMoisEtUnivers.get(month) || new Map();
    const row: MonthlyUniversCA = { month };
    
    monthData.forEach((ca, univers) => {
      row[univers] = ca;
    });
    
    result.push(row);
  });
  
  return result;
};
