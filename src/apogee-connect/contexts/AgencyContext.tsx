import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { logApogee } from '@/lib/logger';

interface Agency {
  id: string;
  name: string;
  slug: string;
}

interface AgencyContextType {
  currentAgency: Agency | null;
  agencyChangeCounter: number;
  isAgencyReady: boolean;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { agence, isAuthLoading } = useAuth();
  const { isRealUserImpersonation, impersonatedUser } = useImpersonation();
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  
  // Track previous agency to only clear cache when agency actually changes
  const previousAgencyRef = useRef<string | null>(null);
  
  // ============================================================================
  // IMPERSONATION : Utiliser l'agence de l'utilisateur impersonné si actif
  // ============================================================================
  const effectiveAgence = isRealUserImpersonation && impersonatedUser 
    ? impersonatedUser.agence 
    : agence;
  
  // Construire l'agence à partir du profil utilisateur (réel ou impersonné)
  const currentAgency: Agency | null = effectiveAgence 
    ? {
        id: effectiveAgence,
        name: effectiveAgence,
        slug: effectiveAgence
      }
    : null;

  useEffect(() => {
    // Reset le flag si l'auth recharge
    if (isAuthLoading) {
      setIsApiConfigured(false);
      logApogee.debug('Authentification en cours - Attente avant configuration');
      return;
    }

    // Auth OK mais aucune agence (réelle ou impersonnée)
    if (!effectiveAgence) {
      logApogee.warn('Aucune agence définie pour l\'utilisateur' + (isRealUserImpersonation ? ' (impersonné)' : ''));
      setIsApiConfigured(true);
      previousAgencyRef.current = null;
      return;
    }

    // Auth OK et agence présente
    if (currentAgency) {
      // Ne vider le cache QUE si l'agence a réellement changé
      if (previousAgencyRef.current !== null && previousAgencyRef.current !== effectiveAgence) {
        logApogee.info(`Changement d'agence: ${previousAgencyRef.current} → ${effectiveAgence}`);
        DataService.clearCache();
      }
      
      previousAgencyRef.current = effectiveAgence;
      setIsApiConfigured(true);
    }
  }, [isAuthLoading, effectiveAgence, currentAgency?.id, isRealUserImpersonation]);

  // isAgencyReady = auth terminée + agence définie + API configurée
  const isAgencyReady = !isAuthLoading && !!effectiveAgence && isApiConfigured;

  return (
    <AgencyContext.Provider value={{ currentAgency, agencyChangeCounter: 0, isAgencyReady }}>
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  const context = useContext(AgencyContext);
  if (!context) {
    throw new Error('useAgency must be used within AgencyProvider');
  }
  return context;
}
