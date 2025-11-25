import { parseISO, isWithinInterval } from "date-fns";

export interface PipelineStage {
  name: string;
  count: number;
  percentage: number;
  conversionRate?: number;
}

export interface PipelineData {
  stages: PipelineStage[];
  totalDossiers: number;
}

export const calculatePipelineStats = (
  projects: any[],
  interventions: any[],
  devis: any[],
  factures: any[],
  dateRange?: { start: Date; end: Date }
): PipelineData => {
  console.log("🔍 calculatePipelineStats - Début", {
    projects: projects?.length || 0,
    interventions: interventions?.length || 0,
    devis: devis?.length || 0,
    factures: factures?.length || 0,
    dateRange
  });

  // Fonction de filtrage par date
  const filterByDate = (items: any[], dateField: string = "created_at") => {
    if (!dateRange) return items;
    
    return items.filter(item => {
      const dateValue = item[dateField] || item.date || item.dateIntervention;
      if (!dateValue) return false;
      
      try {
        const itemDate = parseISO(dateValue);
        return isWithinInterval(itemDate, { start: dateRange.start, end: dateRange.end });
      } catch {
        return false;
      }
    });
  };

  // Filtrer les données par la période pour chaque type
  const filteredProjects = filterByDate(projects);
  const filteredInterventions = filterByDate(interventions);
  const filteredDevis = filterByDate(devis);

  // Pour les travaux réalisés, on applique la même logique de date que pour le CA :
  // on prend toutes les factures émises dans la période (dateEmission / dateReelle / created_at)
  const filteredFactures = (factures || []).filter(facture => {
    const dateEmission = facture.dateEmission || facture.dateReelle || facture.created_at;
    if (!dateEmission || !dateRange) return false;

    try {
      const factureDate = parseISO(dateEmission);
      return isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end });
    } catch {
      return false;
    }
  });

  console.log("🔍 Factures filtrées (pipeline):", filteredFactures.length);
  if (filteredFactures.length > 0) {
    console.log("📄 Exemple de facture (pipeline):", filteredFactures[0]);
  }

  // On considère qu'une facture = travaux réalisés (peu importe le statut),
  // ce qui évite de tomber à 0% alors qu'il y a du CA
  const travauxRealises = filteredFactures.length;

  console.log("✅ Travaux réalisés comptés (nb factures période):", travauxRealises);

  const totalDossiers = filteredProjects.length;

  // Construire les étapes du pipeline
  const stages: PipelineStage[] = [
    {
      name: "Dossiers reçus",
      count: totalDossiers,
      percentage: 100,
    },
    {
      name: "RT réalisés",
      count: filteredInterventions.length,
      percentage: totalDossiers > 0 ? (filteredInterventions.length / totalDossiers) * 100 : 0,
      conversionRate: totalDossiers > 0 ? (filteredInterventions.length / totalDossiers) * 100 : 0,
    },
    {
      name: "Devis émis",
      count: filteredDevis.length,
      percentage: totalDossiers > 0 ? (filteredDevis.length / totalDossiers) * 100 : 0,
      conversionRate: filteredInterventions.length > 0 ? (filteredDevis.length / filteredInterventions.length) * 100 : 0,
    },
    {
      name: "Travaux réalisés",
      count: travauxRealises,
      percentage: totalDossiers > 0 ? (travauxRealises / totalDossiers) * 100 : 0,
      conversionRate: filteredDevis.length > 0 ? (travauxRealises / filteredDevis.length) * 100 : 0,
    },
  ];

  console.log("📊 Pipeline calculé:", stages);

  return {
    stages,
    totalDossiers,
  };
};
