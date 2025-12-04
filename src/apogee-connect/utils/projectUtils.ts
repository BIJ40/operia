/**
 * Utilitaires pour la classification des projets/dossiers
 * Extrait de dashboardCalculations.ts pour modularisation
 */

/**
 * PARTICULIER = CLIENT DIRECT = dossier SANS commanditaireId
 * Un dossier est considéré comme "Particulier" si aucun apporteur n'est associé.
 */
export const isParticulier = (project: any): boolean => {
  if (!project) return false;
  const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
  return !commanditaireId;
};

/**
 * APPORTEUR = dossier AVEC commanditaireId renseigné
 * Un dossier est considéré comme "Apporteur" si un apporteur est associé.
 */
export const isApporteur = (project: any): boolean => {
  if (!project) return false;
  const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
  return !!commanditaireId;
};
