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
          const dateReelle = f.dateReelle || f.dateEmission || f.created_at;
          if (!dateReelle) return false;

          const factureDate = parseDate(dateReelle);
          if (!factureDate) return false;
          
          return isWithinInterval(factureDate, { start: yearStart, end: yearEnd });
        })
        .reduce((sum: number, f: any) => {
          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          // Avoirs soustraits comme montants négatifs (STATIA_RULES)
          const typeFacture = (f.type || f.typeFacture || '').toLowerCase();
          const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
          return sum + montantNet;
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
      // Avoirs soustraits comme montants négatifs (STATIA_RULES)
      const typeFacture = (facture.type || facture.typeFacture || '').toLowerCase();
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
      existing.ca += montantNet;
      
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
      // Avoirs soustraits comme montants négatifs (STATIA_RULES)
      const typeFacture = (facture.type || facture.typeFacture || '').toLowerCase();
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
      existing.ca += montantNet;
      
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
      const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
      const factureDate = parseDate(dateReelle);
      
      if (!factureDate || factureDate.getFullYear() !== currentYear) return;

      const monthIndex = factureDate.getMonth();
      const montantRaw = facture.data?.totalHT || facture.totalHT || facture.montantHT || 0;
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
      // Avoirs soustraits comme montants négatifs (STATIA_RULES)
      const typeFacture = (facture.type || facture.typeFacture || '').toLowerCase();
      const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
      
      monthlyData[monthIndex].ca += montantNet;
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
          const dateReelle = f.dateReelle || f.dateEmission || f.created_at;
          const factureDate = parseDate(dateReelle);
          return factureDate && isWithinInterval(factureDate, { start: yearStart, end: yearEnd });
        })
        .reduce((sum: number, f: any) => {
          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          // Avoirs soustraits comme montants négatifs (STATIA_RULES)
          const typeFacture = (f.type || f.typeFacture || '').toLowerCase();
          const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
          return sum + montantNet;
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
 * STATIA_RULES: Avoirs traités comme montants négatifs
 */
export function calculateTotalCA(agencyData: AgencyData[], dateRange?: { start: Date; end: Date }): number {
  const now = new Date();
  const start = dateRange?.start || startOfYear(now);
  const end = dateRange?.end || endOfYear(now);

  return agencyData.reduce((total, agency) => {
    if (!agency.data?.factures) return total;

    const ca = agency.data.factures
      .filter((f: any) => {
        const dateReelle = f.dateReelle || f.dateEmission || f.created_at;
        const factureDate = parseDate(dateReelle);
        return factureDate && isWithinInterval(factureDate, { start, end });
      })
      .reduce((sum: number, f: any) => {
        const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
        const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
        // STATIA_RULES: Avoirs soustraits comme montants négatifs
        const typeFacture = (f.type || f.typeFacture || '').toLowerCase();
        const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
        return sum + montantNet;
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
      const montantBrut = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
      // STATIA_RULES: Avoirs soustraits comme montants négatifs
      const typeFacture = (facture.type || facture.typeFacture || '').toLowerCase();
      const montant = typeFacture === 'avoir' ? -Math.abs(montantBrut) : montantBrut;

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

// NOTE: aggregateTechnicienUniversStats and calculateTechTimeByProjectForAgency 
// have been moved to src/shared/utils/technicienUniversEngine.ts
// Use aggregateTechUniversStatsMultiAgency and computeTechUniversStatsForAgency from that module
