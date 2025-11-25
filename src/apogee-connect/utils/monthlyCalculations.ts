import { parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";
import { manualJanuaryData, isManualOverrideMonth, isFictitiousTransferInvoice } from "@/apogee-connect/config/manualOverrides";

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
  // Créer les maps pour accès rapide
  const clientsMap = new Map(clients.map(c => [String(c.id), c]));
  const projectsMap = new Map(projects.map(p => [String(p.id), p]));
  
  // Filtrer les factures de l'année demandée et exclure la facture de transfert
  const facturesFiltered = factures.filter(facture => {
    // Exclure la facture de transfert fictive
    if (isFictitiousTransferInvoice(facture)) {
      if (import.meta.env.DEV) {
        console.log('🚫 Facture de transfert exclue:', facture.reference, facture.totalHT);
      }
      return false;
    }
    
    // Filtrer sur l'année
    const dateEmission = facture.dateEmission || facture.dateReelle || facture.created_at;
    if (!dateEmission) return false;
    
    try {
      const factureDate = parseISO(dateEmission);
      return factureDate.getFullYear() === year;
    } catch {
      return false;
    }
  });
  
  // Initialiser les données mensuelles
  const monthlyData: Array<{
    month: number;
    monthLabel: string;
    caTotal: number;
    caParticuliers: number;
    caApporteurs: number;
    nbFactures: number;
  }> = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1);
    return {
      month: i + 1,
      monthLabel: format(date, "MMM", { locale: fr }),
      caTotal: 0,
      caParticuliers: 0,
      caApporteurs: 0,
      nbFactures: 0
    };
  });
  
  // Traiter chaque facture
  for (const facture of facturesFiltered) {
    const dateEmission = facture.dateEmission || facture.dateReelle || facture.created_at;
    if (!dateEmission) continue;
    
    try {
      const factureDate = parseISO(dateEmission);
      const month = factureDate.getMonth(); // 0-11
      const monthData = monthlyData[month];
      
      // Récupérer le montant
      const montantRaw = facture.totalHT || facture.montantHT || facture.data?.totalHT || "0";
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      
      if (isNaN(montant) || montant === 0) continue;
      
      // Gérer les avoirs (montants négatifs)
      const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
      const montantFinal = typeFacture === "avoir" ? -Math.abs(montant) : montant;
      
      // Déterminer si c'est un particulier ou un apporteur
      // via le projet → commanditaireId
      const project = projectsMap.get(String(facture.projectId));
      const commanditaireId = project?.data?.commanditaireId || project?.commanditaireId;
      
      const isParticulier = !commanditaireId;
      const isApporteur = !!commanditaireId;
      
      // Accumuler les montants
      monthData.caTotal += montantFinal;
      monthData.nbFactures++;
      
      if (isParticulier) {
        monthData.caParticuliers += montantFinal;
      } else if (isApporteur) {
        monthData.caApporteurs += montantFinal;
      }
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Erreur parsing facture:', facture.reference, error);
      }
      continue;
    }
  }
  
  // Appliquer les overrides manuels pour janvier si applicable
  if (isManualOverrideMonth(year, 1, userAgency)) {
    const januaryData = monthlyData[0]; // index 0 = janvier
    
    if (import.meta.env.DEV) {
      console.log(`📅 OVERRIDE MANUEL - Janvier ${year} (agence: ${userAgency}):`, {
        ca_particuliers: manualJanuaryData.ca_particuliers,
        ca_apporteurs: manualJanuaryData.ca_apporteurs,
        ca_total: manualJanuaryData.ca_particuliers + manualJanuaryData.ca_apporteurs,
        nb_factures: manualJanuaryData.nb_factures_particuliers + manualJanuaryData.nb_factures_apporteurs
      });
    }
    
    januaryData.caParticuliers = manualJanuaryData.ca_particuliers;
    januaryData.caApporteurs = manualJanuaryData.ca_apporteurs;
    januaryData.caTotal = manualJanuaryData.ca_particuliers + manualJanuaryData.ca_apporteurs;
    januaryData.nbFactures = manualJanuaryData.nb_factures_particuliers + manualJanuaryData.nb_factures_apporteurs;
  }
  
  // Retourner dans le format attendu par MonthlyCAChart
  return monthlyData.map(m => ({
    month: m.monthLabel,
    ca: m.caTotal,
    nbFactures: m.nbFactures
  }));
};
