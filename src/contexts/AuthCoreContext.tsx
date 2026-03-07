/**
 * AuthCoreContext — Session & authentication primitives only.
 * 
 * Consumers that only need to know "is the user logged in?" should use
 * `useAuthCore()` instead of the heavier `useAuth()` to avoid
 * unnecessary re-renders when profile or permissions data changes.
 */

import { createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';

export interface AuthCoreContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const AuthCoreContext = createContext<AuthCoreContextType | undefined>(undefined);

/**
 * Lightweight hook — only re-renders when auth session changes,
 * NOT when profile or permissions data changes.
 */
export function useAuthCore(): AuthCoreContextType {
  const ctx = useContext(AuthCoreContext);
  if (!ctx) throw new Error('useAuthCore must be used within AuthProvider');
  return ctx;
}
