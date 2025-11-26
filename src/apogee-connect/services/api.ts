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

async function apiCall<T>(endpoint: string, additionalData?: Record<string, any>): Promise<T> {
  // GUARD: Ne jamais appeler l'API si BASE_URL n'est pas définie
  if (!BASE_URL) {
    console.warn(`⚠️ BASE_URL non définie - appel API annulé pour ${endpoint}`);
    throw new Error("BASE_URL non définie - veuillez vous connecter avec une agence valide");
  }

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
    if (!BASE_URL) {
      console.warn(`⚠️ BASE_URL non définie - impossible d'appeler getInterventionsCreneaux`);
      return [];
    }
    
    try {
      const response = await fetch(`${BASE_URL}getInterventionsCreneaux`, {
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
      console.warn(`⚠️ getInterventionsCreneaux non disponible (CORS):`, error);
      return [];
    }
  },
};

export type { ApiResponse };
