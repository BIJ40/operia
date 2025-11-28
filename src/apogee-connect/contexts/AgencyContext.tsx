import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setApiBaseUrl } from '@/apogee-connect/services/api';
import { DataService } from '@/apogee-connect/services/dataService';
import { logApogee } from '@/lib/logger';

interface Agency {
  id: string;
  name: string;
  baseUrl: string;
}

interface AgencyContextType {
  currentAgency: Agency | null;
  agencyChangeCounter: number;
  isAgencyReady: boolean;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { agence, isAuthLoading } = useAuth();
  
  // Construire l'agence à partir du profil utilisateur
  const currentAgency: Agency | null = agence 
    ? {
        id: agence,
        name: agence,
        baseUrl: `https://${agence}.hc-apogee.fr/api/`
      }
    : null;

  useEffect(() => {
    // Ne rien faire tant que l'authentification charge
    if (isAuthLoading) {
      logApogee.debug('Authentification en cours - Attente avant configuration API');
      return;
    }

    // Auth OK mais aucune agence
    if (!agence) {
      logApogee.warn('Aucune agence définie pour l\'utilisateur - BASE_URL ne sera pas initialisée');
      setApiBaseUrl("");
      return;
    }

    // Auth OK et agence présente
    if (currentAgency?.baseUrl) {
      logApogee.info(`Configuration de l'agence: ${currentAgency.id}`);
      setApiBaseUrl(currentAgency.baseUrl);
      DataService.clearCache();
    }
  }, [isAuthLoading, agence, currentAgency?.baseUrl]);

  const isAgencyReady = !isAuthLoading && !!agence;

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
