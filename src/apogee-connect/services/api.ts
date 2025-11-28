import { APOGEE_ENDPOINTS } from '@/apogee-connect/types/endpoints';

const API_KEY = import.meta.env.VITE_APOGEE_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ VITE_APOGEE_API_KEY non définie - les appels à l'API Apogée risquent d'échouer.");
}

// BASE_URL sera définie dynamiquement par AgencyContext via setApiBaseUrl
// IMPORTANT: Ne JAMAIS hardcoder d'URL d'agence ici pour des raisons de sécurité
let BASE_URL = "";

export function setApiBaseUrl(url: string) {
  BASE_URL = url;
  if (url) {
    console.log('✅ BASE_URL configurée:', url);
  } else {
    console.log('⚠️ BASE_URL réinitialisée (vide)');
  }
}

export function getApiBaseUrl(): string {
  return BASE_URL;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Fonction générique pour appeler l'API Apogée
 * @param endpoint - Endpoint à appeler (utiliser APOGEE_ENDPOINTS)
 * @param additionalData - Données supplémentaires à envoyer
 */
async function apiCall<T>(endpoint: string, additionalData?: Record<string, any>): Promise<T> {
  // GUARD: Ne jamais appeler l'API si BASE_URL n'est pas définie
  if (!BASE_URL) {
    console.warn(`⚠️ BASE_URL non définie - appel API annulé pour ${endpoint}`);
    throw new Error("BASE_URL non définie - veuillez vous connecter avec une agence valide");
  }

  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        API_KEY,
        ...additionalData,
      }),
    });

    if (!response.ok) {
      console.error(`❌ API Apogée erreur ${endpoint}`, {
        url,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`API Apogée ${endpoint} - HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`❌ API Apogée exception ${endpoint}:`, {
      url,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * API Apogée - Points d'entrée centralisés
 * Tous les appels utilisent les endpoints définis dans APOGEE_ENDPOINTS
 */
export const api = {
  /** Récupère les utilisateurs de l'agence */
  getUsers: () => apiCall(APOGEE_ENDPOINTS.USERS),
  
  /** Récupère les clients avec filtres optionnels */
  getClients: (filters?: Record<string, any>) => 
    apiCall(APOGEE_ENDPOINTS.CLIENTS, filters),
  
  /** Récupère les projets/dossiers avec filtres optionnels */
  getProjects: (filters?: Record<string, any>) => 
    apiCall(APOGEE_ENDPOINTS.PROJECTS, filters),
  
  /** Récupère les interventions avec filtres optionnels */
  getInterventions: (filters?: Record<string, any>) => 
    apiCall(APOGEE_ENDPOINTS.INTERVENTIONS, filters),
  
  /** Récupère les factures avec filtres optionnels */
  getFactures: (filters?: Record<string, any>) => 
    apiCall(APOGEE_ENDPOINTS.FACTURES, filters),
  
  /** Récupère les devis avec filtres optionnels */
  getDevis: (filters?: Record<string, any>) => 
    apiCall(APOGEE_ENDPOINTS.DEVIS, filters),
  
  /** 
   * Récupère les créneaux d'interventions
   * Note: Endpoint REST spécifique, peut échouer silencieusement en cas de CORS
   */
  getInterventionsCreneaux: async (filters?: Record<string, any>) => {
    if (!BASE_URL) {
      console.warn(`⚠️ BASE_URL non définie - impossible d'appeler ${APOGEE_ENDPOINTS.CRENEAUX}`);
      return [];
    }
    
    try {
      return await apiCall(APOGEE_ENDPOINTS.CRENEAUX, filters);
    } catch (error) {
      // Ce endpoint peut échouer en CORS sur certaines configurations
      console.warn(`⚠️ ${APOGEE_ENDPOINTS.CRENEAUX} non disponible (possible CORS):`, error);
      return [];
    }
  },
};

export type { ApiResponse };
