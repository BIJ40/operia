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
    
    // Traiter d'abord les factures normales
    const initInvoiceProcessed = new Set(); // Éviter de compter la facture d'init plusieurs fois
    
    factures.forEach(facture => {
      const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
      if (!dateReelle) return;
      
      try {
        const factureDate = parseISO(dateReelle);
        if (!isWithinInterval(factureDate, { start: monthStart, end: monthEnd })) return;
        
        // Récupérer le projet et client
        const project = projectsMap.get(facture.projectId);
        if (!project) return;
        
        const client = clientsMap.get(facture.clientId);
        
        // Vérifier si c'est la facture d'init JANVIER 2025
        const isInit = isInitInvoice(facture, client, project);
        
        if (isInit) {
          // Répartir la facture d'init UNE SEULE FOIS entre les deux segments
          const factureId = facture.id || facture.numeroFacture;
          if (!initInvoiceProcessed.has(factureId)) {
            initInvoiceProcessed.add(factureId);
            
            // Montant total de la facture
            const montantRaw = facture.data?.totalHT || facture.totalHT || "0";
            const montantTotal = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
            
            if (!isNaN(montantTotal)) {
              // Répartition fixe selon les règles métier
              caParticuliers += INIT_INVOICE_PARTICULIERS; // 19 419,94 €
              caApporteurs += (montantTotal - INIT_INVOICE_PARTICULIERS); // Le reste
            }
          }
          return;
        }
        
        // Traitement des factures normales (non-init)
        const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
        const estParticulier = !commanditaireId;
        
        // Calculer le montant
        const montantRaw = facture.data?.totalHT || facture.totalHT || "0";
        let montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
        
        if (isNaN(montant)) return;
        
        // Vérifier type de facture (avoir = négatif)
        const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
        if (typeFacture === "avoir") {
          montant = -Math.abs(montant);
        }
        
        // Ajouter au bon segment
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
