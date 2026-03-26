/**
 * MapsTabContent - Onglet "Maps" dans Pilotage
 * v3: Progress bar for analytics map modes
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Loader2, MapPin, AlertCircle, CalendarDays, Flame, PieChart, Crosshair, Network } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
const APPORTEURS_SOURCE = 'apporteurs-source-pilotage';
const APPORTEURS_CIRCLES = 'apporteurs-circles-pilotage';

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
type MapMode = 'pins' | 'heatmap' | 'profitability' | 'zones' | 'apporteurs';

type MapsSubTab = 'rdv' | 'densite' | 'rentabilite' | 'zones' | 'apporteurs';

const MAP_SUB_TABS: FolderTabConfig[] = [
  { id: 'rdv', label: 'Rendez-vous', icon: MapPin, accent: 'blue' },
  { id: 'densite', label: 'Densité', icon: Flame, accent: 'pink' },
  { id: 'rentabilite', label: 'Rentabilité', icon: PieChart, accent: 'green' },
  { id: 'zones', label: 'Zones blanches', icon: Crosshair, accent: 'orange' },
  { id: 'apporteurs', label: 'Apporteurs', icon: Network, accent: 'purple' },
];

const TAB_ACCENT_COLORS: Record<string, string> = {
  blue: 'hsl(var(--warm-blue))',
  pink: 'hsl(var(--warm-pink))',
  green: 'hsl(var(--warm-green))',
  orange: 'hsl(var(--warm-orange))',
  purple: 'hsl(var(--warm-purple, 270 60% 55%))',
};

/** Animated progress overlay for analytics map modes */
function MapLoadingOverlay({ mode }: { mode: MapMode }) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    setProgress(0);
    // Simulate progress: fast start, slow finish (asymptotic to 95%)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        // Fast at start, slowing down
        const increment = prev < 30 ? 8 : prev < 60 ? 4 : prev < 80 ? 2 : 0.5;
        return Math.min(95, prev + increment);
      });
    }, 300);
    return () => clearInterval(interval);
  }, [mode]);

  const labels: Record<MapMode, string> = {
    pins: 'Chargement des RDV…',
    heatmap: 'Analyse de densité historique…',
    profitability: 'Calcul de rentabilité par zone…',
    zones: 'Analyse des zones commerciales…',
    apporteurs: 'Analyse des apporteurs par zone…',
  };

  return (
    <div className="absolute top-4 left-4 right-4 max-w-md bg-background/90 backdrop-blur rounded-lg px-4 py-3 shadow-lg border border-border space-y-2 z-10">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">{labels[mode]}</span>
        <span className="text-xs text-muted-foreground ml-auto">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-1.5" indicatorClassName="bg-primary transition-all duration-300" />
    </div>
  );
}

export default function MapsTabContent() {
  const { agence } = useProfile();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [activeSubTab, setActiveSubTab] = useSessionState<MapsSubTab>('maps_sub_tab', 'rdv');
  const mapMode: MapMode = activeSubTab === 'densite' ? 'heatmap' : activeSubTab === 'rentabilite' ? 'profitability' : activeSubTab === 'zones' ? 'zones' : activeSubTab === 'apporteurs' ? 'apporteurs' : 'pins';
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

  // Zones blanches: aggregated KPIs per postal code
  interface ZonePoint {
    postalCode: string;
    city: string;
    lat: number;
    lng: number;
    nbProjects: number;
    nbClients: number;
    nbApporteurs: number;
    nbUnivers: number;
    univers: string[];
    ca: number;
    panierMoyen: number;
    devisTotal: number;
    devisSigned: number;
    interventionCount: number;
    activityLevel: 'none' | 'low' | 'medium' | 'high';
    opportunityScore: number;
    insights: string[];
  }
  const { data: zonesData, isLoading: zonesLoading } = useQuery({
    queryKey: ['rdv-zones', agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: { mode: 'zones', agencySlug: agence },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erreur');
      return result.data as ZonePoint[];
    },
    enabled: mapMode === 'zones' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Apporteurs: origin breakdown per postal code
  interface ApporteurBreakdown { type: string; count: number; ca: number; color: string; share: number; nbApporteurs: number; }
  interface ApporteurZonePoint {
    postalCode: string; city: string; lat: number; lng: number;
    totalProjects: number; totalCA: number; panierMoyen: number;
    devisTotal: number; devisSigned: number; transformRate: number; interventionCount: number;
    dominantOrigin: string; dominantColor: string;
    breakdown: ApporteurBreakdown[];
    top1Share: number; top3Share: number; diversificationIndex: number;
    topApporteurs: { name: string; count: number; ca: number }[];
    insights: string[];
  }
  const { data: apporteursData, isLoading: apporteursLoading } = useQuery({
    queryKey: ['rdv-apporteurs', agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: { mode: 'apporteurs', agencySlug: agence },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erreur');
      return result.data as ApporteurZonePoint[];
    },
    enabled: mapMode === 'apporteurs' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

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

    if (mapMode === 'heatmap' || mapMode === 'profitability' || mapMode === 'zones') return;

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

  // Zones blanches layer — colored circles by activity level + opportunity score
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    // Clean previous zones layers
    if (m.getLayer(ZONES_CIRCLES)) m.removeLayer(ZONES_CIRCLES);
    if (m.getSource(ZONES_SOURCE)) m.removeSource(ZONES_SOURCE);

    if (mapMode !== 'zones' || !zonesData?.length) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: zonesData.map(z => ({
        type: 'Feature' as const,
        properties: {
          postalCode: z.postalCode,
          city: z.city,
          nbProjects: z.nbProjects,
          nbClients: z.nbClients,
          nbApporteurs: z.nbApporteurs,
          nbUnivers: z.nbUnivers,
          univers: JSON.stringify(z.univers),
          ca: z.ca,
          panierMoyen: z.panierMoyen,
          devisTotal: z.devisTotal,
          devisSigned: z.devisSigned,
          interventionCount: z.interventionCount,
          activityLevel: z.activityLevel,
          opportunityScore: z.opportunityScore,
          insights: JSON.stringify(z.insights),
          // For color interpolation: 0=none, 1=low, 2=medium, 3=high
          activityIndex: z.activityLevel === 'none' ? 0 : z.activityLevel === 'low' ? 1 : z.activityLevel === 'medium' ? 2 : 3,
        },
        geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
      })),
    };

    m.addSource(ZONES_SOURCE, { type: 'geojson', data: geojson });

    m.addLayer({
      id: ZONES_CIRCLES,
      type: 'circle',
      source: ZONES_SOURCE,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          4, ['interpolate', ['linear'], ['get', 'nbProjects'], 0, 8, 5, 12, 20, 18, 50, 24],
          10, ['interpolate', ['linear'], ['get', 'nbProjects'], 0, 14, 5, 20, 20, 30, 50, 40],
          14, ['interpolate', ['linear'], ['get', 'nbProjects'], 0, 20, 5, 28, 20, 38, 50, 50],
        ],
        // gris → jaune → vert → bleu foncé
        'circle-color': [
          'interpolate', ['linear'], ['get', 'activityIndex'],
          0, '#d1d5db', // gris clair — zone blanche
          1, '#fbbf24', // jaune — présence faible
          2, '#22c55e', // vert — présence correcte
          3, '#1e40af', // bleu foncé — zone forte
        ],
        'circle-opacity': [
          'interpolate', ['linear'], ['get', 'activityIndex'],
          0, 0.5,
          1, 0.65,
          2, 0.75,
          3, 0.85,
        ],
        'circle-stroke-color': [
          'interpolate', ['linear'], ['get', 'opportunityScore'],
          0, '#9ca3af',
          50, '#f59e0b',
          80, '#ef4444',
          100, '#dc2626',
        ],
        'circle-stroke-width': [
          'interpolate', ['linear'], ['get', 'opportunityScore'],
          0, 1,
          50, 2,
          80, 3,
          100, 4,
        ],
        'circle-stroke-opacity': 0.9,
      },
    });

    // Fit bounds
    if (!hasFittedBoundsRef.current && zonesData.length > 0) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      zonesData.forEach(p => { minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng); minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); });
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

    // Popup on click with rich KPIs
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [ZONES_CIRCLES] });
      if (!features?.length) return;
      const p = features[0].properties;
      if (!p) return;
      const coords = (features[0].geometry as any).coordinates as [number, number];
      
      const insights: string[] = (() => { try { return JSON.parse(p.insights); } catch { return []; } })();
      const univers: string[] = (() => { try { return JSON.parse(p.univers); } catch { return []; } })();
      
      const scoreBg = p.opportunityScore >= 80 ? '#dc2626' : p.opportunityScore >= 60 ? '#f59e0b' : p.opportunityScore >= 30 ? '#6b7280' : '#9ca3af';
      const scoreLabel = p.opportunityScore >= 80 ? 'Zone à attaquer' : p.opportunityScore >= 60 ? 'Potentiel intéressant' : p.opportunityScore >= 30 ? 'À surveiller' : 'Pas prioritaire';
      
      new mapboxgl.Popup({ closeButton: true, maxWidth: '340px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family: system-ui; font-size: 12px; line-height: 1.6;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
              ${p.postalCode} ${p.city}
              <span style="background: ${scoreBg}; color: white; border-radius: 10px; padding: 1px 8px; font-size: 11px; font-weight: 600;">${p.opportunityScore}/100</span>
            </div>
            <div style="color: #6b7280; font-size: 11px; margin-bottom: 8px;">${scoreLabel}</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-bottom: 8px;">
              <div>📁 <b>${p.nbProjects}</b> dossiers</div>
              <div>👤 <b>${p.nbClients}</b> clients</div>
              <div>📝 <b>${p.devisTotal}</b> devis (${p.devisSigned} signés)</div>
              <div>🔧 <b>${p.interventionCount}</b> interventions</div>
              <div>💰 CA: <b>${Number(p.ca).toLocaleString('fr-FR')} €</b></div>
              <div>🧺 Panier: <b>${Number(p.panierMoyen).toLocaleString('fr-FR')} €</b></div>
              <div>🤝 <b>${p.nbApporteurs}</b> apporteurs</div>
              <div>🏗️ <b>${p.nbUnivers}</b> métiers</div>
            </div>
            
            ${univers.length > 0 ? `<div style="margin-bottom: 6px; color: #4b5563;"><b>Métiers :</b> ${univers.join(', ')}</div>` : ''}
            
            ${insights.length > 0 ? `
              <div style="background: #fef3c7; border-radius: 6px; padding: 6px 8px; margin-top: 4px;">
                ${insights.map(i => `<div style="color: #92400e; font-size: 11px;">💡 ${i}</div>`).join('')}
              </div>
            ` : ''}
          </div>
        `)
        .addTo(m);
    };

    m.on('click', ZONES_CIRCLES, handleClick);
    m.on('mouseenter', ZONES_CIRCLES, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', ZONES_CIRCLES, () => { m.getCanvas().style.cursor = ''; });

    return () => {
      m.off('click', ZONES_CIRCLES, handleClick);
    };
  }, [zonesData, mapReady, mapMode]);

  // Draw/remove route layer
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

        {/* Barre info zones blanches */}
        {mapMode === 'zones' && (
          <div className="flex-none p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crosshair className="h-4 w-4" />
              <span>Zones blanches commerciales — analyse par code postal</span>
              <span className="ml-auto">
                {zonesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${zonesData?.length || 0} zones`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d1d5db' }} /><span className="text-muted-foreground">Zone blanche</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} /><span className="text-muted-foreground">Faible</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} /><span className="text-muted-foreground">Correcte</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1e40af' }} /><span className="text-muted-foreground">Forte</span></div>
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l"><span className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#dc2626', backgroundColor: 'transparent' }} /><span className="text-muted-foreground">Bordure = opportunité</span></div>
            </div>
            {zonesData && zonesData.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>🏆 Top : <b>{zonesData[0].postalCode} {zonesData[0].city}</b> (score {zonesData[0].opportunityScore}/100)</span>
                {zonesData[0].insights[0] && <span className="text-amber-600">💡 {zonesData[0].insights[0]}</span>}
              </div>
            )}
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

            {((isLoading && mapMode === 'pins') || (heatmapLoading && mapMode === 'heatmap') || (profitLoading && mapMode === 'profitability') || (zonesLoading && mapMode === 'zones')) && mapboxToken && !mapInitError && (
              <MapLoadingOverlay mode={mapMode} />
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
