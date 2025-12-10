import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  
  // Track previous agency to only clear cache when agency actually changes
  const previousAgencyRef = useRef<string | null>(null);
  
  // Construire l'agence à partir du profil utilisateur
  const currentAgency: Agency | null = agence 
    ? {
        id: agence,
        name: agence,
        slug: agence
      }
    : null;

  useEffect(() => {
    // Reset le flag si l'auth recharge
    if (isAuthLoading) {
      setIsApiConfigured(false);
      logApogee.debug('Authentification en cours - Attente avant configuration');
      return;
    }

    // Auth OK mais aucune agence
    if (!agence) {
      logApogee.warn('Aucune agence définie pour l\'utilisateur');
      setIsApiConfigured(true);
      previousAgencyRef.current = null;
      return;
    }

    // Auth OK et agence présente
    if (currentAgency) {
      // Ne vider le cache QUE si l'agence a réellement changé
      if (previousAgencyRef.current !== null && previousAgencyRef.current !== agence) {
        logApogee.info(`Changement d'agence: ${previousAgencyRef.current} → ${agence}`);
        DataService.clearCache();
      }
      
      previousAgencyRef.current = agence;
      setIsApiConfigured(true);
    }
  }, [isAuthLoading, agence, currentAgency?.id]);

  // isAgencyReady = auth terminée + agence définie + API configurée
  const isAgencyReady = !isAuthLoading && !!agence && isApiConfigured;

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
