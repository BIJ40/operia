import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { logDebug } from '@/lib/logger';

const STORAGE_KEY = 'franchiseur_selected_agencies';

/**
 * Mapping global_role → FranchiseurRole:
 * - N3 (franchisor_user) = animateur
 * - N4 (franchisor_admin) = directeur
 * - N5+ (platform_admin, superadmin) = dg
 */
export type FranchiseurRole = 'animateur' | 'directeur' | 'dg' | null;

interface FranchiseurPermissions {
  canViewRoyalties: boolean;
  canManageRoyalties: boolean;
  canViewAllAgencies: boolean;
}

interface FranchiseurContextType {
  franchiseurRole: FranchiseurRole;
  selectedAgencies: string[];
  setSelectedAgencies: (agencies: string[]) => void;
  permissions: FranchiseurPermissions;
  isLoading: boolean;
}

const FranchiseurContext = createContext<FranchiseurContextType | undefined>(undefined);

/**
 * Dérive le FranchiseurRole depuis global_role
 */
function deriveFranchiseurRole(globalRole: string | null): FranchiseurRole {
  if (!globalRole) return null;
  
  switch (globalRole) {
    case 'superadmin':
    case 'platform_admin':
      return 'dg';
    case 'franchisor_admin':
      return 'directeur';
    case 'franchisor_user':
      return 'animateur';
    default:
      return null;
  }
}

/**
 * Récupère les agences persistées depuis localStorage ou URL
 */
function getPersistedAgencies(searchParams: URLSearchParams): string[] {
  const urlAgencies = searchParams.get('agencies');
  if (urlAgencies) {
    const agencies = urlAgencies.split(',').filter(Boolean);
    if (agencies.length > 0) {
      return agencies;
    }
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const agencies = JSON.parse(stored);
      if (Array.isArray(agencies) && agencies.length > 0) {
        return agencies;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  
  return [];
}

export function FranchiseurProvider({ children }: { children: ReactNode }) {
  const { user, isAuthLoading } = useAuthCore();
  const { isFranchiseur, isAdmin, globalRole } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [franchiseurRole, setFranchiseurRole] = useState<FranchiseurRole>(null);
  const [selectedAgencies, setSelectedAgenciesState] = useState<string[]>(() => 
    getPersistedAgencies(searchParams)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const setSelectedAgencies = useCallback((agencies: string[]) => {
    setSelectedAgenciesState(agencies);
    
    try {
      if (agencies.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(agencies));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (agencies.length > 0) {
        newParams.set('agencies', agencies.join(','));
      } else {
        newParams.delete('agencies');
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (isAuthLoading) {
      logDebug('FRANCHISEUR_CONTEXT', 'Waiting for AuthContext to finish loading...');
      return;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadFranchiseurData = async () => {
      setIsLoading(true);
      
      logDebug('FRANCHISEUR_CONTEXT', 'Loading franchiseur data', {
        userId: user.id,
        globalRole,
        isFranchiseur,
        isAdmin
      });
      
      if (isAdmin && !isFranchiseur) {
        logDebug('FRANCHISEUR_CONTEXT', 'Admin user, setting DG role');
        setFranchiseurRole('dg');
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }
      
      if (!isFranchiseur) {
        logDebug('FRANCHISEUR_CONTEXT', 'User is not franchiseur, no role assigned');
        setIsLoading(false);
        return;
      }
      
      const derivedRole = deriveFranchiseurRole(globalRole);
      logDebug('FRANCHISEUR_CONTEXT', 'Derived franchiseur role', { derivedRole, globalRole });
      setFranchiseurRole(derivedRole || 'dg');

      setIsInitialized(true);
      setIsLoading(false);
    };

    loadFranchiseurData();
  }, [user, isFranchiseur, isAdmin, globalRole, isAuthLoading]);

  const permissions: FranchiseurPermissions = {
    canViewRoyalties: franchiseurRole === 'directeur' || franchiseurRole === 'dg',
    canManageRoyalties: franchiseurRole === 'directeur' || franchiseurRole === 'dg',
    canViewAllAgencies: franchiseurRole === 'directeur' || franchiseurRole === 'dg' || franchiseurRole === 'animateur',
  };

  return (
    <FranchiseurContext.Provider
      value={{
        franchiseurRole,
        selectedAgencies,
        setSelectedAgencies,
        permissions,
        isLoading,
      }}
    >
      {children}
    </FranchiseurContext.Provider>
  );
}

export function useFranchiseur() {
  const context = useContext(FranchiseurContext);
  if (context === undefined) {
    throw new Error('useFranchiseur must be used within a FranchiseurProvider');
  }
  return context;
}
