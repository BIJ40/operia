/**
 * useApporteurApi - Hook pour les appels API authentifiés du portail apporteur
 * Gère automatiquement l'auth:
 * 1. Token OTP custom (portail apporteur autonome)
 * 2. Fallback: JWT Supabase (utilisateur interne avec lien apporteur_users)
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'apporteur_session_token';

const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
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
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': publishableKey,
      ...(options.headers as Record<string, string> || {}),
    };

    // Always provide a valid JWT for edge functions with verify_jwt=true
    // Prefer user JWT, fallback to publishable key JWT
    let bearerToken = publishableKey;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        bearerToken = session.access_token;
      }
    } catch (e) {
      console.warn('[useApporteurApi] Failed to get Supabase session:', e);
    }

    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    // Custom apporteur token (OTP auth) sent in dedicated header
    // to avoid collision with JWT verification at edge gateway level
    const devToken = getDevToken();
    if (devToken) {
      headers['x-apporteur-token'] = devToken;
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
