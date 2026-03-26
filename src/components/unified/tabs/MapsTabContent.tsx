/**
 * MapsTabContent - Onglet "Maps" dans Pilotage
 * Réutilise la carte Mapbox de CartePage avec toutes ses features
 * (filtres date/techniciens, markers camembert, mode tournée, itinéraire routier)
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Loader2, MapPin, AlertCircle, CalendarDays, Flame, PieChart, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useRdvMap, calculateBounds, MapRdv } from '@/hooks/useRdvMap';
import { useQueries, useQuery } from '@tanstack/react-query';
import { createPinMarkerElement } from '@/components/map/PinMarker';
import { RdvMiniPreview } from '@/components/map/RdvMiniPreview';
import { TourSummaryBar } from '@/components/map/TourSummaryBar';
import { useRouteDirections } from '@/hooks/useRouteDirections';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { SimpleFolderTabsList, DraggableFolderContentContainer, FolderTabConfig } from '@/components/ui/draggable-folder-tabs';
import { useSessionState } from '@/hooks/useSessionState';

const MAPBOX_STYLE = 'mapbox://styles/bij40/cmjbi8grj000t01s3ajxo3amm';
const FALLBACK_MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';
const DEFAULT_CENTER: [number, number] = [1.4442, 43.6047];
const DEFAULT_ZOOM = 6;
const TOUR_ROUTE_SOURCE = 'tour-route-source-pilotage';
const TOUR_ROUTE_LAYER = 'tour-route-layer-pilotage';
const HEATMAP_SOURCE = 'heatmap-source-pilotage';
const HEATMAP_LAYER = 'heatmap-layer-pilotage';
const PROFIT_SOURCE = 'profit-source-pilotage';
const PROFIT_LAYER_POS = 'profit-layer-pos-pilotage';
const PROFIT_LAYER_NEG = 'profit-layer-neg-pilotage';
const PROFIT_CIRCLES = 'profit-circles-pilotage';
const ZONES_SOURCE = 'zones-source-pilotage';
const ZONES_CIRCLES = 'zones-circles-pilotage';

function enableStyleFallback(m: mapboxgl.Map) {
  let fallbackApplied = false;
  const applyFallback = () => {
    if (fallbackApplied) return;
    fallbackApplied = true;
    m.setStyle(FALLBACK_MAPBOX_STYLE);
    m.once('style.load', () => m.resize());
  };
  m.on('error', (event: any) => {
    const message = String(event?.error?.message ?? '').toLowerCase();
    const status = event?.error?.status ?? event?.error?.statusCode;
    if (message.includes('style') || message.includes('sprite') || message.includes('source') || status === 401 || status === 403 || status === 404) {
      applyFallback();
    }
  });
  m.on('styledata', () => {
    if (!m.isStyleLoaded()) return;
    const style = m.getStyle();
    const sourceCount = Object.keys(style?.sources ?? {}).length;
    const hasRenderableLayer = (style?.layers ?? []).some(layer => layer.type !== 'background');
    if (sourceCount === 0 || !hasRenderableLayer) applyFallback();
  });
}

type ViewMode = 'day' | 'week';
type MapMode = 'pins' | 'heatmap' | 'profitability' | 'zones';

type MapsSubTab = 'rdv' | 'densite' | 'rentabilite' | 'zones';

const MAP_SUB_TABS: FolderTabConfig[] = [
  { id: 'rdv', label: 'Rendez-vous', icon: MapPin, accent: 'blue' },
  { id: 'densite', label: 'Densité', icon: Flame, accent: 'pink' },
  { id: 'rentabilite', label: 'Rentabilité', icon: PieChart, accent: 'green' },
  { id: 'zones', label: 'Zones blanches', icon: Crosshair, accent: 'orange' },
];

const TAB_ACCENT_COLORS: Record<string, string> = {
  blue: 'hsl(var(--warm-blue))',
  pink: 'hsl(var(--warm-pink))',
  green: 'hsl(var(--warm-green))',
  orange: 'hsl(var(--warm-orange))',
};

export default function MapsTabContent() {
  const { agence } = useProfile();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [activeSubTab, setActiveSubTab] = useSessionState<MapsSubTab>('maps_sub_tab', 'rdv');
  const mapMode: MapMode = activeSubTab === 'densite' ? 'heatmap' : activeSubTab === 'rentabilite' ? 'profitability' : activeSubTab === 'zones' ? 'zones' : 'pins';
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [techFilterOpen, setTechFilterOpen] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<MapRdv | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Day mode: single date query
  const { rdvs: dayRdvs, isLoading: dayLoading, error: dayError, technicians } = useRdvMap({
    date: selectedDate,
    techIds: selectedTechIds.length > 0 ? selectedTechIds : undefined,
    agencySlug: agence || undefined,
  });

  // Week mode: fetch each day of the week
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate, viewMode]);

  const weekQueries = useQueries({
    queries: weekDays.map(day => ({
      queryKey: ['rdv-map', format(day, 'yyyy-MM-dd'), selectedTechIds.join(',') || 'all', agence],
      queryFn: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Non authentifié');
        const response = await supabase.functions.invoke('get-rdv-map', {
          body: {
            date: format(day, 'yyyy-MM-dd'),
            techIds: selectedTechIds.length ? selectedTechIds : undefined,
            agencySlug: agence,
          },
        });
        if (response.error) throw new Error(response.error.message);
        const result = response.data;
        if (!result.success) throw new Error(result.error || 'Erreur');
        return result.data as MapRdv[];
      },
      enabled: viewMode === 'week' && !!agence,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const weekRdvs = useMemo(() => {
    if (viewMode !== 'week') return [];
    return weekQueries.flatMap(q => q.data || []);
  }, [weekQueries, viewMode]);

  const weekLoading = viewMode === 'week' && weekQueries.some(q => q.isLoading);
  const weekError = viewMode === 'week' ? weekQueries.find(q => q.error)?.error : null;

  // Heatmap: fetch ALL historical coordinates (independent of date)
  const { data: heatmapPoints, isLoading: heatmapLoading } = useQuery({
    queryKey: ['rdv-heatmap', agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: {
          mode: 'heatmap',
          agencySlug: agence,
        },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erreur');
      return result.data as { lat: number; lng: number }[];
    },
    enabled: mapMode === 'heatmap' && !!agence,
    staleTime: 30 * 60 * 1000, // 30 min cache
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Profitability: fetch per-project margin data
  interface ProfitPoint { lat: number; lng: number; ca: number; hours: number; margin: number; projectId: number }
  const { data: profitPoints, isLoading: profitLoading } = useQuery({
    queryKey: ['rdv-profitability', agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: { mode: 'profitability', agencySlug: agence },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erreur');
      return result.data as ProfitPoint[];
    },
    enabled: mapMode === 'profitability' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Unified data based on view mode
  const rdvs = viewMode === 'day' ? dayRdvs : weekRdvs;
  const isLoading = viewMode === 'day' ? dayLoading : weekLoading;
  const error = viewMode === 'day' ? dayError : (weekError instanceof Error ? weekError.message : null);

  // Tour mode
  const isTourMode = selectedTechIds.length === 1;
  const tourTech = isTourMode ? technicians.find(t => t.id === selectedTechIds[0]) : null;

  const sortedRdvs = useMemo(() => {
    if (!isTourMode) return rdvs;
    return [...rdvs].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [rdvs, isTourMode]);

  const routeCoords = useMemo<[number, number][]>(() => {
    if (!isTourMode || sortedRdvs.length < 2) return [];
    return sortedRdvs.map(r => [r.lng, r.lat]);
  }, [isTourMode, sortedRdvs]);

  const { geometry: routeGeometry, distanceKm, durationMin, isLoading: routeLoading } =
    useRouteDirections(routeCoords, mapboxToken, isTourMode && routeCoords.length >= 2);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        if (token) { setMapboxToken(token); return; }
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) { setTokenError('Impossible de récupérer le token Mapbox'); return; }
        if (data?.token) { setMapboxToken(data.token); return; }
        setTokenError('Token Mapbox non configuré');
      } catch { setTokenError('Impossible de récupérer le token Mapbox'); }
    };
    fetchToken();
  }, []);

  // Init map — delayed to ensure container has dimensions
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;
    if (!mapboxgl.supported()) { setMapInitError('WebGL non supporté.'); return; }
    setMapInitError(null);
    setMapReady(false);

    const container = mapContainer.current;
    let ro: ResizeObserver | null = null;

    const initTimer = setTimeout(() => {
      try {
        mapboxgl.accessToken = mapboxToken;
        map.current = new mapboxgl.Map({
          container,
          style: MAPBOX_STYLE,
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: true,
        });

        map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

        map.current.on('load', () => {
          setMapReady(true);
          map.current?.resize();
        });

        enableStyleFallback(map.current);

        ro = new ResizeObserver(() => {
          if (map.current && !(map.current as any)._removed) {
            map.current.resize();
          }
        });
        ro.observe(container);
      } catch (err) {
        setMapInitError(err instanceof Error ? err.message : 'Erreur init carte');
        map.current = null;
      }
    }, 150);

    return () => {
      clearTimeout(initTimer);
      ro?.disconnect();
      setMapReady(false);
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  const hasFittedBoundsRef = useRef(false);
  const lastRdvsLengthRef = useRef(0);

  // Update markers (only in pins mode)
  useEffect(() => {
    if (!map.current || !mapReady) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (mapMode === 'heatmap' || mapMode === 'profitability') return; // No pins in heatmap/profitability mode

    sortedRdvs.forEach((rdv, index) => {
      const isSelected = selectedRdv?.rdvId === rdv.rdvId;
      const orderNumber = isTourMode ? index + 1 : undefined;

      const el = createPinMarkerElement(rdv.users, 40, isSelected, () => {
        setSelectedRdv(prev => prev?.rdvId === rdv.rdvId ? null : rdv);
      }, orderNumber);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([rdv.lng, rdv.lat])
        .addTo(map.current!);
      markersRef.current.push(marker);
    });

    const rdvsChanged = sortedRdvs.length !== lastRdvsLengthRef.current || !hasFittedBoundsRef.current;
    lastRdvsLengthRef.current = sortedRdvs.length;

    if (rdvsChanged && sortedRdvs.length > 0) {
      const bounds = calculateBounds(sortedRdvs);
      if (bounds) {
        const container = map.current.getContainer();
        const padX = Math.max(56, Math.round((container.clientWidth || 800) * 0.12));
        const padY = Math.max(56, Math.round((container.clientHeight || 600) * 0.12));
        map.current.fitBounds(bounds, {
          padding: { top: padY, bottom: padY + 60, left: padX, right: padX },
          maxZoom: 14,
          duration: 1000,
        });
        hasFittedBoundsRef.current = true;
      }
    }
  }, [sortedRdvs, selectedRdv, mapReady, isTourMode, mapMode]);

  // Heatmap layer — uses historical data, not date-filtered
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    // Clean previous heatmap
    if (m.getLayer(HEATMAP_LAYER)) m.removeLayer(HEATMAP_LAYER);
    if (m.getSource(HEATMAP_SOURCE)) m.removeSource(HEATMAP_SOURCE);

    if (mapMode !== 'heatmap' || !heatmapPoints?.length) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: heatmapPoints.map(pt => ({
        type: 'Feature' as const,
        properties: { weight: 1 },
        geometry: { type: 'Point' as const, coordinates: [pt.lng, pt.lat] },
      })),
    };

    m.addSource(HEATMAP_SOURCE, { type: 'geojson', data: geojson });

    m.addLayer({
      id: HEATMAP_LAYER,
      type: 'heatmap',
      source: HEATMAP_SOURCE,
      paint: {
        'heatmap-weight': 1,
        // Stronger intensity for dense choropleth-like look
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 3, 12, 5, 16, 8],
        // Color ramp: deep red choropleth — light pink → crimson → dark burgundy → near black
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0,    'rgba(255,245,245,0)',
          0.05, 'rgba(252,210,210,0.7)',
          0.15, 'rgba(240,160,160,0.8)',
          0.3,  'rgba(210,80,80,0.85)',
          0.45, 'rgba(180,40,40,0.9)',
          0.6,  'rgba(150,20,20,0.92)',
          0.75, 'rgba(120,10,10,0.95)',
          0.9,  'rgba(80,5,5,0.97)',
          1,    'rgba(40,0,0,1)',
        ],
        // Large radius for continuous fill (not dots)
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 6, 40, 10, 60, 14, 80, 18, 100],
        'heatmap-opacity': 0.9,
      },
    });

    // Fit bounds
    if (!hasFittedBoundsRef.current && heatmapPoints.length > 0) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      heatmapPoints.forEach(p => { minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng); minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); });
      const pad = 0.1;
      const bounds: [[number, number], [number, number]] = [[minLng - pad, minLat - pad], [maxLng + pad, maxLat + pad]];
      const container = m.getContainer();
      const padX = Math.max(56, Math.round((container.clientWidth || 800) * 0.12));
      const padY = Math.max(56, Math.round((container.clientHeight || 600) * 0.12));
      m.fitBounds(bounds, {
        padding: { top: padY, bottom: padY + 60, left: padX, right: padX },
        maxZoom: 12,
        duration: 1000,
      });
      hasFittedBoundsRef.current = true;
    }
  }, [heatmapPoints, mapReady, mapMode]);

  // Profitability layer — colored circles: green (profitable) → red (unprofitable)
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    // Clean previous profitability layers
    [PROFIT_CIRCLES, PROFIT_LAYER_POS, PROFIT_LAYER_NEG].forEach(l => { if (m.getLayer(l)) m.removeLayer(l); });
    if (m.getSource(PROFIT_SOURCE)) m.removeSource(PROFIT_SOURCE);

    if (mapMode !== 'profitability' || !profitPoints?.length) return;

    // Compute max absolute margin for normalization
    const maxAbsMargin = Math.max(...profitPoints.map(p => Math.abs(p.margin)), 1);

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: profitPoints.map(pt => ({
        type: 'Feature' as const,
        properties: {
          margin: pt.margin,
          ca: pt.ca,
          hours: pt.hours,
          // Normalized margin [-1, 1]
          marginNorm: Math.max(-1, Math.min(1, pt.margin / maxAbsMargin)),
        },
        geometry: { type: 'Point' as const, coordinates: [pt.lng, pt.lat] },
      })),
    };

    m.addSource(PROFIT_SOURCE, { type: 'geojson', data: geojson });

    // Circle layer: color interpolated from red (negative margin) to green (positive margin)
    m.addLayer({
      id: PROFIT_CIRCLES,
      type: 'circle',
      source: PROFIT_SOURCE,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          4, 6,
          10, 12,
          14, 18,
          18, 24,
        ],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'marginNorm'],
          -1, '#dc2626',   // Deep red — very unprofitable
          -0.3, '#ef4444', // Red
          0, '#fbbf24',    // Yellow — breakeven
          0.3, '#22c55e',  // Green
          1, '#15803d',    // Deep green — very profitable
        ],
        'circle-opacity': 0.75,
        'circle-stroke-color': [
          'interpolate', ['linear'], ['get', 'marginNorm'],
          -1, '#991b1b',
          0, '#a16207',
          1, '#166534',
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-opacity': 0.9,
      },
    });

    // Fit bounds
    if (!hasFittedBoundsRef.current && profitPoints.length > 0) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      profitPoints.forEach(p => { minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng); minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); });
      const pad = 0.1;
      const bounds: [[number, number], [number, number]] = [[minLng - pad, minLat - pad], [maxLng + pad, maxLat + pad]];
      const container = m.getContainer();
      const padX = Math.max(56, Math.round((container.clientWidth || 800) * 0.12));
      const padY = Math.max(56, Math.round((container.clientHeight || 600) * 0.12));
      m.fitBounds(bounds, {
        padding: { top: padY, bottom: padY + 60, left: padX, right: padX },
        maxZoom: 12,
        duration: 1000,
      });
      hasFittedBoundsRef.current = true;
    }

    // Popup on click
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [PROFIT_CIRCLES] });
      if (!features?.length) return;
      const props = features[0].properties;
      if (!props) return;
      const margin = props.margin as number;
      const ca = props.ca as number;
      const hours = props.hours as number;
      const coords = (features[0].geometry as any).coordinates as [number, number];
      
      new mapboxgl.Popup({ closeButton: true, maxWidth: '260px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family: system-ui; font-size: 13px; line-height: 1.5;">
            <div style="font-weight: 600; margin-bottom: 4px; color: ${margin >= 0 ? '#15803d' : '#dc2626'}">
              Marge: ${margin >= 0 ? '+' : ''}${Math.round(margin).toLocaleString('fr-FR')} €
            </div>
            <div>CA facturé: ${Math.round(ca).toLocaleString('fr-FR')} €</div>
            <div>Heures estimées: ${hours.toFixed(1)} h</div>
            <div>Coût estimé: ${Math.round(hours * 35).toLocaleString('fr-FR')} €</div>
          </div>
        `)
        .addTo(m);
    };

    m.on('click', PROFIT_CIRCLES, handleClick);
    m.on('mouseenter', PROFIT_CIRCLES, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', PROFIT_CIRCLES, () => { m.getCanvas().style.cursor = ''; });

    return () => {
      m.off('click', PROFIT_CIRCLES, handleClick);
    };
  }, [profitPoints, mapReady, mapMode]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    if (m.getLayer(TOUR_ROUTE_LAYER)) m.removeLayer(TOUR_ROUTE_LAYER);
    if (m.getSource(TOUR_ROUTE_SOURCE)) m.removeSource(TOUR_ROUTE_SOURCE);

    if (!isTourMode || !routeGeometry) return;

    m.addSource(TOUR_ROUTE_SOURCE, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: routeGeometry },
    });

    m.addLayer({
      id: TOUR_ROUTE_LAYER,
      type: 'line',
      source: TOUR_ROUTE_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': tourTech?.color || '#6366f1',
        'line-width': 4,
        'line-dasharray': [2, 3],
        'line-opacity': 0.75,
      },
    });
  }, [routeGeometry, isTourMode, mapReady, tourTech?.color]);

  useEffect(() => { hasFittedBoundsRef.current = false; }, [selectedDate, selectedTechIds, viewMode, mapMode]);

  const goToPreviousDay = () => {
    setSelectedDate(d => viewMode === 'week' ? subDays(d, 7) : subDays(d, 1));
  };
  const goToNextDay = () => {
    setSelectedDate(d => viewMode === 'week' ? addDays(d, 7) : addDays(d, 1));
  };
  const goToToday = () => setSelectedDate(new Date());
  const goToTomorrow = () => { setViewMode('day'); setSelectedDate(addDays(new Date(), 1)); };
  
  const toggleWeekMode = () => setViewMode(prev => prev === 'week' ? 'day' : 'week');

  const toggleTechnician = (techId: number) => {
    setSelectedTechIds(prev =>
      prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
    );
  };
  const clearTechFilter = () => setSelectedTechIds([]);

  if (tokenError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{tokenError}. Veuillez configurer le secret MAPBOX_ACCESS_TOKEN.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeTabConfig = MAP_SUB_TABS.find(t => t.id === activeSubTab);
  const activeAccentColor = activeTabConfig?.accent ? TAB_ACCENT_COLORS[activeTabConfig.accent] : undefined;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 12rem)' }}>
      <SimpleFolderTabsList
        tabs={MAP_SUB_TABS}
        activeTab={activeSubTab}
        onTabChange={(v) => { setActiveSubTab(v as MapsSubTab); setSelectedRdv(null); }}
      />

      <DraggableFolderContentContainer accentColor={activeAccentColor} className="flex-1 flex flex-col min-h-0 !p-0">
        {/* Barre de filtres — visible uniquement en mode RDV */}
        {mapMode === 'pins' && (
          <div className="flex-none p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {viewMode === 'week'
                        ? `Sem. du ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })} au ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: fr })}`
                        : format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus locale={fr} />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" onClick={goToNextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button variant={viewMode === 'day' && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'ghost'} size="sm" onClick={goToToday}>
                  Aujourd'hui
                </Button>
                <Button variant={viewMode === 'day' && format(selectedDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'default' : 'ghost'} size="sm" onClick={goToTomorrow}>
                  Demain
                </Button>
                <Button variant={viewMode === 'week' ? 'default' : 'ghost'} size="sm" onClick={toggleWeekMode} className="gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Semaine
                </Button>
              </div>

              <Popover open={techFilterOpen} onOpenChange={setTechFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Techniciens
                    {selectedTechIds.length > 0 && <Badge variant="secondary" className="ml-1">{selectedTechIds.length}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un technicien..." />
                    <CommandList>
                      <CommandEmpty>Aucun technicien trouvé</CommandEmpty>
                      <CommandGroup>
                        {technicians.map((tech) => (
                          <CommandItem key={tech.id} onSelect={() => toggleTechnician(tech.id)} className="cursor-pointer">
                            <div className={cn('mr-2 h-4 w-4 rounded border flex items-center justify-center', selectedTechIds.includes(tech.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground')}>
                              {selectedTechIds.includes(tech.id) && <span className="text-xs">✓</span>}
                            </div>
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: tech.color }} />
                            {tech.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  {selectedTechIds.length > 0 && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full" onClick={clearTechFilter}>Effacer les filtres</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                <MapPin className="h-4 w-4" />
                <span>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${rdvs.length} RDV`}</span>
              </div>
            </div>

            {selectedTechIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTechIds.map((id) => {
                  const tech = technicians.find(t => t.id === id);
                  if (!tech) return null;
                  return (
                    <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => toggleTechnician(id)}>
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: tech.color }} />
                      {tech.name}
                      <span className="ml-1 text-muted-foreground">×</span>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Barre info densité */}
        {mapMode === 'heatmap' && (
          <div className="flex-none p-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-destructive" />
            <span>Densité sur l'historique complet</span>
            <span className="ml-auto">
              {heatmapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${heatmapPoints?.length || 0} interventions`}
            </span>
          </div>
        )}

        {/* Barre info rentabilité */}
        {mapMode === 'profitability' && (
          <div className="flex-none p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PieChart className="h-4 w-4 text-primary" />
              <span>Rentabilité par zone — historique complet (CA – coûts estimés à 35 €/h)</span>
              <span className="ml-auto">
                {profitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${profitPoints?.length || 0} dossiers`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                <span className="text-muted-foreground">Zone déficitaire</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
                <span className="text-muted-foreground">Équilibre</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#15803d' }} />
                <span className="text-muted-foreground">Zone rentable</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
          <div className="relative h-full w-full overflow-hidden bg-background">
            {!mapboxToken ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
            )}

            {mapInitError && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{mapInitError}</AlertDescription>
                </Alert>
              </div>
            )}

            {((isLoading && mapMode === 'pins') || (heatmapLoading && mapMode === 'heatmap') || (profitLoading && mapMode === 'profitability')) && mapboxToken && !mapInitError && (
              <div className="absolute top-4 left-4 bg-background/80 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{mapMode === 'heatmap' ? 'Chargement de l\'historique...' : mapMode === 'profitability' ? 'Analyse de rentabilité...' : 'Chargement des RDV...'}</span>
              </div>
            )}

            {selectedRdv && !isLoading && (
              <RdvMiniPreview rdv={selectedRdv} onClose={() => setSelectedRdv(null)} />
            )}

            {error && !mapInitError && (
              <div className="absolute top-4 left-4 right-4 max-w-md">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {isTourMode && tourTech && sortedRdvs.length >= 2 && (
              <TourSummaryBar
                techName={tourTech.name}
                techColor={tourTech.color}
                rdvCount={sortedRdvs.length}
                distanceKm={distanceKm}
                durationMin={durationMin}
                isLoading={routeLoading}
              />
            )}
          </div>
        </div>
      </DraggableFolderContentContainer>
    </div>
  );
}
