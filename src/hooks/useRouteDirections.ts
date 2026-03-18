/**
 * useRouteDirections — Appelle l'API Mapbox Directions pour obtenir
 * la géométrie routière réelle entre une série de waypoints.
 *
 * Max 25 waypoints par requête (largement suffisant pour une tournée jour).
 */

import { useEffect, useState, useRef } from 'react';

interface RouteResult {
  /** GeoJSON LineString geometry */
  geometry: GeoJSON.LineString | null;
  /** Distance totale en km */
  distanceKm: number;
  /** Durée estimée en minutes */
  durationMin: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * @param coords — coordonnées triées chronologiquement [[lng, lat], ...]
 * @param token  — Mapbox access token
 * @param enabled — permet de désactiver le fetch (ex: < 2 points)
 */
export function useRouteDirections(
  coords: [number, number][],
  token: string | null,
  enabled: boolean = true,
): RouteResult {
  const [result, setResult] = useState<RouteResult>({
    geometry: null,
    distanceKm: 0,
    durationMin: 0,
    isLoading: false,
    error: null,
  });

  // Stable key to avoid refetching when reference changes but values are the same
  const coordsKey = coords.map(c => `${c[0].toFixed(6)},${c[1].toFixed(6)}`).join(';');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cleanup previous request
    abortRef.current?.abort();

    if (!enabled || !token || coords.length < 2) {
      setResult({ geometry: null, distanceKm: 0, durationMin: 0, isLoading: false, error: null });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const fetchRoute = async () => {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Mapbox Directions API — max 25 waypoints
        const waypoints = coords.slice(0, 25);
        const coordsStr = waypoints.map(c => `${c[0]},${c[1]}`).join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&overview=full&access_token=${token}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Mapbox Directions: ${res.status}`);
        }

        const data = await res.json();
        const route = data.routes?.[0];

        if (!route) {
          setResult({ geometry: null, distanceKm: 0, durationMin: 0, isLoading: false, error: 'Aucun itinéraire trouvé' });
          return;
        }

        setResult({
          geometry: route.geometry as GeoJSON.LineString,
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMin: Math.round(route.duration / 60),
          isLoading: false,
          error: null,
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[useRouteDirections]', err);
        setResult(prev => ({ ...prev, isLoading: false, error: err?.message || 'Erreur itinéraire' }));
      }
    };

    fetchRoute();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey, token, enabled]);

  return result;
}
