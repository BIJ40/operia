/**
 * Endpoints centralisés pour l'API Apogée
 * 
 * Tous les endpoints de l'API Apogée doivent être définis ici.
 * Ne JAMAIS utiliser de strings magiques dans le code.
 * 
 * Structure URL: https://{agence}.hc-apogee.fr/api/{endpoint}
 */

export const APOGEE_ENDPOINTS = {
  /** Récupère la liste des utilisateurs de l'agence */
  USERS: "apiGetUsers",
  
  /** Récupère la liste des clients */
  CLIENTS: "apiGetClients",
  
  /** Récupère la liste des projets/dossiers */
  PROJECTS: "apiGetProjects",
  
  /** Récupère la liste des interventions */
  INTERVENTIONS: "apiGetInterventions",
  
  /** Récupère la liste des factures */
  FACTURES: "apiGetFactures",
  
  /** Récupère la liste des devis */
  DEVIS: "apiGetDevis",
  
  /** Récupère les créneaux d'interventions (endpoint REST spécifique) */
  CRENEAUX: "getInterventionsCreneaux",

  /** Récupère un projet par hash+zipCode (documents générés PDF) */
  PROJECT_BY_HASH: "apiGetProjectByHashZipCode",
} as const;

export type ApogeeEndpoint = typeof APOGEE_ENDPOINTS[keyof typeof APOGEE_ENDPOINTS];
