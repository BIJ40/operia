import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DiffusionDashboard from '@/pages/DiffusionDashboard';

/**
 * TvDisplayEntry
 * - Route d'entrée /tv-display.
 * - En preview, s'assure que le param `__lovable_token` est présent si on l'a déjà vu.
 *   (sinon certaines sessions peuvent redemander une ré-identification).
 */
export default function TvDisplayEntry() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenInUrl = params.get('__lovable_token');

    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem('__lovable_token') ?? localStorage.getItem('__lovable_token');
    } catch {
      stored = null;
    }

    if (!tokenInUrl && stored) {
      params.set('__lovable_token', stored);
      const search = `?${params.toString()}`;
      navigate({ pathname: location.pathname, search }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return <DiffusionDashboard />;
}
