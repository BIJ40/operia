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
 * en se basant STRICTEMENT sur les factures (même logique que le CA global).
 */
export const calculateMonthlySegmentation = (
  factures: any[],
  clients: any[],
  projects: any[],
  year: number
): MonthlySegmentData[] => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));

  // Préparer les 12 mois de l'année
  const monthlyData: MonthlySegmentData[] = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(year, monthIndex, 1);
    return {
      month: format(date, "MMM", { locale: fr }),
      caParticuliers: 0,
      caApporteurs: 0,
      totalCA: 0,
      partParticuliers: 0,
      partApporteurs: 0,
    };
  });

  factures.forEach((facture) => {
    // Exclure les avoirs
    const typeFacture = (facture.type || facture.typeFacture || facture.data?.type || facture.state || "").toLowerCase();
    if (typeFacture === "avoir") return;

    // Date de référence de la facture (même logique que les autres KPIs)
    const dateStr = facture.dateReelle || facture.dateEmission || facture.date || facture.created_at;
    if (!dateStr) return;

    let factureDate: Date;
    try {
      factureDate = parseISO(dateStr);
    } catch {
      return;
    }

    if (factureDate.getFullYear() !== year) return;

    const monthIndex = factureDate.getMonth(); // 0-11
    const monthData = monthlyData[monthIndex];
    if (!monthData) return;

    // Récupérer le projet lié à la facture
    const project = projectsMap.get(facture.projectId);
    if (!project) return;

    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    const estParticulier = !commanditaireId;

    // Montant HT de la facture (aligné avec les autres calculs CA)
    const montantRaw =
      facture.totalHT ||
      facture.montantHT ||
      facture.data?.totalHT ||
      facture.data?.montantHT ||
      "0";
    let montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ""));
    if (isNaN(montant)) return;

    if (estParticulier) {
      monthData.caParticuliers += montant;
    } else {
      monthData.caApporteurs += montant;
    }
  });

  // Calculer totaux et pourcentages par mois
  monthlyData.forEach((m) => {
    m.totalCA = m.caParticuliers + m.caApporteurs;
    if (m.totalCA > 0) {
      m.partParticuliers = (m.caParticuliers / m.totalCA) * 100;
      m.partApporteurs = (m.caApporteurs / m.totalCA) * 100;
    } else {
      m.partParticuliers = 0;
      m.partApporteurs = 0;
    }
  });

  return monthlyData;
};
