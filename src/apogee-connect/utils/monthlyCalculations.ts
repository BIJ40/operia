import { parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";
import { logDebug, logError } from "@/lib/logger";

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
  // Initialiser les données mensuelles (12 mois)
  const monthlyData: Array<{
    month: number;
    monthLabel: string;
    caTotal: number;
    nbFactures: number;
  }> = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1);
    return {
      month: i + 1,
      monthLabel: format(date, "MMM", { locale: fr }),
      caTotal: 0,
      nbFactures: 0
    };
  });
  
  if (import.meta.env.DEV) {
    logDebug('MONTHLY_CALC', 'calculateMonthlyCA - Début', { nbFactures: factures.length, year, userAgency });
  }
  
  // Filtrer et traiter les factures
  factures.forEach(facture => {
    // 1. Utiliser la même logique que calculateCaJour pour rester cohérent
    const dateValue = facture.dateEmission || facture.dateReelle || facture.created_at;
    if (!dateValue) return;
    
    try {
      const factureDate = parseISO(dateValue);
      const factureYear = factureDate.getFullYear();
      
      // Vérifier que c'est bien l'année demandée
      if (factureYear !== year) return;
      
      // 2. Récupérer le mois (0-11)
      const month = factureDate.getMonth();
      const monthData = monthlyData[month];
      
      // 3. Extraire le montant HT avec la même stratégie que calculateCaJour
      const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ""));
      
      if (isNaN(montant) || montant === 0) return;
      
      // 4. Gérer le type de facture (facture / avoir)
      const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
      
      if (typeFacture === "avoir" || typeFacture === "Avoir") {
        // Avoirs en négatif
        monthData.caTotal -= Math.abs(montant);
      } else {
        monthData.caTotal += montant;
      }
      
      monthData.nbFactures++;
      
      if (import.meta.env.DEV && monthData.nbFactures <= 3) {
        logDebug('MONTHLY_CALC', 'Facture ajoutée', { ref: facture.reference || facture.numeroFacture, mois: monthData.monthLabel, montant, date: dateValue, type: typeFacture });
      }
      
    } catch (error) {
      if (import.meta.env.DEV) {
        logError('MONTHLY_CALC', 'Erreur parsing date facture', { dateValue, error });
      }
    }
  });
  
  if (import.meta.env.DEV) {
    logDebug('MONTHLY_CALC', 'calculateMonthlyCA - Résultat', { data: monthlyData.map(m => ({ mois: m.monthLabel, ca: m.caTotal, nbFactures: m.nbFactures })) });
  }
  
  // Retourner dans le format attendu par MonthlyCAChart
  return monthlyData.map(m => ({
    month: m.monthLabel,
    ca: m.caTotal,
    nbFactures: m.nbFactures
  }));
};
