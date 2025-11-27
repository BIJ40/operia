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

    // Compter par univers (normaliser et dédupliquer pour éviter double comptage)
    const rawUniverses = project.data?.universes || project.universes || [];
    const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
    const universes = [...new Set(normalizedUniverses)]; // Dédupliquer
    
    universes.forEach((normalized: string) => {
      countDossiers[normalized] = (countDossiers[normalized] || 0) + 1;
    });
  });

  return countDossiers;
}

/**
 * Calcule le taux de transformation par univers
 * IMPORTANT: Ne compare que les factures des dossiers ayant au moins un devis accepté
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

  // États acceptés pour les devis (order = commandé, invoice = facturé)
  const acceptedStates = ["order", "invoice"];

  console.log(`[TransfoParUnivers] Début analyse - ${devis.length} devis, ${factures.length} factures`);

  // ÉTAPE 1: Identifier les projets ayant au moins un devis accepté dans la période
  const projectsWithAcceptedQuote = new Set<number>();
  const acceptedQuotesByProject = new Map<number, any[]>();

  // Compter les états de devis pour debug
  const devisStatesCounts = new Map<string, number>();
  devis.forEach((d) => {
    const state = d.state || "undefined";
    devisStatesCounts.set(state, (devisStatesCounts.get(state) || 0) + 1);
  });
  console.log(`[TransfoParUnivers] États des devis:`, Object.fromEntries(devisStatesCounts));

  devis.forEach((d) => {
    if (!acceptedStates.includes(d.state)) return;
    
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

    // Projet a un devis accepté
    projectsWithAcceptedQuote.add(d.projectId);
    
    // Stocker les devis par projet
    const list = acceptedQuotesByProject.get(d.projectId) ?? [];
    list.push(d);
    acceptedQuotesByProject.set(d.projectId, list);
  });

  console.log(`[TransfoParUnivers] Projets avec devis accepté: ${projectsWithAcceptedQuote.size}`);
  
  // Log des univers trouvés dans les projets avec devis
  const universesInProjects = new Set<string>();
  projectsWithAcceptedQuote.forEach((projectId) => {
    const project = projectsMap.get(projectId);
    if (project) {
      const universes = project.data?.universes || project.universes || [];
      universes.forEach((u: string) => universesInProjects.add(u));
    }
  });
  console.log(`[TransfoParUnivers] Univers trouvés dans projets avec devis:`, Array.from(universesInProjects));

  // ÉTAPE 2: Calculer CA devis par univers (uniquement projets avec devis accepté)
  projectsWithAcceptedQuote.forEach((projectId) => {
    const project = projectsMap.get(projectId);
    if (!project) return;

    const rawUniverses = project.data?.universes || project.universes || [];
    const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
    const universes = [...new Set(normalizedUniverses)]; // Dédupliquer
    if (universes.length === 0) return;

    const nbUniverses = universes.length;
    const devisList = acceptedQuotesByProject.get(projectId) ?? [];

    // Somme des devis acceptés du projet
    let totalDevis = 0;
    devisList.forEach((d) => {
      totalDevis += Number(d.data?.totalHT || d.totalHT || 0);
    });

    // Répartir équitablement entre les univers
    universes.forEach((univers: string) => {
      const normalized = normalizeUniverseSlug(univers);
      if (!stats[normalized]) {
        stats[normalized] = { caDevis: 0, caFactures: 0 };
      }
      stats[normalized].caDevis += totalDevis / nbUniverses;
    });
  });

  // ÉTAPE 3: Calculer CA factures par univers (UNIQUEMENT projets avec devis accepté)
  let facturesCountTotal = 0;
  let facturesCountIncluded = 0;
  let facturesNaN = 0;
  
  factures.forEach((f) => {
    facturesCountTotal++;
    if (f.state === "canceled" || f.data?.type === "avoir") return;

    // RESTRICTION: ne compter que les factures des projets avec devis accepté
    if (!projectsWithAcceptedQuote.has(f.projectId)) return;
    facturesCountIncluded++;

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

    // Extraire le montant avec tous les chemins possibles
    const montantRaw = f.montantHT || f.data?.montantHT || f.data?.totalHT || f.totalHT || "0";
    const montantStr = String(montantRaw).replace(/[^0-9.-]/g, '');
    const caFacture = parseFloat(montantStr);
    
    if (isNaN(caFacture)) {
      console.warn(`[TransfoParUnivers] Montant NaN pour facture ${f.id} projet ${f.projectId}:`, montantRaw);
      facturesNaN++;
      return;
    }

    const rawUniverses = project.data?.universes || project.universes || [];
    const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
    const universes = [...new Set(normalizedUniverses)]; // Dédupliquer
    if (universes.length === 0) return;

    const nbUniverses = universes.length;

    universes.forEach((normalized: string) => {
      if (!stats[normalized]) {
        stats[normalized] = { caDevis: 0, caFactures: 0 };
      }
      stats[normalized].caFactures += caFacture / nbUniverses;
    });
  });

  console.log(`[TransfoParUnivers] Factures: ${facturesCountIncluded} incluses / ${facturesCountTotal} totales, ${facturesNaN} avec montant NaN`);

  // ÉTAPE 4: Calculer taux de transformation (plafonné à 100%)
  const result: Record<string, { caDevis: number; caFactures: number; tauxTransfo: number }> = {};
  Object.keys(stats).forEach((univers) => {
    const data = stats[univers];
    const taux = data.caDevis > 0 ? (data.caFactures / data.caDevis) * 100 : 0;
    
    result[univers] = {
      caDevis: data.caDevis,
      caFactures: data.caFactures,
      tauxTransfo: Math.min(taux, 100), // Plafonner à 100%
    };

    console.log(`[TransfoParUnivers] ${univers}: CA devis=${data.caDevis.toFixed(2)}€, CA factures=${data.caFactures.toFixed(2)}€, taux=${taux.toFixed(1)}%`);
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

    // Extraire le montant HT avec tous les chemins possibles
    const montantRaw = f.montantHT || f.data?.montantHT || f.data?.totalHT || f.totalHT || "0";
    const montantStr = String(montantRaw).replace(/[^0-9.-]/g, '');
    const caFacture = parseFloat(montantStr);
    
    if (isNaN(caFacture) || caFacture === 0) return;

    const rawUniverses = project.data?.universes || project.universes || [];
    const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
    const universes = [...new Set(normalizedUniverses)]; // Dédupliquer
    const nbUniverses = universes.length || 1;

    // Déterminer le type d'apporteur avec tous les chemins possibles
    const commanditaireId = f.data?.commanditaireId || project.data?.commanditaireId;
    let typeApporteur = "particulier";
    
    if (commanditaireId) {
      const client = clientsMap.get(commanditaireId);
      if (client) {
        // Chercher le type dans tous les chemins possibles
        typeApporteur = client.data?.type || client.type || "particulier";
      }
    }

    // Répartir sur chaque univers (déjà normalisés et dédupliqués)
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
