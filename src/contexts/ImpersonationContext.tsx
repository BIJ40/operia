import { createContext, useContext, useState, ReactNode } from 'react';

export interface ImpersonatedProfile {
  roleAgence: string | null;
  franchiseurRole: 'animateur' | 'directeur' | 'dg' | null;
  agence: string | null;
  hasIndicateursAccess: boolean;
  hasSupportRole: boolean;
  hasFranchiseurRole: boolean;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedProfile: ImpersonatedProfile | null;
  startImpersonation: (profile: ImpersonatedProfile) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ROLE_AGENCE_OPTIONS = [
  { value: 'dirigeant', label: 'Dirigeant' },
  { value: 'assistante', label: 'Assistante' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'technicien', label: 'Technicien' },
  { value: 'tete_de_reseau', label: 'Tête de réseau' },
  { value: 'externe', label: 'Externe' },
];

export const FRANCHISEUR_ROLE_OPTIONS = [
  { value: null, label: 'Aucun' },
  { value: 'animateur', label: 'Animateur réseau' },
  { value: 'directeur', label: 'Directeur réseau' },
  { value: 'dg', label: 'DG' },
];

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState<ImpersonatedProfile | null>(null);

  const startImpersonation = (profile: ImpersonatedProfile) => {
    setImpersonatedProfile(profile);
    setIsImpersonating(true);
  };

  const stopImpersonation = () => {
    setImpersonatedProfile(null);
    setIsImpersonating(false);
  };

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating,
      impersonatedProfile,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
