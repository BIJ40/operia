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
  month: string;      // Clé technique: "2024-01"
  monthLabel: string; // Affichage: "Janv." ou "Janv. 24"
  [key: string]: number | string;
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

    const project = projectsMap.get(facture.projectId);
    if (!project) return;

    // Extraire les univers du projet, normaliser ET dédupliquer
    const rawUniverses = project.data?.universes || project.universes || [];
    const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
    const universes = [...new Set(normalizedUniverses)]; // Dédupliquer
    if (universes.length === 0) return;

    // Déterminer le type de facture et le montant net (aligné sur calculateCaJour)
    const rawType = facture.typeFacture || facture.data?.type || facture.state || "";
    const typeFacture = String(rawType).toLowerCase();

    const montantRaw = facture.montantHT || facture.data?.montantHT || facture.data?.totalHT || facture.totalHT || "0";
    const montantParsed = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
    if (isNaN(montantParsed) || montantParsed === 0) return;

    // Montant net : factures en positif, avoirs en négatif
    const montantNet = typeFacture === "avoir"
      ? -Math.abs(montantParsed)
      : montantParsed;

    // Si le projet a plusieurs univers, diviser le CA équitablement (montant net)
    const caParUnivers = montantNet / universes.length;

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

    const rawUniverses = project.data?.universes || project.universes || [];
    const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
    const universes = [...new Set(normalizedUniverses)]; // Dédupliquer
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
    const rawUniverses = p.data?.universes || p.universes || [];
    const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
    const universes = [...new Set(normalizedUniverses)]; // Dédupliquer
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
 * Générer tous les mois entre deux dates (format "YYYY-MM")
 */
const generateMonthsInRange = (start: Date, end: Date): string[] => {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (current <= endMonth) {
    const year = current.getFullYear();
    const monthNum = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${monthNum}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months;
};

/**
 * Convertir une clé "YYYY-MM" en label lisible
 * Si période multi-années ou > 12 mois : "Janv. 24"
 * Sinon : "Janv."
 */
const monthKeyToLabel = (key: string, isMultiYear: boolean): string => {
  const monthNames = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
  const [yearStr, monthStr] = key.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthName = monthNames[monthIndex] || key;
  
  if (isMultiYear) {
    const shortYear = yearStr.slice(-2);
    return `${monthName} ${shortYear}`;
  }
  return monthName;
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
  
  // Générer dynamiquement les mois couverts par la période
  const monthsInRange = generateMonthsInRange(dateRange.start, dateRange.end);
  const isMultiYear = dateRange.start.getFullYear() !== dateRange.end.getFullYear() || monthsInRange.length > 12;
  
  // Map pour agréger le CA par mois et par univers
  const caParMoisEtUnivers = new Map<string, Map<string, number>>();
  
  // Initialiser tous les mois de la période
  monthsInRange.forEach(monthKey => {
    caParMoisEtUnivers.set(monthKey, new Map());
  });
  
  factures.forEach(facture => {
    const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
    if (!dateReelle) return;
    
    try {
      const factureDate = parseISO(dateReelle);
      if (!isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end })) return;
      
      // Clé mois avec année : "2024-01"
      const year = factureDate.getFullYear();
      const monthNum = String(factureDate.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${monthNum}`;
      
      // Déterminer le type de facture et le montant net
      const rawType = facture.typeFacture || facture.data?.type || facture.state || "";
      const typeFacture = String(rawType).toLowerCase();

      const montantRaw = facture.montantHT || facture.data?.montantHT || facture.data?.totalHT || facture.totalHT || "0";
      const montantParsed = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      if (isNaN(montantParsed) || montantParsed === 0) return;

      // Montant net : factures en positif, avoirs en négatif
      const montantNet = typeFacture === "avoir"
        ? -Math.abs(montantParsed)
        : montantParsed;
      
      const project = projectsMap.get(facture.projectId);
      if (!project) return;
      
      // Extraire les univers du projet, normaliser ET dédupliquer
      const rawUniverses = project.data?.universes || project.universes || [];
      const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
      const universes = [...new Set(normalizedUniverses)];
      if (universes.length === 0) return;
      
      // Diviser le CA (net) équitablement entre les univers
      const caParUnivers = montantNet / universes.length;
      
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
  
  // Construire le résultat avec les mois de la période
  const result: MonthlyUniversCA[] = [];
  
  monthsInRange.forEach(monthKey => {
    const monthData = caParMoisEtUnivers.get(monthKey) || new Map();
    const row: MonthlyUniversCA = { 
      month: monthKey,
      monthLabel: monthKeyToLabel(monthKey, isMultiYear)
    };
    
    monthData.forEach((ca, univers) => {
      row[univers] = ca;
    });
    
    result.push(row);
  });
  
  return result;
};
