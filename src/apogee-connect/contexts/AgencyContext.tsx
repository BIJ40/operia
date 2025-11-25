import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setApiBaseUrl } from '@/apogee-connect/services/api';
import { DataService } from '@/apogee-connect/services/dataService';

interface Agency {
  id: string;
  name: string;
  baseUrl: string;
}

interface AgencyContextType {
  currentAgency: Agency | null;
  agencyChangeCounter: number;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { agence } = useAuth();
  
  // Construire l'agence à partir du profil utilisateur
  const currentAgency: Agency | null = agence 
    ? {
        id: agence,
        name: agence,
        baseUrl: `https://${agence}.hc-apogee.fr/api/`
      }
    : null;

  useEffect(() => {
    if (currentAgency?.baseUrl) {
      console.log(`🏢 Configuration de l'agence: ${currentAgency.id}`);
      setApiBaseUrl(currentAgency.baseUrl);
      // Vider le cache pour forcer le rechargement des données
      DataService.clearCache();
    } else {
      console.log('⚠️ Aucune agence définie - Appels API bloqués');
      setApiBaseUrl(""); // Réinitialiser BASE_URL
    }
  }, [currentAgency?.id]);

  return (
    <AgencyContext.Provider value={{ currentAgency, agencyChangeCounter: 0 }}>
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
