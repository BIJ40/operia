import { useSearchParams } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionsContext';

/**
 * Hook to help preserve edit mode when navigating between pages
 */
export const useEditModeNavigation = () => {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  
  const isInEditMode = searchParams.get('edit') === 'true' && isAdmin;
  
  /**
   * Returns a URL with ?edit=true appended if currently in edit mode
   */
  const getEditModeUrl = (baseUrl: string) => {
    if (isInEditMode) {
      return `${baseUrl}?edit=true`;
    }
    return baseUrl;
  };
  
  return {
    isInEditMode,
    getEditModeUrl,
  };
};
