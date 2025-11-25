const API_KEY = "HC-0fbff339d2a701e86d63f66c1a8c8bf54";
let BASE_URL = "https://dax.hc-apogee.fr/api/";

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
    // Endpoint spécial avec URL différente
    try {
      const response = await fetch("https://dax.hc-apogee.fr/getInterventionsCreneaux", {
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
