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
 * Calculate network-wide SAV rate
 */
export function calculateSAVRate(agencyData: AgencyData[]): number {
  let totalProjects = 0;
  let savProjects = 0;

  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;

    const projectIds = new Set(agency.data.projects.map((p: any) => p.id));
    totalProjects += projectIds.size;

    const savProjectIds = new Set();
    agency.data.interventions.forEach((intervention: any) => {
      if (intervention.type === 'sav' && projectIds.has(intervention.projectId)) {
        savProjectIds.add(intervention.projectId);
      }
    });

    savProjects += savProjectIds.size;
  });

  return totalProjects > 0 ? (savProjects / totalProjects) * 100 : 0;
}
