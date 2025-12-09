import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logError, logDebug } from '@/lib/logger';

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
  canAssignAnimators: boolean;
  canViewAllAgencies: boolean;
}

interface FranchiseurContextType {
  franchiseurRole: FranchiseurRole;
  assignedAgencies: string[];
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

export function FranchiseurProvider({ children }: { children: ReactNode }) {
  const { user, isFranchiseur, isAdmin, globalRole, isAuthLoading } = useAuth();
  const [franchiseurRole, setFranchiseurRole] = useState<FranchiseurRole>(null);
  const [assignedAgencies, setAssignedAgencies] = useState<string[]>([]);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: Wait for AuthContext to finish loading before making decisions
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
      
      // Admins have full access as DG by default
      if (isAdmin && !isFranchiseur) {
        logDebug('FRANCHISEUR_CONTEXT', 'Admin user, setting DG role');
        setFranchiseurRole('dg');
        setAssignedAgencies([]);
        setSelectedAgencies([]);
        setIsLoading(false);
        return;
      }
      
      // Check if user has franchiseur app role
      if (!isFranchiseur) {
        logDebug('FRANCHISEUR_CONTEXT', 'User is not franchiseur, no role assigned');
        setIsLoading(false);
        return;
      }
      
      // Derive role from global_role (V2)
      const derivedRole = deriveFranchiseurRole(globalRole);
      logDebug('FRANCHISEUR_CONTEXT', 'Derived franchiseur role', { derivedRole, globalRole });
      setFranchiseurRole(derivedRole || 'dg'); // Default to dg if has module access but unknown role

      // Load assigned agencies for animateurs (N3)
      if (derivedRole === 'animateur') {
        const { data: assignments, error } = await supabase
          .from('franchiseur_agency_assignments')
          .select('agency_id')
          .eq('user_id', user.id);

        if (error) {
          logError('FRANCHISEUR_CONTEXT', 'Error loading agency assignments', error);
        }

        if (assignments) {
          const agencyIds = assignments.map(a => a.agency_id);
          setAssignedAgencies(agencyIds);
          setSelectedAgencies(agencyIds);
        }
      } else {
        // Directeur and DG see all agencies
        setAssignedAgencies([]);
        setSelectedAgencies([]);
      }

      setIsLoading(false);
    };

    loadFranchiseurData();
  }, [user, isFranchiseur, isAdmin, globalRole, isAuthLoading]);

  const permissions: FranchiseurPermissions = {
    canViewRoyalties: franchiseurRole === 'directeur' || franchiseurRole === 'dg',
    canManageRoyalties: franchiseurRole === 'directeur' || franchiseurRole === 'dg',
    canAssignAnimators: franchiseurRole === 'directeur' || franchiseurRole === 'dg',
    canViewAllAgencies: franchiseurRole === 'directeur' || franchiseurRole === 'dg' || franchiseurRole === 'animateur',
  };

  return (
    <FranchiseurContext.Provider
      value={{
        franchiseurRole,
        assignedAgencies,
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
