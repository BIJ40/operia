import { parseISO, isWithinInterval, startOfMonth, endOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";
import { isInitInvoice } from "./dashboardCalculations";
import { manualJanuaryData, isManualOverrideMonth } from "@/apogee-connect/config/manualOverrides";

export interface MonthlyCA {
  month: string;
  ca: number;
  nbFactures: number;
}

export const calculateMonthlyCA = (
  factures: any[],
  clients: any[],
  projects: any[],
  year: number,
  userAgency: string
): MonthlyCA[] => {
  const clientsMap = new Map(clients.map(c => [c.id, c]));
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  const monthlyData: MonthlyCA[] = [];
  
  // Pour chaque mois de l'année
  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthLabel = format(date, "MMM", { locale: fr });
    
    // Vérifier si c'est janvier 2025 avec override manuel pour cette agence
    if (isManualOverrideMonth(year, month + 1, userAgency)) {
      if (import.meta.env.DEV) {
        console.log(`📅 OVERRIDE MANUEL - Janvier ${year} (agence: ${userAgency}): CA manuel = ${manualJanuaryData.ca_particuliers + manualJanuaryData.ca_apporteurs}€`);
      }
      
      // Utiliser les valeurs manuelles configurées
      monthlyData.push({
        month: monthLabel,
        ca: manualJanuaryData.ca_particuliers + manualJanuaryData.ca_apporteurs,
        nbFactures: manualJanuaryData.nb_factures_particuliers + manualJanuaryData.nb_factures_apporteurs
      });
      continue; // Passer au mois suivant
    }
    
    let caMonth = 0;
    let nbFacturesMonth = 0;
    
    factures.forEach(facture => {
      const dateEmission = facture.dateEmission || facture.dateReelle || facture.created_at;
      if (!dateEmission) return;
      
      try {
        const factureDate = parseISO(dateEmission);
        if (!isWithinInterval(factureDate, { start: monthStart, end: monthEnd })) return;
        
        // Exclure les factures d'initialisation
        const client = clientsMap.get(facture.clientId);
        const project = projectsMap.get(facture.projectId);
        if (isInitInvoice(facture, client, project)) return;
        
        // Calculer le montant
        const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
        const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
        
        if (isNaN(montant)) return;
        
        const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
        
        nbFacturesMonth++;
        if (typeFacture === "avoir") {
          caMonth -= Math.abs(montant);
        } else {
          caMonth += montant;
        }
      } catch {
        return;
      }
    });
    
    monthlyData.push({
      month: monthLabel,
      ca: caMonth,
      nbFactures: nbFacturesMonth
    });
  }
  
  return monthlyData;
};
