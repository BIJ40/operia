import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Dax defaults - hardcoded fallback to ensure the app always works
// Note: contact_email and api_subdomain are only available server-side (edge functions)
export const DAX_DEFAULTS = {
  slug: 'dax',
  name: 'HelpConfort Dax',
  logo_url: null,
  primary_color: '#007ab8',
  is_default: true,
  stripe_enabled: true,
  google_reviews_url: 'https://g.page/r/CdYMpp43SWoQEAE/review',
};

// Public agency data - sensitive fields (contact_email, api_subdomain) are only available server-side
export interface Agency {
  id?: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  is_default: boolean;
  stripe_enabled: boolean;
  google_reviews_url: string | null;
}

interface AgencyContextType {
  agency: Agency;
  isLoading: boolean;
  error: string | null;
  setAgencySlug: (slug: string | null) => void;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

interface AgencyProviderProps {
  children: ReactNode;
  initialSlug?: string | null;
}

export const AgencyProvider: React.FC<AgencyProviderProps> = ({ children, initialSlug }) => {
  const [agency, setAgency] = useState<Agency>(DAX_DEFAULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(initialSlug || null);

  const setAgencySlug = (slug: string | null) => {
    setCurrentSlug(slug);
  };

  useEffect(() => {
    const fetchAgency = async () => {
      // If no slug, use default (Dax)
      if (!currentSlug) {
        setAgency(DAX_DEFAULTS);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use the public view that hides sensitive fields (contact_email, api_subdomain)
        const { data, error: fetchError } = await supabase
          .from('agencies_public')
          .select('*')
          .eq('slug', currentSlug)
          .maybeSingle();

        if (fetchError || !data) {
          console.warn(`Agency "${currentSlug}" not found, falling back to Dax defaults`);
          setAgency(DAX_DEFAULTS);
          setError(`Agence "${currentSlug}" non trouvée`);
        } else {
          setAgency({
            id: data.id,
            slug: data.slug,
            name: data.name,
            logo_url: data.logo_url,
            primary_color: data.primary_color || DAX_DEFAULTS.primary_color,
            is_default: data.is_default ?? false,
            stripe_enabled: data.stripe_enabled ?? false,
            google_reviews_url: data.google_reviews_url || null,
          });
        }
      } catch (err) {
        console.error('Error fetching agency:', err);
        setAgency(DAX_DEFAULTS);
        setError('Erreur lors du chargement de l\'agence');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgency();
  }, [currentSlug]);

  // Apply dynamic CSS custom properties for agency branding
  useEffect(() => {
    if (agency.primary_color) {
      document.documentElement.style.setProperty('--agency-primary', agency.primary_color);
    }
  }, [agency.primary_color]);

  return (
    <AgencyContext.Provider value={{ agency, isLoading, error, setAgencySlug }}>
      {children}
    </AgencyContext.Provider>
  );
};

export const useAgencyContext = (): AgencyContextType => {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error('useAgencyContext must be used within an AgencyProvider');
  }
  return context;
};
