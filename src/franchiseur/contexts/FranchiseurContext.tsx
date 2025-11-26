import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function FranchiseurProvider({ children }: { children: ReactNode }) {
  const { user, isFranchiseur } = useAuth();
  const [franchiseurRole, setFranchiseurRole] = useState<FranchiseurRole>(null);
  const [assignedAgencies, setAssignedAgencies] = useState<string[]>([]);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadFranchiseurData = async () => {
      setIsLoading(true);
      
      // First check if user has franchiseur app role
      if (!isFranchiseur) {
        setIsLoading(false);
        return;
      }
      
      // Load franchiseur role
      const { data: roleData } = await supabase
        .from('franchiseur_roles')
        .select('franchiseur_role')
        .eq('user_id', user.id)
        .single();

      if (roleData) {
        setFranchiseurRole(roleData.franchiseur_role as FranchiseurRole);

        // Load assigned agencies for animateurs
        if (roleData.franchiseur_role === 'animateur') {
          const { data: assignments } = await supabase
            .from('franchiseur_agency_assignments')
            .select('agency_id')
            .eq('user_id', user.id);

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
      } else {
        // If user has franchiseur app role but no specific role, default to DG (full access)
        setFranchiseurRole('dg');
        setAssignedAgencies([]);
        setSelectedAgencies([]);
      }

      setIsLoading(false);
    };

    loadFranchiseurData();
  }, [user, isFranchiseur]);

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
