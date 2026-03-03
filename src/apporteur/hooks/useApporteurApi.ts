/**
 * useApporteurApi - Hook pour les appels API authentifiés du portail apporteur
 * Gère automatiquement l'auth (cookie en prod, header en dev)
 */

import { useCallback } from 'react';

// Check if we're in dev/preview mode
const isDevMode = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' ||
         hostname.includes('preview') || 
         hostname.includes('lovable');
};

const DEV_TOKEN_KEY = 'apporteur_session_token';

const getDevToken = (): string | null => {
  if (!isDevMode()) return null;
  return localStorage.getItem(DEV_TOKEN_KEY);
};

const getApiBaseUrl = () => {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
};

interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

export function useApporteurApi() {
  const fetchApi = useCallback(async <T = unknown>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
      ...(options.headers as Record<string, string> || {}),
    };

    // In DEV mode, add token to header
    if (isDevMode()) {
      const token = getDevToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        credentials: 'include', // Send cookies in prod
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: data?.error || `Erreur ${response.status}`,
          status: response.status,
        };
      }

      return {
        data: data as T,
        error: null,
        status: response.status,
      };
    } catch (err) {
      console.error('[useApporteurApi] Fetch error:', err);
      return {
        data: null,
        error: 'Erreur de connexion au serveur',
        status: 0,
      };
    }
  }, []);

  const get = useCallback(<T = unknown>(path: string) => {
    return fetchApi<T>(path, { method: 'GET' });
  }, [fetchApi]);

  const post = useCallback(<T = unknown>(path: string, body?: unknown) => {
    return fetchApi<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [fetchApi]);

  return { fetchApi, get, post };
}

export default useApporteurApi;
