import { parseISO, isWithinInterval, startOfMonth, endOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";
import { isInitInvoice, INIT_INVOICE_PARTICULIERS, getInitInvoiceApporteursAmount } from "./dashboardCalculations";

export interface MonthlySegmentData {
  month: string;
  caParticuliers: number;
  caApporteurs: number;
  totalCA: number;
  partParticuliers: number; // en %
  partApporteurs: number; // en %
}

/**
 * Calcule l'évolution mensuelle du CA par segment (Particuliers vs Apporteurs)
 */
export const calculateMonthlySegmentation = (
  factures: any[],
  clients: any[],
  projects: any[],
  year: number
): MonthlySegmentData[] => {
  const clientsMap = new Map(clients.map(c => [c.id, c]));
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  const monthlyData: MonthlySegmentData[] = [];
  
  // Pour chaque mois de l'année
  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthLabel = format(date, "MMM", { locale: fr });
    
    let caParticuliers = 0;
    let caApporteurs = 0;
    
    factures.forEach(facture => {
      const dateEmission = facture.dateEmission || facture.dateReelle || facture.created_at;
      if (!dateEmission) return;
      
      try {
        const factureDate = parseISO(dateEmission);
        if (!isWithinInterval(factureDate, { start: monthStart, end: monthEnd })) return;
        
        // Récupérer le projet
        const project = projectsMap.get(facture.projectId);
        if (!project) return;
        
        // Déterminer si c'est un particulier ou apporteur
        const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
        const estParticulier = !commanditaireId;
        
        // Récupérer le client
        const client = clientsMap.get(facture.clientId);
        
        // Vérifier si c'est la facture d'init JANVIER 2025
        const isInit = isInitInvoice(facture, client, project);
        
        // Vérifier type de facture
        const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
        
        let montant = 0;
        if (isInit) {
          // Répartir la facture d'init entre particuliers et apporteurs
          if (estParticulier) {
            montant = INIT_INVOICE_PARTICULIERS; // 19 419,94 € pour les particuliers
          } else {
            montant = getInitInvoiceApporteursAmount(facture); // Le reste pour les apporteurs
          }
        } else {
          // Calculer le montant normal
          const montantRaw = facture.data?.totalHT || facture.totalHT || "0";
          montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
        }
        
        if (isNaN(montant)) return;
        
        // Ajouter au bon segment (déduire les avoirs)
        if (typeFacture === "avoir") {
          montant = -Math.abs(montant); // Avoirs sont négatifs
        }
        
        if (estParticulier) {
          caParticuliers += montant;
        } else {
          caApporteurs += montant;
        }
      } catch {
        return;
      }
    });
    
    const totalCA = caParticuliers + caApporteurs;
    const partParticuliers = totalCA > 0 ? (caParticuliers / totalCA) * 100 : 0;
    const partApporteurs = totalCA > 0 ? (caApporteurs / totalCA) * 100 : 0;
    
    monthlyData.push({
      month: monthLabel,
      caParticuliers,
      caApporteurs,
      totalCA,
      partParticuliers,
      partApporteurs
    });
  }
  
  return monthlyData;
};
