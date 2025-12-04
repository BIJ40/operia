/**
 * Utilitaires pour la classification des interventions
 * Extrait de dashboardCalculations.ts pour modularisation
 */

/**
 * Vérifie si une intervention est un Relevé Technique
 */
export const isRT = (intervention: any): boolean => {
  if (!intervention) return false;
  
  // Vérifier type2
  if (intervention.type2?.toLowerCase().includes("relevé technique") || 
      intervention.type2?.toLowerCase().includes("releve technique")) {
    return true;
  }
  
  // Vérifier data.biRt
  if (intervention.data?.biRt || intervention.data?.isRT) {
    return true;
  }
  
  return false;
};

/**
 * Vérifie si une intervention est un Dépannage
 */
export const isDepannage = (intervention: any): boolean => {
  if (!intervention) return false;
  
  // Vérifier type ou type2
  if (intervention.type?.toLowerCase().includes("dépannage") ||
      intervention.type?.toLowerCase().includes("depannage") ||
      intervention.type2?.toLowerCase().includes("dépannage") ||
      intervention.type2?.toLowerCase().includes("depannage")) {
    return true;
  }
  
  // Vérifier data.biDepan avec travaux réalisés
  if (intervention.data?.biDepan?.items?.some((item: any) => item.isWorkDone || item.tvxEffectues)) {
    return true;
  }
  
  return false;
};

/**
 * Vérifie si une intervention est de type Travaux
 */
export const isTravaux = (intervention: any): boolean => {
  if (!intervention) return false;
  
  // Vérifier type2
  if (intervention.type2?.toLowerCase().includes("travaux")) {
    return true;
  }
  
  // Vérifier data.biTvx ou biV3 avec travaux effectués
  if (intervention.data?.biTvx?.items?.some((item: any) => item.isWorkDone || item.tvxEffectues) ||
      intervention.data?.biV3) {
    return true;
  }
  
  return false;
};

/**
 * Vérifie si une intervention est un SAV
 */
export const isSav = (intervention: any, project?: any): boolean => {
  if (!intervention) return false;
  
  // Vérifier type ou type2
  if (intervention.type?.toLowerCase().includes("sav") ||
      intervention.type2?.toLowerCase().includes("sav")) {
    return true;
  }
  
  // Vérifier history/data
  if (intervention.data?.history?.some((h: any) => 
      h.labelKind?.toLowerCase().includes("sav") || 
      JSON.stringify(h.data || {}).toLowerCase().includes("sav"))) {
    return true;
  }
  
  return false;
};
