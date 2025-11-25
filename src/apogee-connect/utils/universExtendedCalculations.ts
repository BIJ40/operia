import { parseISO, isWithinInterval } from "date-fns";

/**
 * Normaliser les slugs d'univers
 */
const normalizeUniverseSlug = (slug: string): string => {
  const normalizationMap: Record<string, string> = {
    'amelioration_logement': 'pmr',
    'amelioration-logement': 'pmr',
    'ame_logement': 'pmr',
    'volets': 'volet_roulant',
    'volet': 'volet_roulant',
  };
  return normalizationMap[slug.toLowerCase()] || slug.toLowerCase();
};

/**
 * Calcule le nombre de dossiers par univers
 */
export function calculateDossiersParUnivers(
  projects: any[],
  dateRange: { start: Date; end: Date }
): Record<string, number> {
  const countDossiers: Record<string, number> = {};

  projects.forEach((project) => {
    // Filtrer par date de création
    const createdAt = project.createdAt || project.created_at;
    if (!createdAt) return;

    try {
      const projectDate = parseISO(createdAt);
      if (!isWithinInterval(projectDate, { start: dateRange.start, end: dateRange.end })) {
        return;
      }
    } catch {
      return;
    }

    // Compter par univers
    const universes = project.data?.universes || project.universes || [];
    universes.forEach((univers: string) => {
      const normalized = normalizeUniverseSlug(univers);
      countDossiers[normalized] = (countDossiers[normalized] || 0) + 1;
    });
  });

  return countDossiers;
}

/**
 * Calcule le taux de transformation par univers
 */
export function calculateTransfoParUnivers(
  projects: any[],
  devis: any[],
  factures: any[],
  dateRange: { start: Date; end: Date }
): Record<string, { caDevis: number; caFactures: number; tauxTransfo: number }> {
  const stats: Record<string, { caDevis: number; caFactures: number }> = {};

  // Map projets pour accès rapide
  const projectsMap = new Map(projects.map((p) => [p.id, p]));

  // Calculer CA devis acceptés par univers
  devis.forEach((d) => {
    if (d.state !== "invoice") return;
    
    const dateReelle = d.dateReelle || d.date;
    if (!dateReelle) return;

    try {
      const devisDate = parseISO(dateReelle);
      if (!isWithinInterval(devisDate, { start: dateRange.start, end: dateRange.end })) {
        return;
      }
    } catch {
      return;
    }

    const project = projectsMap.get(d.projectId);
    if (!project) return;

    const caDevis = Number(d.data?.totalHT || d.totalHT || 0);
    const universes = project.data?.universes || project.universes || [];
    const nbUniverses = universes.length || 1;

    universes.forEach((univers: string) => {
      const normalized = normalizeUniverseSlug(univers);
      if (!stats[normalized]) {
        stats[normalized] = { caDevis: 0, caFactures: 0 };
      }
      stats[normalized].caDevis += caDevis / nbUniverses;
    });
  });

  // Calculer CA factures par univers
  factures.forEach((f) => {
    if (f.state === "canceled" || f.data?.type === "avoir") return;

    const dateReelle = f.dateReelle || f.date;
    if (!dateReelle) return;

    try {
      const factureDate = parseISO(dateReelle);
      if (!isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end })) {
        return;
      }
    } catch {
      return;
    }

    const project = projectsMap.get(f.projectId);
    if (!project) return;

    const caFacture = Number(f.data?.totalHT || f.totalHT || 0);
    const universes = project.data?.universes || project.universes || [];
    const nbUniverses = universes.length || 1;

    universes.forEach((univers: string) => {
      const normalized = normalizeUniverseSlug(univers);
      if (!stats[normalized]) {
        stats[normalized] = { caDevis: 0, caFactures: 0 };
      }
      stats[normalized].caFactures += caFacture / nbUniverses;
    });
  });

  // Calculer taux de transformation
  const result: Record<string, { caDevis: number; caFactures: number; tauxTransfo: number }> = {};
  Object.keys(stats).forEach((univers) => {
    const data = stats[univers];
    result[univers] = {
      caDevis: data.caDevis,
      caFactures: data.caFactures,
      tauxTransfo: data.caDevis > 0 ? (data.caFactures / data.caDevis) * 100 : 0,
    };
  });

  return result;
}

/**
 * Calcule la matrice performance univers × apporteur
 */
export function calculateUniversApporteurMatrix(
  projects: any[],
  clients: any[],
  factures: any[],
  dateRange: { start: Date; end: Date }
): Record<string, Record<string, { ca: number; nbDossiers: number }>> {
  const matrix: Record<string, Record<string, { ca: number; nbDossiers: Set<string> }>> = {};

  // Map projets et clients
  const projectsMap = new Map(projects.map((p) => [p.id, p]));
  const clientsMap = new Map(clients.map((c) => [c.id, c]));

  // Traiter chaque facture
  factures.forEach((f) => {
    if (f.state === "canceled" || f.data?.type === "avoir") return;

    const dateReelle = f.dateReelle || f.date;
    if (!dateReelle) return;

    try {
      const factureDate = parseISO(dateReelle);
      if (!isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end })) {
        return;
      }
    } catch {
      return;
    }

    const project = projectsMap.get(f.projectId);
    if (!project) return;

    const caFacture = Number(f.data?.totalHT || f.totalHT || 0);
    const universes = (project.data?.universes || project.universes || []).map((u: string) => 
      normalizeUniverseSlug(u)
    );
    const nbUniverses = universes.length || 1;

    // Déterminer le type d'apporteur
    const commanditaireId = f.data?.commanditaireId || project.data?.commanditaireId;
    let typeApporteur = "particulier";
    
    if (commanditaireId) {
      const client = clientsMap.get(commanditaireId);
      if (client) {
        typeApporteur = client.data?.type || "particulier";
      }
    }

    // Répartir sur chaque univers
    universes.forEach((univers: string) => {
      if (!matrix[univers]) {
        matrix[univers] = {};
      }
      if (!matrix[univers][typeApporteur]) {
        matrix[univers][typeApporteur] = { ca: 0, nbDossiers: new Set() };
      }

      matrix[univers][typeApporteur].ca += caFacture / nbUniverses;
      matrix[univers][typeApporteur].nbDossiers.add(f.projectId);
    });
  });

  // Convertir Sets en nombres
  const result: Record<string, Record<string, { ca: number; nbDossiers: number }>> = {};
  Object.keys(matrix).forEach((univers) => {
    result[univers] = {};
    Object.keys(matrix[univers]).forEach((type) => {
      result[univers][type] = {
        ca: matrix[univers][type].ca,
        nbDossiers: matrix[univers][type].nbDossiers.size,
      };
    });
  });

  return result;
}
