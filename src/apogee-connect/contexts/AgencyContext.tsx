import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  
  // Construire l'agence à partir du profil utilisateur
  const currentAgency: Agency | null = agence 
    ? {
        id: agence,
        name: agence,
        baseUrl: `https://${agence}.hc-apogee.fr/api/`
      }
    : null;

  useEffect(() => {
    // Reset le flag si l'auth recharge
    if (isAuthLoading) {
      setIsApiConfigured(false);
      logApogee.debug('Authentification en cours - Attente avant configuration API');
      return;
    }

    // Auth OK mais aucune agence
    if (!agence) {
      logApogee.warn('Aucune agence définie pour l\'utilisateur - BASE_URL ne sera pas initialisée');
      setApiBaseUrl("");
      setIsApiConfigured(true); // Marqué comme configuré même sans agence
      return;
    }

    // Auth OK et agence présente
    if (currentAgency?.baseUrl) {
      logApogee.info(`Configuration de l'agence: ${currentAgency.id}`);
      setApiBaseUrl(currentAgency.baseUrl);
      DataService.clearCache();
      setIsApiConfigured(true); // API configurée avec succès
    }
  }, [isAuthLoading, agence, currentAgency?.baseUrl]);

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
