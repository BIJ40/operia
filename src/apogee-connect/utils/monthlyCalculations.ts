import { parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";

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
  
  // Filtrer et traiter les factures
  factures.forEach(facture => {
    // 1. Filtrer sur type == "facture" (exclure les avoirs)
    const type = facture.type || facture.data?.type || facture.typeFacture;
    if (type !== "facture" && type !== "Facture") return;
    
    // 2. Filtrer sur dateReelle et année
    const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
    if (!dateReelle) return;
    
    try {
      const factureDate = parseISO(dateReelle);
      const factureYear = factureDate.getFullYear();
      
      // Vérifier que c'est bien l'année demandée
      if (factureYear !== year) return;
      
      // 3. Récupérer le mois (0-11)
      const month = factureDate.getMonth();
      const monthData = monthlyData[month];
      
      // 4. Récupérer le montant totalHT
      const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      
      if (isNaN(montant) || montant === 0) return;
      
      // 5. Accumuler le CA et compter la facture
      monthData.caTotal += montant;
      monthData.nbFactures++;
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Erreur parsing date facture:', dateReelle, error);
      }
    }
  });
  
  // Retourner dans le format attendu par MonthlyCAChart
  return monthlyData.map(m => ({
    month: m.monthLabel,
    ca: m.caTotal,
    nbFactures: m.nbFactures
  }));
};
