/**
 * ProfileContext — User profile data (name, agency, role, etc.)
 *
 * Consumers that only need profile information should use `useProfile()`
 * to avoid re-renders caused by permissions/modules changes.
 */

import { createContext, useContext } from 'react';

export interface ProfileContextType {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  poste: string | null;
  agence: string | null;
  agencyId: string | null;
  roleAgence: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  isReadOnly: boolean;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Hook — only re-renders when user profile data changes.
 */
export function useProfile(): ProfileContextType {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within AuthProvider');
  return ctx;
}
