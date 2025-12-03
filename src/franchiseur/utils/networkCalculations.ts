import { parseISO, isWithinInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, parse } from "date-fns";
import { logNetwork } from "@/lib/logger";

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
 * Calculate top 3 apporteurs across all agencies by CA
 */
export function calculateTop3Apporteurs(agencyData: AgencyData[]): Array<{ name: string; ca: number; nbDossiers: number; rank: number }> {
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
      if (!commanditaireId) return;

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
      
      apporteurMap.set(commanditaireId, existing);
    });
  });

  // Count unique projects per apporteur
  agencyData.forEach((agency) => {
    if (!agency.data?.projects) return;

    agency.data.projects.forEach((project: any) => {
      const projectData = project as any;
      const commanditaireId = projectData.data?.commanditaireId;
      if (!commanditaireId) return;

      const existing = apporteurMap.get(commanditaireId);
      if (existing) {
        existing.nbDossiers += 1;
      }
    });
  });

  // Sort by CA and take top 3
  const sortedApporteurs = Array.from(apporteurMap.values())
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 3)
    .map((apporteur, index) => ({
      ...apporteur,
      rank: index + 1
    }));

  return sortedApporteurs;
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
  logNetwork.debug('Calcul SAV réseau - agences brutes', {
    agences: agencyData.map(a => ({
      id: a.agencyId,
      name: a.agencyLabel,
      projects: a.data?.projects?.length || 0,
      interventions: a.data?.interventions?.length || 0
    }))
  });

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

  logNetwork.debug('SAV global par agence', { agencySAVDetails });

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

  logNetwork.debug('SAV réseau - résultat final', {
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
 * Calculate average number of visits/RDV per project
 */
export function calculateVisitsPerProject(agencyData: AgencyData[]): number {
  let totalVisits = 0;
  let projectsWithVisits = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;

    const visitsByProject = new Map<number, number>();
    
    agency.data.interventions.forEach((intervention: any) => {
      const count = visitsByProject.get(intervention.projectId) || 0;
      visitsByProject.set(intervention.projectId, count + 1);
    });

    agency.data.projects.forEach((project: any) => {
      const visitCount = visitsByProject.get(project.id) || 0;
      if (visitCount > 0) {
        totalVisits += visitCount;
        projectsWithVisits += 1;
      }
    });
  });

  return projectsWithVisits > 0 ? Math.round((totalVisits / projectsWithVisits) * 10) / 10 : 0;
}

/**
 * Calculate % of multi-universe projects
 */
export function calculateMultiUniverseRate(agencyData: AgencyData[]): number {
  let totalProjects = 0;
  let multiUniverseProjects = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects) return;

    agency.data.projects.forEach((project: any) => {
      totalProjects++;
      
      // Check for multiple universes
      const universList = project.data?.univers || project.univers || [];
      if (Array.isArray(universList) && universList.length > 1) {
        multiUniverseProjects++;
      }
    });
  });

  return totalProjects > 0 ? Math.round((multiUniverseProjects / totalProjects) * 1000) / 10 : 0;
}

/**
 * Calculate total CA for a period
 */
export function calculateTotalCA(agencyData: AgencyData[], dateRange?: { start: Date; end: Date }): number {
  const now = new Date();
  const start = dateRange?.start || startOfYear(now);
  const end = dateRange?.end || endOfYear(now);

  return agencyData.reduce((total, agency) => {
    if (!agency.data?.factures) return total;

    const ca = agency.data.factures
      .filter((f: any) => {
        if (f.type === 'avoir') return false;
        const dateReelle = f.dateReelle || f.dateEmission || f.created_at;
        const factureDate = parseDate(dateReelle);
        return factureDate && isWithinInterval(factureDate, { start, end });
      })
      .reduce((sum: number, f: any) => {
        const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
        const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
        return sum + montant;
      }, 0);

    return total + ca;
  }, 0);
}

/**
 * Calculate CA for current month
 */
export function calculateMonthlyCA(agencyData: AgencyData[]): number {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  return calculateTotalCA(agencyData, { start: monthStart, end: monthEnd });
}

/**
 * Calculate CA for current year
 */
export function calculateYearlyCA(agencyData: AgencyData[]): number {
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  
  return calculateTotalCA(agencyData, { start: yearStart, end: yearEnd });
}

/**
 * Calculate best apporteur by number of projects
 */
export function calculateBestApporteurByProjects(agencyData: AgencyData[]) {
  const apporteurMap = new Map<number, { name: string; nbDossiers: number }>();

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.clients) return;

    const clientsMap = new Map(
      agency.data.clients.map((c: any) => [c.id, c.nom || c.prenom || "Apporteur sans nom"])
    );

    agency.data.projects.forEach((project: any) => {
      const commanditaireId = project.data?.commanditaireId;
      if (!commanditaireId) return;

      const existing = apporteurMap.get(commanditaireId) || { 
        name: clientsMap.get(commanditaireId) as string || "Inconnu", 
        nbDossiers: 0 
      };
      
      existing.nbDossiers += 1;
      apporteurMap.set(commanditaireId, existing);
    });
  });

  // Find best by number of projects
  let bestApporteur = null;
  let maxDossiers = 0;

  apporteurMap.forEach((stats) => {
    if (stats.nbDossiers > maxDossiers) {
      maxDossiers = stats.nbDossiers;
      bestApporteur = stats;
    }
  });

  return bestApporteur;
}

/**
 * Calculate monthly SAV evolution for the current year
 */
export function calculateMonthlySAVEvolution(agencyData: AgencyData[]) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyData = months.map((month) => ({ month, tauxSAV: 0, nbProjects: 0, nbSAVProjects: 0 }));

  const now = new Date();
  const currentYear = now.getFullYear();

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;

    // Group projects by month
    agency.data.projects.forEach((project: any) => {
      const createdAt = parseDate(project.createdAt || project.created_at);
      if (!createdAt || createdAt.getFullYear() !== currentYear) return;

      const monthIndex = createdAt.getMonth();
      monthlyData[monthIndex].nbProjects += 1;

      // Check if this project has SAV interventions
      const hasSAV = agency.data.interventions.some((intervention: any) => {
        if (intervention.projectId !== project.id) return false;
        const type2 = intervention.type2 || intervention.data?.type2 || "";
        const type = intervention.type || intervention.data?.type || "";
        return type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");
      });

      if (hasSAV) {
        monthlyData[monthIndex].nbSAVProjects += 1;
      }
    });
  });

  // Calculate SAV rate for each month
  return monthlyData.map(m => ({
    month: m.month,
    tauxSAV: m.nbProjects > 0 ? Math.round((m.nbSAVProjects / m.nbProjects) * 1000) / 10 : 0,
  }));
}

/**
 * Alias for calculateMultiUniverseRate with alternate spelling
 */
export const calculateMultiUniversRate = calculateMultiUniverseRate;

/**
 * Network technicien universe stats type
 */
export interface NetworkTechnicienUniversStats {
  technicienId: string;
  technicienNom: string;
  technicienColor: string;
  technicienActif: boolean;
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

/**
 * Aggregate Univers × Apporteur matrix across multiple agencies
 * Returns Record<univers, Record<apporteurType, { ca, nbDossiers }>>
 */
export function aggregateUniversApporteurMatrix(
  agencyData: AgencyData[],
  dateRange?: { start: Date; end: Date }
): Record<string, Record<string, { ca: number; nbDossiers: number }>> {
  const matrix: Record<string, Record<string, { ca: number; nbDossiers: number }>> = {};

  agencyData.forEach((agency) => {
    if (!agency.data?.factures || !agency.data?.projects || !agency.data?.clients) return;

    const projectsMap = new Map(agency.data.projects.map((p: any) => [p.id, p]));
    const clientsMap = new Map(agency.data.clients.map((c: any) => [c.id, c]));

    agency.data.factures.forEach((facture: any) => {
      if (facture.type === 'avoir') return;

      const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
      const factureDate = parseDate(dateReelle);
      if (!factureDate) return;
      if (dateRange && !isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end })) return;

      const project = projectsMap.get(facture.projectId) as any;
      if (!project) return;

      const commanditaireId = project.data?.commanditaireId;
      if (!commanditaireId) return;

      const client = clientsMap.get(commanditaireId) as any;
      if (!client) return;

      // API returns "universes" (plural) not "univers" (singular)
      const universList = project.data?.universes || project.data?.univers || project.universes || project.univers || [];
      const montantRaw = facture.data?.totalHT || facture.totalHT || facture.montantHT || 0;
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;

      // Get apporteur type from client
      const apporteurType = client.data?.type || client.type || 'particulier';

      if (Array.isArray(universList) && universList.length > 0) {
        const caPerUnivers = montant / universList.length;
        universList.forEach((univers: string) => {
          if (!matrix[univers]) {
            matrix[univers] = {};
          }
          if (!matrix[univers][apporteurType]) {
            matrix[univers][apporteurType] = { ca: 0, nbDossiers: 0 };
          }
          matrix[univers][apporteurType].ca += caPerUnivers;
          matrix[univers][apporteurType].nbDossiers += 1 / universList.length;
        });
      }
    });
  });

  return matrix;
}

/**
 * Calculate tech time by project for a single agency
 * Excludes RT, SAV, only counts productive types (biDepan, biTvx), validated visits only
 * CRITICAL: Only counts time for actual technicians (user.type === 'technicien')
 * Returns time per tech per project for CA prorating
 */
function calculateTechTimeByProjectForAgency(
  interventions: any[],
  usersMap: Map<number, any>
): {
  dureeTechParProjet: Record<number, Record<number, number>>;
  dureeTotaleParProjet: Record<number, number>;
} {
  const dureeTechParProjet: Record<number, Record<number, number>> = {};
  const dureeTotaleParProjet: Record<number, number> = {};

  interventions.forEach((intervention) => {
    const projectId = intervention.projectId;
    if (!projectId) return;

    // RÈGLE: Exclure les RT (relevés techniques)
    const isRT =
      intervention.data?.biRt?.isValidated === true ||
      intervention.data?.type2 === "RT" ||
      intervention.type2?.toUpperCase() === "RT";
    if (isRT) return;

    // RÈGLE: Exclure les SAV
    const type2Lower = (intervention.data?.type2 || intervention.type2 || "").toLowerCase();
    const typeRaw = (intervention.data?.type || intervention.type || "").toLowerCase();
    const isSAV = type2Lower.includes("sav") || typeRaw.includes("sav");
    if (isSAV) return;

    // RÈGLE: Types productifs uniquement (biDepan ou biTvx validés)
    const isProductive = intervention.data?.biDepan || intervention.data?.biTvx;
    if (!isProductive) return;

    // Initialiser le projet si nécessaire
    if (!dureeTechParProjet[projectId]) {
      dureeTechParProjet[projectId] = {};
      dureeTotaleParProjet[projectId] = 0;
    }

    // RÈGLE: Parcourir les visites VALIDÉES uniquement
    const visites = intervention.data?.visites || [];
    visites.forEach((visite: any) => {
      if (visite.state !== "validated") return;

      const duree = Number(visite.duree) || 0;
      if (duree <= 0) return;
      
      const usersIds = visite.usersIds || [];

      // CRITICAL FIX: Ne compter QUE les techniciens actifs
      // Règle: isTechnicien=true OU type="technicien" OU (type="utilisateur" ET universes non vide)
      const technicienIds = usersIds.filter((userId: number) => {
        const user = usersMap.get(userId);
        if (!user) return false;
        
        const hasUniverses = Array.isArray(user?.data?.universes) && user.data.universes.length > 0;
        const isTechnicien = 
          user?.isTechnicien === true || 
          user?.type === "technicien" ||
          (user?.type === "utilisateur" && hasUniverses);
        
        // Vérifier aussi que le user est actif
        const isActive = user?.is_on === true || user?.isActive === true;
        
        return isTechnicien && isActive;
      });

      // Si aucun technicien sur cette visite, ignorer
      if (technicienIds.length === 0) return;

      technicienIds.forEach((techId: number) => {
        if (!dureeTechParProjet[projectId][techId]) {
          dureeTechParProjet[projectId][techId] = 0;
        }
        // Chaque technicien compte la durée complète de la visite
        dureeTechParProjet[projectId][techId] += duree;
        dureeTotaleParProjet[projectId] += duree;
      });
    });
  });

  return { dureeTechParProjet, dureeTotaleParProjet };
}

/**
 * Aggregate Technicien × Univers stats across multiple agencies
 * Joins factures → projects → interventions → users to attribute CA to technicians
 * ALIGNED WITH STATIA_RULES: excludes RT/SAV, prorata by time, validated visits only
 */
export function aggregateTechnicienUniversStats(
  agencyData: AgencyData[],
  dateRange?: { start: Date; end: Date }
): NetworkTechnicienUniversStats[] {
  const techMap = new Map<string, NetworkTechnicienUniversStats>();

  agencyData.forEach((agency) => {
    if (!agency.data?.factures || !agency.data?.projects || !agency.data?.interventions || !agency.data?.users) return;

    const usersMap = new Map<number, any>(agency.data.users.map((u: any) => [u.id, u]));
    const projectsMap = new Map(agency.data.projects.map((p: any) => [p.id, p]));

    // RÈGLE: Calculer le temps passé par technicien par projet (excluant RT/SAV, visites validées uniquement, techniciens uniquement)
    const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProjectForAgency(agency.data.interventions, usersMap);

    // Process factures and attribute CA to technicians via time prorating
    agency.data.factures.forEach((facture: any) => {
      if (facture.type === 'avoir') return;

      const factureDate = parseDate(facture.dateReelle || facture.dateEmission || facture.created_at);
      if (!factureDate) return;
      if (dateRange && !isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end })) return;

      const montantRaw = facture.data?.totalHT || facture.totalHT || facture.montantHT || 0;
      const caHT = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
      if (caHT <= 0) return;

      const project = projectsMap.get(facture.projectId) as any;
      if (!project) return;

      // Get universes from project
      const universList = project.data?.universes || project.data?.univers || project.universes || project.univers || [];
      const nbUniverses = Array.isArray(universList) && universList.length > 0 ? universList.length : 1;

      // RÈGLE: Récupérer les durées par technicien pour ce projet
      const dureesParTech = dureeTechParProjet[facture.projectId] || {};
      const dureeTotale = dureeTotaleParProjet[facture.projectId] || 0;

      // Si pas de temps attribué (pas de visites validées productives), ignorer la facture
      if (dureeTotale === 0) return;

      // RÈGLE: Répartir le CA PRORATA AU TEMPS (duration_facturee)
      Object.entries(dureesParTech).forEach(([techIdStr, dureeTech]) => {
        const techId = Number(techIdStr);
        const user = usersMap.get(techId) as any;
        
        // Filtrer uniquement les techniciens
        if (!user || user.type !== 'technicien') return;

        // RÈGLE: Prorata temps
        const partTech = (dureeTech as number) / dureeTotale;
        const caTechFacture = caHT * partTech;
        const heuresTech = (dureeTech as number) / 60;

        const techKey = String(techId);
        const techName = `${user.firstname || ''} ${user.name || ''}`.trim() || `Tech ${techId}`;

        if (!techMap.has(techKey)) {
          techMap.set(techKey, {
            technicienId: techKey,
            technicienNom: techName,
            technicienColor: user.data?.bgcolor?.hex || user.couleur || "#666",
            technicienActif: user.is_on !== false,
            universes: {},
            totaux: { caHT: 0, heures: 0, caParHeure: 0, nbDossiers: 0 },
          });
        }

        const tech = techMap.get(techKey)!;
        tech.totaux.caHT += caTechFacture;
        tech.totaux.heures += heuresTech;
        tech.totaux.nbDossiers += partTech; // Prorata pour le dossier aussi

        // Distribute across universes (pro-rata si multi-univers)
        if (Array.isArray(universList) && universList.length > 0) {
          universList.forEach((univers: string) => {
            if (!tech.universes[univers]) {
              tech.universes[univers] = { caHT: 0, heures: 0, caParHeure: 0, nbDossiers: 0 };
            }
            tech.universes[univers].caHT += caTechFacture / nbUniverses;
            tech.universes[univers].heures += heuresTech / nbUniverses;
            tech.universes[univers].nbDossiers += partTech / nbUniverses;
          });
        }
      });
    });
  });

  // Calculate caParHeure and apply rounding for all techs
  techMap.forEach((tech) => {
    // RÈGLE: Arrondis
    tech.totaux.caHT = Math.round(tech.totaux.caHT * 100) / 100;
    tech.totaux.heures = Math.round(tech.totaux.heures * 10) / 10;
    tech.totaux.nbDossiers = Math.round(tech.totaux.nbDossiers * 10) / 10;
    tech.totaux.caParHeure = tech.totaux.heures > 0 ? Math.round(tech.totaux.caHT / tech.totaux.heures) : 0;

    Object.keys(tech.universes).forEach((univers) => {
      const u = tech.universes[univers];
      u.caHT = Math.round(u.caHT * 100) / 100;
      u.heures = Math.round(u.heures * 10) / 10;
      u.nbDossiers = Math.round(u.nbDossiers * 10) / 10;
      u.caParHeure = u.heures > 0 ? Math.round(u.caHT / u.heures) : 0;
    });
  });

  // Sort by total CA descending
  return Array.from(techMap.values()).sort((a, b) => b.totaux.caHT - a.totaux.caHT);
}
