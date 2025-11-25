/**
 * Configuration manuelle pour les données historiques de janvier 2025
 * 
 * CONTEXTE:
 * - L'activité Apogée n'a commencé qu'en février 2025
 * - En janvier 2025, l'ancien logiciel contenait toutes les interventions
 * - Un transfert comptable unique a été fait dans Apogée sous forme d'une seule facture
 *   d'environ 90 000 € sans apporteur
 * - Cette facture est fictive pour Apogée et ne doit jamais être prise en compte
 *   dans les calculs statistiques
 * 
 * USAGE:
 * - Renseigner les valeurs réelles de CA pour janvier 2025 ci-dessous
 * - Ces valeurs seront automatiquement injectées dans tous les calculs du dashboard
 * - Si enabled = false, les valeurs manuelles ne seront pas utilisées
 */

export interface ManualJanuaryData {
  enabled: boolean;
  year: number;
  month: number; // 1 = janvier
  ca_particuliers: number;
  ca_apporteurs: number;
}

export const manualJanuaryData: ManualJanuaryData = {
  enabled: true,
  year: 2025,
  month: 1, // janvier
  ca_particuliers: 0, // À renseigner par l'utilisateur
  ca_apporteurs: 0,   // À renseigner par l'utilisateur
};

/**
 * Vérifie si une date correspond au mois manuel (janvier 2025)
 */
export const isManualOverrideMonth = (year: number, month: number): boolean => {
  if (!manualJanuaryData.enabled) return false;
  return year === manualJanuaryData.year && month === manualJanuaryData.month;
};

/**
 * Identifie si une facture est la facture fictive de transfert comptable
 * à exclure de tous les calculs
 */
export const isFictitiousTransferInvoice = (facture: any): boolean => {
  if (!facture) return false;
  
  // Critère 1: Montant très élevé (> 85 000 €)
  const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
  const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
  
  if (!isNaN(montant) && montant > 85000) {
    return true;
  }
  
  // Critère 2: ID spécifique si connu
  // À adapter selon l'identifiant exact de la facture
  if (facture.id === "FACTURE_TRANSFERT_JANVIER_2025") {
    return true;
  }
  
  // Critère 3: Référence spécifique
  if (facture.reference === "TRANSFERT_2025" || facture.numeroFacture === "TRANSFERT_2025") {
    return true;
  }
  
  return false;
};
