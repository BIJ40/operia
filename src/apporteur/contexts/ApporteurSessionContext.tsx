/**
 * ApporteurSessionContext - Contexte d'authentification autonome pour apporteurs
 * Système OTP + session custom, totalement isolé de Supabase Auth
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface ApporteurSession {
  managerId: string;
  apporteurId: string;
  apporteurName: string;
  agencyId: string;
  agencyName?: string;
  agencyCity?: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'reader' | 'manager';
  expiresAt: Date;
}

interface ApporteurSessionContextType {
  // État
  session: ApporteurSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Helpers
  isManager: boolean;
  apporteurId: string | null;
  agencyId: string | null;
  
  // Actions
  requestCode: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const ApporteurSessionContext = createContext<ApporteurSessionContextType | undefined>(undefined);

// Storage helpers — always use localStorage for token persistence
// (cross-origin cookies don't work between app domain and Supabase domain)
const TOKEN_KEY = 'apporteur_session_token';
const SESSION_KEY = 'apporteur_session_data';

const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

const setStoredSession = (token: string, session: ApporteurSession) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
};

const getStoredSessionData = (): ApporteurSession | null => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      expiresAt: new Date(parsed.expiresAt),
    };
  } catch {
    return null;
  }
};

// API helpers
const getApiBaseUrl = () => {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
};

const fetchWithAuth = async (path: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  const token = getStoredToken();
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    // Use the anon key for Authorization so Supabase gateway accepts the request
    'Authorization': `Bearer ${anonKey}`,
    ...(options.headers as Record<string, string> || {}),
  };

  // Send apporteur token ONLY via custom header (not Authorization, which Supabase validates as JWT)
  if (token) {
    headers['x-apporteur-token'] = token;
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
};

export function ApporteurSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ApporteurSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount
  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const storedToken = getStoredToken();
      console.log('[ApporteurSession] refreshSession — token present:', !!storedToken, 'length:', storedToken?.length || 0);
      
      // No stored token → no session
      if (!storedToken) {
        console.log('[ApporteurSession] No stored token, clearing session');
        setSession(null);
        setIsLoading(false);
        return;
      }

      // Quick restore from localStorage while we validate
      const storedSession = getStoredSessionData();
      if (storedSession && storedSession.expiresAt > new Date()) {
        console.log('[ApporteurSession] Stored session found, validating with server...');
        // Validate with server
        const response = await fetchWithAuth('/apporteur-auth-validate-session', {
          method: 'GET',
        });

        console.log('[ApporteurSession] Validate response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[ApporteurSession] Validate response data valid:', data.valid);
          if (data.valid && data.session) {
            const newSession: ApporteurSession = {
              managerId: data.session.managerId,
              apporteurId: data.session.apporteurId,
              apporteurName: data.session.apporteurName,
              agencyId: data.session.agencyId,
              agencyName: data.session.agencyName || undefined,
              agencyCity: data.session.agencyCity || undefined,
              email: data.session.email,
              firstName: data.session.firstName,
              lastName: data.session.lastName,
              role: data.session.role,
              expiresAt: new Date(data.session.expiresAt),
            };
            setSession(newSession);
            setStoredSession(storedToken, newSession);
            setIsLoading(false);
            return;
          }
        } else {
          const errorText = await response.text().catch(() => 'no body');
          console.warn('[ApporteurSession] Validate failed:', response.status, errorText);
        }
        // Session invalid, clear it
        clearStoredSession();
      }

      // Stored session expired or invalid — try server validation as fallback
      const response = await fetchWithAuth('/apporteur-auth-validate-session', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.session) {
          const newSession: ApporteurSession = {
            managerId: data.session.managerId,
            apporteurId: data.session.apporteurId,
            apporteurName: data.session.apporteurName,
            agencyId: data.session.agencyId,
            agencyName: data.session.agencyName || undefined,
            agencyCity: data.session.agencyCity || undefined,
            email: data.session.email,
            firstName: data.session.firstName,
            lastName: data.session.lastName,
            role: data.session.role,
            expiresAt: new Date(data.session.expiresAt),
          };
          setSession(newSession);
          setStoredSession(storedToken, newSession);
        } else {
          setSession(null);
          clearStoredSession();
        }
      } else {
        setSession(null);
        clearStoredSession();
      }
    } catch (error) {
      console.error('[ApporteurSession] Error validating session:', error);
      setSession(null);
      clearStoredSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Request OTP code
  const requestCode = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/apporteur-auth-send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.status === 429) {
        return { success: false, message: data.error || 'Trop de tentatives. Réessayez dans 15 minutes.' };
      }

      return { 
        success: data.success, 
        message: data.message || (data.success ? 'Code envoyé' : 'Erreur') 
      };
    } catch (error) {
      console.error('[ApporteurSession] Error requesting code:', error);
      return { success: false, message: 'Erreur de connexion au serveur' };
    }
  }, []);

  // Verify OTP code
  const verifyCode = useCallback(async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/apporteur-auth-verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for receiving cookie
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Code invalide' };
      }

      if (data.success && data.manager) {
        const newSession: ApporteurSession = {
          managerId: data.manager.id,
          apporteurId: data.manager.apporteurId,
          apporteurName: data.manager.apporteurName,
          agencyId: data.manager.agencyId,
          agencyName: data.manager.agencyName || undefined,
          agencyCity: data.manager.agencyCity || undefined,
          email: data.manager.email,
          firstName: data.manager.firstName,
          lastName: data.manager.lastName,
          role: data.manager.role,
          expiresAt: new Date(data.expiresAt),
        };

        setSession(newSession);

        // Always store token in localStorage for session persistence
        if (data.token) {
          setStoredSession(data.token, newSession);
        }

        return { success: true };
      }

      return { success: false, error: 'Réponse invalide du serveur' };
    } catch (error) {
      console.error('[ApporteurSession] Error verifying code:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetchWithAuth('/apporteur-auth-logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('[ApporteurSession] Error logging out:', error);
    } finally {
      setSession(null);
      clearStoredSession();
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const value: ApporteurSessionContextType = {
    session,
    isLoading,
    isAuthenticated: !!session,
    isManager: session?.role === 'manager',
    apporteurId: session?.apporteurId || null,
    agencyId: session?.agencyId || null,
    requestCode,
    verifyCode,
    logout,
    refreshSession,
  };

  return (
    <ApporteurSessionContext.Provider value={value}>
      {children}
    </ApporteurSessionContext.Provider>
  );
}

export function useApporteurSession() {
  const context = useContext(ApporteurSessionContext);
  if (!context) {
    throw new Error('useApporteurSession must be used within ApporteurSessionProvider');
  }
  return context;
}
