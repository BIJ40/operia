const API_KEY = import.meta.env.VITE_APOGEE_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ VITE_APOGEE_API_KEY non définie - les appels à l'API Apogée risquent d'échouer.");
}

// BASE_URL sera définie dynamiquement par AgencyContext via setApiBaseUrl
// IMPORTANT: Ne JAMAIS hardcoder d'URL d'agence ici pour des raisons de sécurité
let BASE_URL = "";

export function setApiBaseUrl(url: string) {
  BASE_URL = url;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function apiCall<T>(endpoint: string, additionalData?: Record<string, any>): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  getUsers: () => apiCall("apiGetUsers"),
  getClients: (filters?: Record<string, any>) => apiCall("apiGetClients", filters),
  getProjects: (filters?: Record<string, any>) => apiCall("apiGetProjects", filters),
  getInterventions: (filters?: Record<string, any>) => apiCall("apiGetInterventions", filters),
  getFactures: (filters?: Record<string, any>) => apiCall("apiGetFactures", filters),
  getDevis: (filters?: Record<string, any>) => apiCall("apiGetDevis", filters),
  getInterventionsCreneaux: async (filters?: Record<string, any>) => {
    // CRITIQUE: Utiliser BASE_URL (définie par AgencyContext) pour l'agence de l'utilisateur
    // Ne JAMAIS hardcoder l'URL d'une agence spécifique
    if (!BASE_URL) {
      console.warn(`⚠️ BASE_URL non définie - impossible d'appeler getInterventionsCreneaux`);
      return [];
    }
    
    try {
      // Construire l'URL depuis BASE_URL (qui contient déjà l'agence)
      const baseUrlWithoutApi = BASE_URL.replace('/api/', '/');
      const response = await fetch(`${baseUrlWithoutApi}getInterventionsCreneaux`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          API_KEY,
          ...filters,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Erreur CORS côté serveur - on retourne un tableau vide
      console.warn(`⚠️ getInterventionsCreneaux non disponible (CORS):`, error);
      return [];
    }
  },
};

export type { ApiResponse };
