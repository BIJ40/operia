import { useAgencyContext, DAX_DEFAULTS, Agency } from '@/contexts/AgencyContext';

/**
 * Hook to access the current agency data with Dax fallback
 * Always returns valid agency data - never null
 * 
 * Note: Sensitive fields (api_subdomain, contact_email) are only available
 * server-side in edge functions via the agencies table directly.
 */
export const useAgency = () => {
  const { agency, isLoading, error, setAgencySlug } = useAgencyContext();

  /**
   * Get agency display name
   */
  const getAgencyName = (): string => {
    return agency?.name || DAX_DEFAULTS.name;
  };

  /**
   * Get agency logo URL or null for default banner
   */
  const getLogoUrl = (): string | null => {
    return agency?.logo_url || null;
  };

  /**
   * Get agency primary color
   */
  const getPrimaryColor = (): string => {
    return agency?.primary_color || DAX_DEFAULTS.primary_color;
  };

  /**
   * Check if using default (Dax) agency
   */
  const isDefaultAgency = (): boolean => {
    return agency?.is_default || agency?.slug === 'dax';
  };

  return {
    agency: agency || DAX_DEFAULTS,
    isLoading,
    error,
    setAgencySlug,
    getAgencyName,
    getLogoUrl,
    getPrimaryColor,
    isDefaultAgency,
  };
};

export type { Agency };
export { DAX_DEFAULTS };
