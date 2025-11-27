import { parseISO, isWithinInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, parse } from "date-fns";

interface AgencyData {
  agencyId: string;
  agencyLabel: string;
  data: any;
}

/**
 * Parse date in both ISO and French DD/MM/YYYY formats
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    // Try ISO format first
    const isoDate = parseISO(dateString);
    if (!isNaN(isoDate.getTime())) return isoDate;
  } catch {}
  
  try {
    // Try French format DD/MM/YYYY
    const frenchDate = parse(dateString, 'dd/MM/yyyy', new Date());
    if (!isNaN(frenchDate.getTime())) return frenchDate;
  } catch {}
  
  return null;
}

/**
 * Calculate TOP 5 agencies by CA for the current year
 */
export function calculateTop5Agencies(agencyData: AgencyData[]) {
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const agenciesWithCA = agencyData
    .map((agency) => {
      if (!agency.data?.factures) {
        return { agencyId: agency.agencyId, agencyLabel: agency.agencyLabel, ca: 0 };
      }

      const ca = agency.data.factures
        .filter((f: any) => {
          if (f.type === 'avoir') return false;
          
          const dateReelle = f.dateReelle || f.dateEmission || f.created_at;
          if (!dateReelle) return false;

          const factureDate = parseDate(dateReelle);
          if (!factureDate) return false;
          
          return isWithinInterval(factureDate, { start: yearStart, end: yearEnd });
        })
        .reduce((sum: number, f: any) => {
          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          return sum + montant;
        }, 0);

      return { agencyId: agency.agencyId, agencyLabel: agency.agencyLabel, ca };
    })
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 5)
    .map((agency, index) => ({
      ...agency,
      rank: index + 1,
    }));

  return agenciesWithCA;
}

/**
 * Calculate best apporteur across all agencies
 */
export function calculateBestApporteur(agencyData: AgencyData[]) {
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const apporteurMap = new Map<number, { name: string; ca: number; nbDossiers: number }>();

  agencyData.forEach((agency) => {
    if (!agency.data?.factures || !agency.data?.clients || !agency.data?.projects) return;

    interface ClientInfo {
      name: string;
      typeClient: string;
    }

    const clientsMap = new Map<number, ClientInfo>(
      agency.data.clients.map((c: any) => [c.id, { 
        name: c.nom || c.prenom || "Apporteur sans nom",
        typeClient: c.data?.type 
      }])
    );

    const projectsMap = new Map(
      agency.data.projects.map((p: any) => [p.id, p])
    );

    agency.data.factures.forEach((facture: any) => {
      if (facture.type === 'avoir') return;

      const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
      if (!dateReelle) return;

      const factureDate = parseDate(dateReelle);
      if (!factureDate) return;
      
      if (!isWithinInterval(factureDate, { start: yearStart, end: yearEnd })) return;

      const project = projectsMap.get(facture.projectId);
      if (!project) return;

      const projectData = project as any;
      const commanditaireId = projectData.data?.commanditaireId;
      if (!commanditaireId) return; // Not an apporteur project

      const client = clientsMap.get(commanditaireId);
      if (!client) return;

      const existing = apporteurMap.get(commanditaireId) || { 
        name: client.name, 
        ca: 0, 
        nbDossiers: 0 
      };
      
      const montantRaw = facture.data?.totalHT || facture.totalHT || facture.montantHT || 0;
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
      existing.ca += montant;
      
      // Count unique projects per apporteur
      apporteurMap.set(commanditaireId, existing);
    });
  });

  // Count unique projects per apporteur
  agencyData.forEach((agency) => {
    if (!agency.data?.projects) return;

    const projectsMap = new Map(
      agency.data.projects.map((p: any) => [p.id, p])
    );

    projectsMap.forEach((project: any) => {
      const projectData = project as any;
      const commanditaireId = projectData.data?.commanditaireId;
      if (!commanditaireId) return;

      const existing = apporteurMap.get(commanditaireId);
      if (existing) {
        existing.nbDossiers += 1;
      }
    });
  });

  // Find the best apporteur by CA
  let bestApporteur = null;
  let maxCA = 0;

  apporteurMap.forEach((stats) => {
    if (stats.ca > maxCA) {
      maxCA = stats.ca;
      bestApporteur = stats;
    }
  });

  return bestApporteur;
}

/**
 * Calculate total monthly royalties (placeholder - requires royalty configuration)
 */
export function calculateMonthlyRoyalties(agencyData: AgencyData[]): number {
  // TODO: Implement actual royalty calculation based on agency_royalty_config
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Calculate network-wide interventions count
 */
export function calculateTotalInterventions(agencyData: AgencyData[], dateRange?: { start: Date; end: Date }): number {
  const now = new Date();
  const start = dateRange?.start || startOfYear(now);
  const end = dateRange?.end || endOfYear(now);

  return agencyData.reduce((total, agency) => {
    if (!agency.data?.interventions) return total;

    const count = agency.data.interventions.filter((intervention: any) => {
      const date = intervention.date || intervention.created_at;
      if (!date) return false;

      const interventionDate = parseDate(date);
      if (!interventionDate) return false;
      
      return isWithinInterval(interventionDate, { start, end });
    }).length;

    return total + count;
  }, 0);
}

/**
 * Network SAV statistics interface
 */
export interface NetworkSAVStats {
  tauxMoyenAgences: number;     // Simple average of agency rates: (rate1+rate2+...+rateN)/N
  tauxGlobalReseau: number;     // Global network rate: (total SAV / total projects) * 100
  nbTotalProjects: number;
  nbTotalSAVProjects: number;
  nbAgences: number;
}

/**
 * Calculate comprehensive network SAV statistics
 * Returns both simple average of agency rates AND global weighted rate
 */
export function calculateNetworkSAVStats(agencyData: AgencyData[]): NetworkSAVStats {
  console.log("[FRANCHISEUR SAV] agences brutes =", agencyData.map(a => ({
    id: a.agencyId,
    name: a.agencyLabel,
    projects: a.data?.projects?.length || 0,
    interventions: a.data?.interventions?.length || 0
  })));

  let totalProjects = 0;
  let totalSAVProjects = 0;
  const agencyRates: number[] = [];
  const agencySAVDetails: any[] = [];

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;

    const agencyProjectCount = agency.data.projects.length;
    if (agencyProjectCount === 0) return;

    // Identify SAV projects using the SAME logic as "Mes indicateurs"
    const savProjectIds = new Set<number>();
    agency.data.interventions.forEach((intervention: any) => {
      const type2 = intervention.type2 || intervention.data?.type2 || "";
      const type = intervention.type || intervention.data?.type || "";
      
      // SAV detection: type2 or type contains "sav"
      const isSAV = type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");
      
      if (isSAV && intervention.projectId) {
        savProjectIds.add(intervention.projectId);
      }
    });

    const agencySAVCount = savProjectIds.size;

    // Accumulate for global calculation
    totalProjects += agencyProjectCount;
    totalSAVProjects += agencySAVCount;

    // Store individual agency rate for average calculation
    const agencyRate = (agencySAVCount / agencyProjectCount) * 100;
    agencyRates.push(agencyRate);

    agencySAVDetails.push({
      id: agency.agencyId,
      name: agency.agencyLabel,
      nbTotalProjects: agencyProjectCount,
      nbSAVProjects: agencySAVCount,
      tauxSAV: Math.round(agencyRate * 10) / 10
    });
  });

  console.log("[FRANCHISEUR SAV] savGlobal par agence =", agencySAVDetails);

  const result = {
    tauxMoyenAgences: agencyRates.length > 0 
      ? Math.round((agencyRates.reduce((sum, rate) => sum + rate, 0) / agencyRates.length) * 10) / 10
      : 0,
    tauxGlobalReseau: totalProjects > 0 
      ? Math.round((totalSAVProjects / totalProjects) * 1000) / 10
      : 0,
    nbTotalProjects: totalProjects,
    nbTotalSAVProjects: totalSAVProjects,
    nbAgences: agencyData.length,
  };

  console.log("[FRANCHISEUR SAV] RÉSULTAT FINAL =", {
    nbAgences: result.nbAgences,
    tauxGlobalReseau: `${result.tauxGlobalReseau}%`,
    tauxMoyenAgences: `${result.tauxMoyenAgences}%`,
    nbTotalDossiers: result.nbTotalProjects,
    nbTotalDossiersSAV: result.nbTotalSAVProjects
  });

  return result;
}

/**
 * @deprecated Use calculateNetworkSAVStats instead for comprehensive SAV statistics
 * Calculate network-wide SAV rate as AVERAGE of individual agency rates
 */
export function calculateSAVRate(agencyData: AgencyData[]): number {
  const stats = calculateNetworkSAVStats(agencyData);
  return stats.tauxMoyenAgences;
}

/**
 * Calculate average processing time (days from project creation to last intervention)
 */
export function calculateAverageProcessingTime(agencyData: AgencyData[]): number {
  let totalDays = 0;
  let projectCount = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;

    agency.data.projects.forEach((project: any) => {
      const projectCreatedAt = parseDate(project.createdAt || project.created_at);
      if (!projectCreatedAt) return;

      // Find last intervention for this project
      const projectInterventions = agency.data.interventions
        .filter((i: any) => i.projectId === project.id)
        .map((i: any) => parseDate(i.date || i.created_at))
        .filter((d: Date | null) => d !== null) as Date[];

      if (projectInterventions.length === 0) return;

      const lastIntervention = new Date(Math.max(...projectInterventions.map(d => d.getTime())));
      const daysDiff = Math.floor((lastIntervention.getTime() - projectCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      totalDays += daysDiff;
      projectCount += 1;
    });
  });

  return projectCount > 0 ? Math.round(totalDays / projectCount) : 0;
}

/**
 * Calculate monthly CA evolution for the current year
 */
export function calculateMonthlyCAEvolution(agencyData: AgencyData[]) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyData = months.map((month, index) => ({ month, ca: 0, nbFactures: 0 }));

  const now = new Date();
  const currentYear = now.getFullYear();

  agencyData.forEach((agency) => {
    if (!agency.data?.factures) return;

    agency.data.factures.forEach((facture: any) => {
      if (facture.type === 'avoir') return;

      const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
      const factureDate = parseDate(dateReelle);
      
      if (!factureDate || factureDate.getFullYear() !== currentYear) return;

      const monthIndex = factureDate.getMonth();
      const montantRaw = facture.data?.totalHT || facture.totalHT || facture.montantHT || 0;
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
      
      monthlyData[monthIndex].ca += montant;
      monthlyData[monthIndex].nbFactures += 1;
    });
  });

  return monthlyData;
}

/**
 * Calculate CA distribution by agency (for pie chart)
 */
export function calculateCAByAgency(agencyData: AgencyData[]) {
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  return agencyData
    .map((agency) => {
      if (!agency.data?.factures) {
        return { agencyLabel: agency.agencyLabel, ca: 0 };
      }

      const ca = agency.data.factures
        .filter((f: any) => {
          if (f.type === 'avoir') return false;
          const dateReelle = f.dateReelle || f.dateEmission || f.created_at;
          const factureDate = parseDate(dateReelle);
          return factureDate && isWithinInterval(factureDate, { start: yearStart, end: yearEnd });
        })
        .reduce((sum: number, f: any) => {
          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          return sum + montant;
        }, 0);

      return { agencyLabel: agency.agencyLabel, ca };
    })
    .filter(a => a.ca > 0)
    .sort((a, b) => b.ca - a.ca);
}

/**
 * Calculate number of projects within a date range
 */
export function calculateProjectsOnPeriod(
  agencyData: AgencyData[], 
  dateRange?: { start: Date; end: Date }
): number {
  let totalProjects = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects) return;

    agency.data.projects.forEach((project: any) => {
      const projectCreatedAt = parseDate(project.createdAt || project.created_at);
      if (!projectCreatedAt) return;

      // Si pas de dateRange, on compte tous les projets
      if (!dateRange) {
        totalProjects++;
        return;
      }

      // Sinon on filtre sur la période
      if (isWithinInterval(projectCreatedAt, { start: dateRange.start, end: dateRange.end })) {
        totalProjects++;
      }
    });
  });

  return totalProjects;
}

/**
 * Calculate taux one-shot: % of projects resolved in a single intervention
 */
export function calculateOneShotRate(agencyData: AgencyData[]): number {
  let totalProjects = 0;
  let oneShotProjects = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;

    const interventionsByProject = new Map<number, number>();
    
    agency.data.interventions.forEach((intervention: any) => {
      const count = interventionsByProject.get(intervention.projectId) || 0;
      interventionsByProject.set(intervention.projectId, count + 1);
    });

    agency.data.projects.forEach((project: any) => {
      const interventionCount = interventionsByProject.get(project.id) || 0;
      if (interventionCount > 0) {
        totalProjects++;
        if (interventionCount === 1) {
          oneShotProjects++;
        }
      }
    });
  });

  return totalProjects > 0 ? Math.round((oneShotProjects / totalProjects) * 1000) / 10 : 0;
}

/**
 * Calculate average delay from project creation to first quote (in days)
 */
export function calculateProjectToQuoteDelay(agencyData: AgencyData[]): number {
  let totalDays = 0;
  let projectCount = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.devis) return;

    agency.data.projects.forEach((project: any) => {
      const projectCreatedAt = parseDate(project.createdAt || project.created_at);
      if (!projectCreatedAt) return;

      // Find first quote for this project
      const projectQuotes = agency.data.devis
        .filter((d: any) => d.projectId === project.id)
        .map((d: any) => parseDate(d.dateReelle || d.dateCreation || d.created_at))
        .filter((d: Date | null) => d !== null) as Date[];

      if (projectQuotes.length === 0) return;

      const firstQuote = new Date(Math.min(...projectQuotes.map(d => d.getTime())));
      const daysDiff = Math.floor((firstQuote.getTime() - projectCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0) {
        totalDays += daysDiff;
        projectCount += 1;
      }
    });
  });

  return projectCount > 0 ? Math.round(totalDays / projectCount) : 0;
}

/**
 * Calculate average number of visits/appointments per project
 */
export function calculateVisitsPerProject(agencyData: AgencyData[]): number {
  let totalVisits = 0;
  let projectCount = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;

    const projectIds = new Set(agency.data.projects.map((p: any) => p.id));
    projectCount += projectIds.size;

    // Count visits (interventions of type 'visite' or similar)
    agency.data.interventions.forEach((intervention: any) => {
      if (projectIds.has(intervention.projectId)) {
        // Count all interventions as potential visits/appointments
        totalVisits++;
      }
    });
  });

  return projectCount > 0 ? Math.round((totalVisits / projectCount) * 10) / 10 : 0;
}

/**
 * Calculate percentage of projects involving multiple universes
 */
export function calculateMultiUniversRate(agencyData: AgencyData[]): number {
  let totalProjects = 0;
  let multiUniversProjects = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects) return;

    agency.data.projects.forEach((project: any) => {
      totalProjects++;
      
      const universes = project.data?.universes || project.universes || [];
      if (Array.isArray(universes) && universes.length > 1) {
        multiUniversProjects++;
      }
    });
  });

  return totalProjects > 0 ? Math.round((multiUniversProjects / totalProjects) * 1000) / 10 : 0;
}

/**
 * Calculate monthly SAV evolution
 */
export function calculateMonthlySAVEvolution(agencyData: AgencyData[]) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyData = months.map((month) => ({ month, tauxSAV: 0 }));

  const now = new Date();
  const currentYear = now.getFullYear();

  // For each month, calculate average SAV rate across agencies
  months.forEach((_, monthIndex) => {
    const agencyRates: number[] = [];

    agencyData.forEach((agency) => {
      if (!agency.data?.projects || !agency.data?.interventions) return;

      // Projects created/active in this month
      const monthProjects = agency.data.projects.filter((p: any) => {
        const createdAt = parseDate(p.createdAt || p.created_at);
        return createdAt && createdAt.getFullYear() === currentYear && createdAt.getMonth() === monthIndex;
      });

      if (monthProjects.length === 0) return;

      const projectIds = new Set(monthProjects.map((p: any) => p.id));
      const savProjectIds = new Set();

      agency.data.interventions.forEach((intervention: any) => {
        if (intervention.type === 'sav' && projectIds.has(intervention.projectId)) {
          savProjectIds.add(intervention.projectId);
        }
      });

      const agencyRate = (savProjectIds.size / projectIds.size) * 100;
      agencyRates.push(agencyRate);
    });

    monthlyData[monthIndex].tauxSAV = agencyRates.length > 0
      ? agencyRates.reduce((sum, rate) => sum + rate, 0) / agencyRates.length
      : 0;
  });

  return monthlyData;
}

/**
 * Normaliser les slugs d'univers (identique à universExtendedCalculations)
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
 * Aggregate Univers × Apporteur matrix across multiple agencies
 * Combines CA and dossier counts from all agencies
 */
export function aggregateUniversApporteurMatrix(
  agencyData: AgencyData[],
  dateRange?: { start: Date; end: Date }
): Record<string, Record<string, { ca: number; nbDossiers: number }>> {
  const matrix: Record<string, Record<string, { ca: number; nbDossiers: Set<string> }>> = {};

  const now = new Date();
  const start = dateRange?.start || startOfYear(now);
  const end = dateRange?.end || endOfYear(now);

  agencyData.forEach((agency, agencyIndex) => {
    if (!agency.data?.factures || !agency.data?.projects || !agency.data?.clients) return;

    const projectsMap = new Map(agency.data.projects.map((p: any) => [p.id, p]));
    const clientsMap = new Map(agency.data.clients.map((c: any) => [c.id, c]));

    agency.data.factures.forEach((facture: any) => {
      if (facture.state === "canceled") return;

      const dateReelle = facture.dateEmission || facture.dateReelle || facture.created_at;
      if (!dateReelle) return;

      const factureDate = parseDate(dateReelle);
      if (!factureDate || !isWithinInterval(factureDate, { start, end })) return;

      const project = projectsMap.get(facture.projectId) as any;
      if (!project) return;

      // Déterminer le type de facture et le montant net (aligné sur calculateCaJour)
      const rawType = facture.typeFacture || facture.data?.type || facture.state || "";
      const typeFacture = String(rawType).toLowerCase();

      const montantRaw = facture.montantHT || facture.data?.montantHT || facture.data?.totalHT || facture.totalHT || "0";
      const montantParsed = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      if (isNaN(montantParsed) || montantParsed === 0) return;

      // Montant net : factures en positif, avoirs en négatif
      const caFacture = typeFacture === "avoir"
        ? -Math.abs(montantParsed)
        : montantParsed;

      const rawUniverses = project?.data?.universes || project?.universes || [];
      const normalizedUniverses = rawUniverses.map((u: string) => normalizeUniverseSlug(u));
      const universes = [...new Set(normalizedUniverses)];
      const nbUniverses = universes.length || 1;

      // Déterminer le type d'apporteur
      const commanditaireId = facture.data?.commanditaireId || project?.data?.commanditaireId;
      let typeApporteur = "particulier";

      if (commanditaireId) {
        const client = clientsMap.get(commanditaireId) as any;
        if (client) {
          typeApporteur = client?.data?.type || client?.type || "particulier";
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
        // Utiliser un identifiant unique agence+projet pour éviter doublons cross-agences
        matrix[univers][typeApporteur].nbDossiers.add(`${agencyIndex}-${facture.projectId}`);
      });
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

/**
 * Aggregate Technicien × Univers stats across multiple agencies
 * Combines CA, heures and dossier counts from all agencies
 */
export interface NetworkTechnicienUniversStats {
  technicienId: string;
  technicienNom: string;
  technicienColor: string;
  technicienActif: boolean;
  agencySlug: string;
  universes: {
    [universSlug: string]: {
      caHT: number;
      heures: number;
      caParHeure: number;
      nbDossiers: number;
    };
  };
  totaux: {
    caHT: number;
    heures: number;
    caParHeure: number;
    nbDossiers: number;
  };
}

export function aggregateTechnicienUniversStats(
  agencyData: AgencyData[],
  dateRange?: { start: Date; end: Date }
): NetworkTechnicienUniversStats[] {
  const now = new Date();
  const start = dateRange?.start || startOfYear(now);
  const end = dateRange?.end || endOfYear(now);

  // Map technicien unique ID -> stats
  const techStats: Map<string, {
    nom: string;
    color: string;
    actif: boolean;
    agencySlug: string;
    universes: {
      [universSlug: string]: {
        caHT: number;
        heures: number;
        nbDossiers: Set<string>;
      };
    };
  }> = new Map();

  // Les couleurs sont récupérées directement depuis l'API GetUsers

  agencyData.forEach((agency, agencyIndex) => {
    if (!agency.data?.factures || !agency.data?.projects || !agency.data?.interventions || !agency.data?.users) return;

    const projectsMap = new Map(agency.data.projects.map((p: any) => [p.id, p]));
    
    // Construire une map technicien pour cette agence
    const usersMap = new Map(agency.data.users.map((u: any) => [u.id, u]));

    // Calculer le temps par technicien par projet
    const dureeTechParProjet: Record<string, Record<string, number>> = {};
    const dureeTotaleParProjet: Record<string, number> = {};

    agency.data.interventions.forEach((intervention: any) => {
      const projectId = intervention.projectId || intervention.refProjectId;
      if (!projectId) return;

      // Exclure les RT
      const isRT = intervention.data?.biRt?.isValidated === true || intervention.data?.type2 === "RT";
      if (isRT) return;

      // Vérifier que c'est une intervention éligible
      const isEligible = intervention.data?.biDepan || intervention.data?.biTvx;
      if (!isEligible) return;

      if (!dureeTechParProjet[projectId]) {
        dureeTechParProjet[projectId] = {};
        dureeTotaleParProjet[projectId] = 0;
      }

      const visites = intervention.data?.visites || [];
      visites.forEach((visite: any) => {
        if (visite.state !== "validated") return;

        const duree = Number(visite.duree) || 0;
        const usersIds = visite.usersIds || [];

        usersIds.forEach((techId: string) => {
          if (!dureeTechParProjet[projectId][techId]) {
            dureeTechParProjet[projectId][techId] = 0;
          }
          dureeTechParProjet[projectId][techId] += duree;
          dureeTotaleParProjet[projectId] += duree;
        });
      });
    });

    // Traiter les factures
    agency.data.factures.forEach((facture: any) => {
      if (facture.state === "canceled") return;

      const dateReelle = facture.dateReelle;
      if (!dateReelle) return;

      const factureDate = parseDate(dateReelle);
      if (!factureDate || !isWithinInterval(factureDate, { start, end })) return;

      const projectId = facture.projectId;
      if (!projectId) return;

      const project = projectsMap.get(projectId) as any;
      if (!project) return;

      const caFactureHT = Number(facture.data?.totalHT || facture.totalHT || 0);
      if (caFactureHT <= 0) return;

      const universesRaw = project?.data?.universes || [];
      if (universesRaw.length === 0) return;

      const universes = universesRaw.map((u: string) => normalizeUniverseSlug(u));
      const nbUniverses = universes.length;

      const dureesParTech = dureeTechParProjet[projectId] || {};
      const dureeTotale = dureeTotaleParProjet[projectId] || 0;

      if (dureeTotale === 0) return;

      // Répartir le CA entre les techniciens
      Object.keys(dureesParTech).forEach((techId) => {
        const dureeTech = dureesParTech[techId];
        const partTech = dureeTech / dureeTotale;
        const caTechFacture = caFactureHT * partTech;

        // Identifiant unique pour ce technicien (agence + ID)
        const uniqueTechId = `${agency.agencyId}-${techId}`;

        if (!techStats.has(uniqueTechId)) {
          const user = usersMap.get(Number(techId)) as any;
          // Utiliser firstname/name comme dans techTools.ts
          const prenom = (user?.firstname || '').trim();
          const nomFamille = (user?.name || '').trim();
          const nomComplet = `${prenom} ${nomFamille}`.trim() || `Tech ${techId}`;
          
          // Couleur depuis l'API GetUsers (comme dans techTools.ts)
          const color = user?.data?.bgcolor?.hex 
            || user?.bgcolor?.hex 
            || user?.data?.color?.hex 
            || user?.color?.hex 
            || "#808080";
          
          // Statut actif (comme dans techTools.ts)
          const actif = user?.is_on === true || user?.isActive === true;

          techStats.set(uniqueTechId, {
            nom: `${nomComplet} (${agency.agencyLabel || agency.agencyId})`,
            color,
            actif,
            agencySlug: agency.agencyId,
            universes: {},
          });
        }

        const techData = techStats.get(uniqueTechId)!;

        // Répartir entre les univers
        universes.forEach((univers: string) => {
          if (!techData.universes[univers]) {
            techData.universes[univers] = {
              caHT: 0,
              heures: 0,
              nbDossiers: new Set(),
            };
          }

          const caParUnivers = caTechFacture / nbUniverses;
          const heuresParUnivers = (dureeTech / 60) / nbUniverses;

          techData.universes[univers].caHT += caParUnivers;
          techData.universes[univers].heures += heuresParUnivers;
          techData.universes[univers].nbDossiers.add(`${agencyIndex}-${projectId}`);
        });
      });
    });
  });

  // Convertir en tableau
  const result: NetworkTechnicienUniversStats[] = [];

  techStats.forEach((techData, uniqueTechId) => {
    const universesData: NetworkTechnicienUniversStats['universes'] = {};
    let totalCA = 0;
    let totalHeures = 0;
    const totalDossiers = new Set<string>();

    Object.keys(techData.universes).forEach((univers) => {
      const data = techData.universes[univers];
      const caHT = data.caHT;
      const heures = data.heures;
      const caParHeure = heures > 0 ? caHT / heures : 0;
      const nbDossiers = data.nbDossiers.size;

      universesData[univers] = {
        caHT,
        heures,
        caParHeure,
        nbDossiers,
      };

      totalCA += caHT;
      totalHeures += heures;
      data.nbDossiers.forEach((d) => totalDossiers.add(d));
    });

    result.push({
      technicienId: uniqueTechId,
      technicienNom: techData.nom,
      technicienColor: techData.color,
      technicienActif: techData.actif,
      agencySlug: techData.agencySlug,
      universes: universesData,
      totaux: {
        caHT: totalCA,
        heures: totalHeures,
        caParHeure: totalHeures > 0 ? totalCA / totalHeures : 0,
        nbDossiers: totalDossiers.size,
      },
    });
  });

  // Trier par CA total décroissant
  return result.sort((a, b) => b.totaux.caHT - a.totaux.caHT);
}
