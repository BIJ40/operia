/**
 * MapsTabContent - Onglet "Maps" dans Pilotage
 * v3: Progress bar for analytics map modes
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Loader2, MapPin, AlertCircle, CalendarDays, Flame, PieChart, Crosshair, Network, Radio, Clock, Wrench, Navigation, CalendarRange, Play, Pause, SkipBack, SkipForward, TrendingUp, TrendingDown, Trophy, Shield, Target, BarChart3, Star, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
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
const DENSITY_SOURCE = 'density-source-pilotage';
const DENSITY_FILL = 'density-fill-pilotage';
const DENSITY_LINE = 'density-line-pilotage';
const DENSITY_LABELS = 'density-labels-pilotage';
const PROFIT_SOURCE = 'profit-source-pilotage';
const PROFIT_FILL = 'profit-fill-pilotage';
const PROFIT_LINE = 'profit-line-pilotage';
const PROFIT_LABELS = 'profit-labels-pilotage';
const ZONES_SOURCE = 'zones-source-pilotage';
const ZONES_FILL = 'zones-fill-pilotage';
const ZONES_LINE = 'zones-line-pilotage';
const ZONES_LABELS = 'zones-labels-pilotage';
const APPORTEURS_SOURCE = 'apporteurs-source-pilotage';
const APPORTEURS_FILL = 'apporteurs-fill-pilotage';
const APPORTEURS_LINE = 'apporteurs-line-pilotage';
const APPORTEURS_LABELS = 'apporteurs-labels-pilotage';
const DISPO_SOURCE = 'dispo-source-pilotage';
const DISPO_CIRCLES = 'dispo-circles-pilotage';
const SEASON_SOURCE = 'season-source-pilotage';
const SEASON_CIRCLES = 'season-circles-pilotage';
const SCORE_SOURCE = 'score-source-pilotage';
const SCORE_FILL = 'score-fill-pilotage';
const SCORE_LINE = 'score-line-pilotage';
const SCORE_LABELS = 'score-labels-pilotage';

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
type MapMode = 'pins' | 'heatmap' | 'profitability' | 'zones' | 'apporteurs' | 'disponibilite' | 'saisonnalite' | 'score_global';

type MapsSubTab = 'rdv' | 'densite' | 'rentabilite' | 'zones' | 'apporteurs' | 'disponibilite' | 'saisonnalite' | 'score_global';

const MAP_SUB_TABS: FolderTabConfig[] = [
  { id: 'rdv', label: 'Rendez-vous', icon: MapPin, accent: 'blue' },
  { id: 'densite', label: 'Densité', icon: Flame, accent: 'pink' },
  { id: 'rentabilite', label: 'Rentabilité', icon: PieChart, accent: 'green' },
  { id: 'zones', label: 'Zones blanches', icon: Crosshair, accent: 'orange' },
  { id: 'apporteurs', label: 'Apporteurs', icon: Network, accent: 'purple' },
  { id: 'disponibilite', label: 'Disponibilité', icon: Radio, accent: 'teal' },
  { id: 'saisonnalite', label: 'Saisonnalité', icon: CalendarRange, accent: 'orange' },
  { id: 'score_global', label: 'Score Global', icon: Trophy, accent: 'orange' },
];

const TAB_ACCENT_COLORS: Record<string, string> = {
  blue: 'hsl(var(--warm-blue))',
  pink: 'hsl(var(--warm-pink))',
  green: 'hsl(var(--warm-green))',
  orange: 'hsl(var(--warm-orange))',
  purple: 'hsl(var(--warm-purple, 270 60% 55%))',
  teal: 'hsl(var(--warm-teal, 190 60% 45%))',
  amber: 'hsl(var(--warm-orange, 30 90% 55%))',
};

// ── Disponibilité types ──
interface DispoTech {
  techId: number;
  name: string;
  color: string;
  lat: number;
  lng: number;
  status: 'available' | 'soon' | 'busy' | 'saturated' | 'unavailable';
  statusLabel: string;
  currentTask: string | null;
  nextTask: string | null;
  nextTaskTime: string | null;
  freeMinutes: number;
  remainingCapacityMin: number;
  totalDayMin: number;
  occupiedMin: number;
  travelEstimateMin: number;
  skills: string[];
  rdvCount: number;
  rdvDone: number;
  rdvRemaining: number;
  dispatchScore?: number;
}

const DISPO_STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  soon: '#eab308',
  busy: '#f97316',
  saturated: '#dc2626',
  unavailable: '#9ca3af',
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
    disponibilite: 'Calcul de disponibilité temps réel…',
    saisonnalite: 'Analyse de saisonnalité géographique…',
    score_global: 'Calcul du score global multi-critères…',
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
  const mapMode: MapMode = activeSubTab === 'densite' ? 'heatmap' : activeSubTab === 'rentabilite' ? 'profitability' : activeSubTab === 'zones' ? 'zones' : activeSubTab === 'apporteurs' ? 'apporteurs' : activeSubTab === 'disponibilite' ? 'disponibilite' : activeSubTab === 'saisonnalite' ? 'saisonnalite' : activeSubTab === 'score_global' ? 'score_global' : 'pins';
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
  const { data: densityGeoJson, isLoading: heatmapLoading } = useQuery({
    queryKey: ['rdv-density-choropleth', agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: { mode: 'heatmap', agencySlug: agence },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erreur');
      return result.data as GeoJSON.FeatureCollection;
    },
    enabled: mapMode === 'heatmap' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Profitability: choropleth GeoJSON (commune polygons with margin metrics)
  const { data: profitGeoJson, isLoading: profitLoading } = useQuery({
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
      return result.data as GeoJSON.FeatureCollection;
    },
    enabled: mapMode === 'profitability' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Zones blanches: choropleth GeoJSON (commune polygons with activity metrics)
  const { data: zonesGeoJson, isLoading: zonesLoading } = useQuery({
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
      return result.data as GeoJSON.FeatureCollection;
    },
    enabled: mapMode === 'zones' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Apporteurs: choropleth GeoJSON (commune polygons with origin breakdown)
  const { data: apporteursGeoJson, isLoading: apporteursLoading } = useQuery({
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
      return result.data as GeoJSON.FeatureCollection;
    },
    enabled: mapMode === 'apporteurs' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Disponibilité temps réel: tech positions + availability
  const [selectedDispoTech, setSelectedDispoTech] = useState<DispoTech | null>(null);
  const { data: dispoData, isLoading: dispoLoading } = useQuery({
    queryKey: ['rdv-disponibilite', agence, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: { mode: 'disponibilite', agencySlug: agence, date: format(selectedDate, 'yyyy-MM-dd') },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erreur');
      return result.data as DispoTech[];
    },
    enabled: mapMode === 'disponibilite' && !!agence,
    staleTime: 2 * 60 * 1000, // 2 min — quasi temps réel
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: mapMode === 'disponibilite' ? 2 * 60 * 1000 : false, // Auto-refresh every 2 min
  });

  // Saisonnalité: geographic seasonality time-series
  interface SeasonZone {
    postalCode: string; city: string; lat: number; lng: number;
    totalNb: number; totalCA: number; panierMoyen: number;
    series: Record<string, { nb: number; ca: number; topUnivers: string; urgences: number }>;
    variations: Record<string, number>;
    seasonalityIndex: number; predictabilityIndex: number;
    peakMonth: string; peakCalMonth: number; insights: string[];
  }
  interface SeasonResponse { data: SeasonZone[]; meta: { months: string[]; totalZones: number; durationMs: number } }
  const [seasonMonth, setSeasonMonth] = useState(0);
  const [seasonPlaying, setSeasonPlaying] = useState(false);
  const [seasonViewMode, setSeasonViewMode] = useState<'volume' | 'variation'>('volume');
  const { data: seasonRaw, isLoading: seasonLoading } = useQuery({
    queryKey: ['rdv-saisonnalite', agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: { mode: 'saisonnalite', agencySlug: agence },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erreur');
      return { data: result.data as SeasonZone[], meta: result.meta } as SeasonResponse;
    },
    enabled: mapMode === 'saisonnalite' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const seasonData = seasonRaw?.data;
  const seasonMonths = seasonRaw?.meta?.months || [];
  const currentSeasonMonth = seasonMonths[seasonMonth] || '';

  // Auto-play animation
  useEffect(() => {
    if (!seasonPlaying || seasonMonths.length <= 1) return;
    const interval = setInterval(() => {
      setSeasonMonth(prev => {
        if (prev >= seasonMonths.length - 1) { setSeasonPlaying(false); return prev; }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [seasonPlaying, seasonMonths.length]);

  // Score Global: choropleth GeoJSON (commune polygons with composite scores)
  interface ScoreInsight { pc: string; city: string; score?: number; margin?: number }
  interface ScoreMeta { totalZones: number; durationMs: number; insights: { topDevelop: ScoreInsight[]; topTension: ScoreInsight[]; topRentable: ScoreInsight[]; topRisk: ScoreInsight[] } }
  const [scoreSubView, setScoreSubView] = useState<'global' | 'commercial' | 'economique' | 'operationnel' | 'qualite' | 'resilience'>('global');
  const { data: scoreRaw, isLoading: scoreLoading } = useQuery({
    queryKey: ['rdv-score-global', agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');
      const response = await supabase.functions.invoke('get-rdv-map', {
        body: { mode: 'score_global', agencySlug: agence },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erreur');
      return { data: result.data as GeoJSON.FeatureCollection, meta: result.meta as ScoreMeta };
    },
    enabled: mapMode === 'score_global' && !!agence,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const scoreGeoJson = scoreRaw?.data;
  const scoreMeta = scoreRaw?.meta;

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

    if (mapMode === 'heatmap' || mapMode === 'profitability' || mapMode === 'zones' || mapMode === 'apporteurs' || mapMode === 'disponibilite' || mapMode === 'saisonnalite' || mapMode === 'score_global') return;

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


  // ── Helper: fit bounds to GeoJSON polygon features ──
  const fitBoundsToGeoJson = useCallback((m: mapboxgl.Map, geojson: GeoJSON.FeatureCollection) => {
    if (hasFittedBoundsRef.current || !geojson.features.length) return;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    const processCoords = (coords: any) => {
      if (typeof coords[0] === 'number') {
        minLng = Math.min(minLng, coords[0]); maxLng = Math.max(maxLng, coords[0]);
        minLat = Math.min(minLat, coords[1]); maxLat = Math.max(maxLat, coords[1]);
      } else { coords.forEach(processCoords); }
    };
    geojson.features.forEach(f => { if (f.geometry) processCoords((f.geometry as any).coordinates); });
    if (minLng === Infinity) return;
    const container = m.getContainer();
    const padX = Math.max(56, Math.round((container.clientWidth || 800) * 0.12));
    const padY = Math.max(56, Math.round((container.clientHeight || 600) * 0.12));
    m.fitBounds([[minLng - 0.05, minLat - 0.05], [maxLng + 0.05, maxLat + 0.05]], {
      padding: { top: padY, bottom: padY + 60, left: padX, right: padX }, maxZoom: 12, duration: 1000,
    });
    hasFittedBoundsRef.current = true;
  }, []);

  // ── Helper: add choropleth layers (fill + line + labels) ──
  const addChoroplethLayers = useCallback((
    m: mapboxgl.Map, sourceId: string, fillId: string, lineId: string, labelId: string,
    geojson: GeoJSON.FeatureCollection, colorExpr: any[], opacityVal = 0.7,
  ) => {
    m.addSource(sourceId, { type: 'geojson', data: geojson });
    m.addLayer({
      id: fillId, type: 'fill', source: sourceId,
      paint: { 'fill-color': colorExpr, 'fill-opacity': opacityVal },
    });
    m.addLayer({
      id: lineId, type: 'line', source: sourceId,
      paint: { 'line-color': '#ffffff', 'line-width': 1, 'line-opacity': 0.8 },
    });
    m.addLayer({
      id: labelId, type: 'symbol', source: sourceId,
      layout: {
        'text-field': ['get', 'nom'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 9, 12, 12, 16, 14],
        'text-allow-overlap': false, 'text-optional': true,
      },
      paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
    });
  }, []);

  // ── Helper: clean layers ──
  const cleanLayers = useCallback((m: mapboxgl.Map, layers: string[], source: string) => {
    layers.forEach(l => { if (m.getLayer(l)) m.removeLayer(l); });
    if (m.getSource(source)) m.removeSource(source);
  }, []);

  // Profitability choropleth layer — fill communes by margin
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    cleanLayers(m, [PROFIT_FILL, PROFIT_LINE, PROFIT_LABELS], PROFIT_SOURCE);
    if (mapMode !== 'profitability' || !profitGeoJson?.features?.length) return;

    addChoroplethLayers(m, PROFIT_SOURCE, PROFIT_FILL, PROFIT_LINE, PROFIT_LABELS, profitGeoJson, [
      'interpolate', ['linear'], ['get', 'marginNorm'],
      -1, '#dc2626',   // Deep red
      -0.3, '#ef4444',
      0, '#fbbf24',    // Yellow — breakeven
      0.3, '#22c55e',
      1, '#15803d',    // Deep green
    ]);
    fitBoundsToGeoJson(m, profitGeoJson);

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [PROFIT_FILL] });
      if (!features?.length) return;
      const p = features[0].properties;
      if (!p) return;
      new mapboxgl.Popup({ closeButton: true, maxWidth: '300px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:system-ui;font-size:13px;line-height:1.5;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${p.nom || ''} ${p.city || ''}</div>
            <div style="font-weight:600;color:${(p.margin||0) >= 0 ? '#15803d' : '#dc2626'}">
              Marge: ${(p.margin||0) >= 0 ? '+' : ''}${Math.round(p.margin||0).toLocaleString('fr-FR')} €
            </div>
            <div>CA facturé: ${Math.round(p.ca||0).toLocaleString('fr-FR')} €</div>
            <div>Heures: ${(p.hours||0).toFixed?.(1) || p.hours} h</div>
            <div>Dossiers: ${p.nbProjects || 0}</div>
            <div>Taux de marge: ${p.marginRate || 0}%</div>
          </div>
        `)
        .addTo(m);
    };
    m.on('click', PROFIT_FILL, handleClick);
    m.on('mouseenter', PROFIT_FILL, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', PROFIT_FILL, () => { m.getCanvas().style.cursor = ''; });
    return () => { m.off('click', PROFIT_FILL, handleClick); };
  }, [profitGeoJson, mapReady, mapMode, cleanLayers, addChoroplethLayers, fitBoundsToGeoJson]);

  // Zones blanches choropleth layer
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    cleanLayers(m, [ZONES_FILL, ZONES_LINE, ZONES_LABELS], ZONES_SOURCE);
    if (mapMode !== 'zones' || !zonesGeoJson?.features?.length) return;

    addChoroplethLayers(m, ZONES_SOURCE, ZONES_FILL, ZONES_LINE, ZONES_LABELS, zonesGeoJson, [
      'interpolate', ['linear'], ['get', 'activityIndex'],
      0, '#d1d5db', 1, '#fbbf24', 2, '#22c55e', 3, '#1e40af',
    ]);
    fitBoundsToGeoJson(m, zonesGeoJson);

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [ZONES_FILL] });
      if (!features?.length) return;
      const p = features[0].properties;
      if (!p) return;
      const insights: string[] = (() => { try { return JSON.parse(p.insights); } catch { return []; } })();
      const univers: string[] = (() => { try { return JSON.parse(p.univers); } catch { return []; } })();
      const scoreBg = p.opportunityScore >= 80 ? '#dc2626' : p.opportunityScore >= 60 ? '#f59e0b' : '#6b7280';
      new mapboxgl.Popup({ closeButton: true, maxWidth: '340px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:system-ui;font-size:12px;line-height:1.6;">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${p.nom || ''} ${p.city || ''} <span style="background:${scoreBg};color:white;border-radius:10px;padding:1px 8px;font-size:11px;">${p.opportunityScore}/100</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:8px;">
              <div>📁 <b>${p.nbProjects}</b> dossiers</div><div>👤 <b>${p.nbClients}</b> clients</div>
              <div>💰 CA: <b>${Number(p.ca||0).toLocaleString('fr-FR')} €</b></div><div>🤝 <b>${p.nbApporteurs}</b> apporteurs</div>
            </div>
            ${univers.length > 0 ? `<div style="margin-bottom:6px;color:#4b5563;"><b>Métiers:</b> ${univers.join(', ')}</div>` : ''}
            ${insights.length > 0 ? `<div style="background:#fef3c7;border-radius:6px;padding:6px 8px;">${insights.map((i: string) => `<div style="color:#92400e;font-size:11px;">💡 ${i}</div>`).join('')}</div>` : ''}
          </div>
        `)
        .addTo(m);
    };
    m.on('click', ZONES_FILL, handleClick);
    m.on('mouseenter', ZONES_FILL, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', ZONES_FILL, () => { m.getCanvas().style.cursor = ''; });
    return () => { m.off('click', ZONES_FILL, handleClick); };
  }, [zonesGeoJson, mapReady, mapMode, cleanLayers, addChoroplethLayers, fitBoundsToGeoJson]);

  // Apporteurs choropleth layer
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    cleanLayers(m, [APPORTEURS_FILL, APPORTEURS_LINE, APPORTEURS_LABELS], APPORTEURS_SOURCE);
    if (mapMode !== 'apporteurs' || !apporteursGeoJson?.features?.length) return;

    addChoroplethLayers(m, APPORTEURS_SOURCE, APPORTEURS_FILL, APPORTEURS_LINE, APPORTEURS_LABELS, apporteursGeoJson, [
      'match', ['get', 'dominantOrigin'],
      'Assurance', '#3b82f6', 'Agence Immobilière', '#8b5cf6', 'Syndic', '#f97316',
      'Bailleur', '#06b6d4', 'Franchise / Réseau', '#10b981', 'Client direct', '#6b7280',
      '#9ca3af',
    ], 0.65);
    fitBoundsToGeoJson(m, apporteursGeoJson);

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [APPORTEURS_FILL] });
      if (!features?.length) return;
      const p = features[0].properties;
      if (!p) return;
      interface BreakdownItem { type: string; count: number; share: number; color: string; }
      const breakdown: BreakdownItem[] = (() => { try { return JSON.parse(p.breakdown); } catch { return []; } })();
      const depBg = p.top1Share >= 70 ? '#dc2626' : p.top1Share >= 50 ? '#f59e0b' : '#22c55e';
      const breakdownHtml = breakdown.map((b: BreakdownItem) =>
        `<div style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:${b.color};flex-shrink:0;"></span><span>${b.type}</span><b>${b.share}%</b></div>`
      ).join('');
      new mapboxgl.Popup({ closeButton: true, maxWidth: '380px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:system-ui;font-size:12px;line-height:1.6;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${p.nom || ''} ${p.city || ''}</div>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <span style="background:${p.dominantColor};color:white;border-radius:10px;padding:1px 8px;font-size:11px;">${p.dominantOrigin}</span>
              <span style="background:${depBg};color:white;border-radius:10px;padding:1px 8px;font-size:11px;">${p.top1Share}% concentration</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:8px;">
              <div>📁 <b>${p.totalProjects}</b> dossiers</div><div>💰 CA: <b>${Number(p.totalCA||0).toLocaleString('fr-FR')} €</b></div>
            </div>
            ${breakdownHtml}
          </div>
        `)
        .addTo(m);
    };
    m.on('click', APPORTEURS_FILL, handleClick);
    m.on('mouseenter', APPORTEURS_FILL, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', APPORTEURS_FILL, () => { m.getCanvas().style.cursor = ''; });
    return () => { m.off('click', APPORTEURS_FILL, handleClick); };
  }, [apporteursGeoJson, mapReady, mapMode, cleanLayers, addChoroplethLayers, fitBoundsToGeoJson]);

  // Disponibilité layer — tech positions with status colors
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    if (m.getLayer(DISPO_CIRCLES)) m.removeLayer(DISPO_CIRCLES);
    if (m.getSource(DISPO_SOURCE)) m.removeSource(DISPO_SOURCE);

    if (mapMode !== 'disponibilite' || !dispoData?.length) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: dispoData.filter(t => t.lat && t.lng).map(t => ({
        type: 'Feature' as const,
        properties: {
          techId: t.techId,
          name: t.name,
          techColor: t.color,
          status: t.status,
          statusLabel: t.statusLabel,
          currentTask: t.currentTask || '',
          nextTask: t.nextTask || '',
          nextTaskTime: t.nextTaskTime || '',
          freeMinutes: t.freeMinutes,
          remainingCapacityMin: t.remainingCapacityMin,
          totalDayMin: t.totalDayMin,
          occupiedMin: t.occupiedMin,
          travelEstimateMin: t.travelEstimateMin,
          skills: JSON.stringify(t.skills),
          rdvCount: t.rdvCount,
          rdvDone: t.rdvDone,
          rdvRemaining: t.rdvRemaining,
          statusIndex: t.status === 'available' ? 0 : t.status === 'soon' ? 1 : t.status === 'busy' ? 2 : t.status === 'saturated' ? 3 : 4,
        },
        geometry: { type: 'Point' as const, coordinates: [t.lng, t.lat] },
      })),
    };

    m.addSource(DISPO_SOURCE, { type: 'geojson', data: geojson });

    m.addLayer({
      id: DISPO_CIRCLES,
      type: 'circle',
      source: DISPO_SOURCE,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 12, 10, 20, 14, 28],
        'circle-color': [
          'match', ['get', 'status'],
          'available', '#22c55e',
          'soon', '#eab308',
          'busy', '#f97316',
          'saturated', '#dc2626',
          'unavailable', '#9ca3af',
          '#9ca3af',
        ],
        'circle-opacity': 0.85,
        'circle-stroke-color': ['get', 'techColor'],
        'circle-stroke-width': 3,
        'circle-stroke-opacity': 0.9,
      },
    });

    // Fit bounds
    if (!hasFittedBoundsRef.current) {
      const pts = dispoData.filter(t => t.lat && t.lng);
      if (pts.length > 0) {
        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        pts.forEach(p => { minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng); minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); });
        const pad = 0.1;
        const container = m.getContainer();
        const padX = Math.max(56, Math.round((container.clientWidth || 800) * 0.12));
        const padY = Math.max(56, Math.round((container.clientHeight || 600) * 0.12));
        m.fitBounds([[minLng - pad, minLat - pad], [maxLng + pad, maxLat + pad]], {
          padding: { top: padY, bottom: padY + 60, left: padX, right: padX }, maxZoom: 12, duration: 1000,
        });
        hasFittedBoundsRef.current = true;
      }
    }

    // Popup on click
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [DISPO_CIRCLES] });
      if (!features?.length) return;
      const p = features[0].properties;
      if (!p) return;
      const coords = (features[0].geometry as any).coordinates as [number, number];

      const skills: string[] = (() => { try { return JSON.parse(p.skills); } catch { return []; } })();
      const statusBg = DISPO_STATUS_COLORS[p.status] || '#9ca3af';
      const capacityPct = p.totalDayMin > 0 ? Math.round((p.occupiedMin / p.totalDayMin) * 100) : 0;

      // Also update side panel selection
      const tech = dispoData?.find(t => t.techId === p.techId);
      if (tech) setSelectedDispoTech(tech);

      new mapboxgl.Popup({ closeButton: true, maxWidth: '340px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family: system-ui; font-size: 12px; line-height: 1.6;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="width:12px;height:12px;border-radius:50%;background:${p.techColor};border:2px solid ${statusBg};flex-shrink:0;"></span>
              <span style="font-weight:700;font-size:14px;">${p.name}</span>
              <span style="background:${statusBg};color:white;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:600;">${p.statusLabel}</span>
            </div>
            ${p.currentTask ? `<div>🔧 En cours : <b>${p.currentTask}</b></div>` : ''}
            ${p.nextTask ? `<div>⏭️ Prochain : <b>${p.nextTask}</b> ${p.nextTaskTime ? `à ${p.nextTaskTime}` : ''}</div>` : ''}
            <div style="margin:6px 0;padding:6px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;">
              <div>⏱️ Libre : <b>${p.freeMinutes} min</b></div>
              <div>📊 Charge : <b>${capacityPct}%</b></div>
              <div>📋 RDV : <b>${p.rdvDone}/${p.rdvCount}</b></div>
              <div>🚗 Trajet : <b>${p.travelEstimateMin} min</b></div>
              <div>✅ Restant : <b>${p.rdvRemaining} RDV</b></div>
              <div>⏰ Capacité : <b>${p.remainingCapacityMin} min</b></div>
            </div>
            ${skills.length > 0 ? `<div style="color:#4b5563;"><b>Compétences :</b> ${skills.join(', ')}</div>` : ''}
          </div>
        `)
        .addTo(m);
    };

    m.on('click', DISPO_CIRCLES, handleClick);
    m.on('mouseenter', DISPO_CIRCLES, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', DISPO_CIRCLES, () => { m.getCanvas().style.cursor = ''; });

    return () => { m.off('click', DISPO_CIRCLES, handleClick); };
  }, [dispoData, mapReady, mapMode]);

  // Saisonnalité layer — circles sized by volume, colored by variation
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    if (m.getLayer(SEASON_CIRCLES)) m.removeLayer(SEASON_CIRCLES);
    if (m.getSource(SEASON_SOURCE)) m.removeSource(SEASON_SOURCE);

    if (mapMode !== 'saisonnalite' || !seasonData?.length || !currentSeasonMonth) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: seasonData.map(z => {
        const monthData = z.series[currentSeasonMonth];
        const nb = monthData?.nb || 0;
        const ca = monthData?.ca || 0;
        const variation = z.variations[currentSeasonMonth] ?? 0;
        return {
          type: 'Feature' as const,
          properties: {
            postalCode: z.postalCode, city: z.city, nb, ca, variation,
            seasonalityIndex: z.seasonalityIndex, predictabilityIndex: z.predictabilityIndex,
            peakMonth: z.peakMonth, topUnivers: monthData?.topUnivers || '',
            urgences: monthData?.urgences || 0, insights: JSON.stringify(z.insights), totalNb: z.totalNb,
          },
          geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
        };
      }).filter(f => f.properties.nb > 0 || seasonViewMode === 'variation'),
    };

    m.addSource(SEASON_SOURCE, { type: 'geojson', data: geojson });

    m.addLayer({
      id: SEASON_CIRCLES,
      type: 'circle',
      source: SEASON_SOURCE,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          4, ['interpolate', ['linear'], ['get', 'nb'], 0, 4, 5, 10, 20, 18, 50, 26],
          10, ['interpolate', ['linear'], ['get', 'nb'], 0, 8, 5, 16, 20, 28, 50, 40],
          14, ['interpolate', ['linear'], ['get', 'nb'], 0, 12, 5, 22, 20, 36, 50, 52],
        ],
        'circle-color': seasonViewMode === 'variation' ? [
          'interpolate', ['linear'], ['get', 'variation'],
          -80, '#3b82f6', -30, '#93c5fd', 0, '#fbbf24', 30, '#f97316', 80, '#dc2626',
        ] : [
          'interpolate', ['linear'], ['get', 'nb'],
          0, '#fef3c7', 3, '#fbbf24', 10, '#f97316', 25, '#dc2626', 50, '#7f1d1d',
        ],
        'circle-opacity': 0.8,
        'circle-stroke-color': [
          'interpolate', ['linear'], ['get', 'seasonalityIndex'],
          0, '#9ca3af', 50, '#f59e0b', 100, '#dc2626',
        ],
        'circle-stroke-width': ['interpolate', ['linear'], ['get', 'seasonalityIndex'], 0, 1, 50, 2, 100, 3.5],
        'circle-stroke-opacity': 0.9,
      },
    });

    // Fit bounds on first load
    if (!hasFittedBoundsRef.current && seasonData.length > 0) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      seasonData.forEach(p => { minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng); minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); });
      const pad = 0.1;
      const container = m.getContainer();
      const padX = Math.max(56, Math.round((container.clientWidth || 800) * 0.12));
      const padY = Math.max(56, Math.round((container.clientHeight || 600) * 0.12));
      m.fitBounds([[minLng - pad, minLat - pad], [maxLng + pad, maxLat + pad]], {
        padding: { top: padY, bottom: padY + 60, left: padX, right: padX }, maxZoom: 12, duration: 1000,
      });
      hasFittedBoundsRef.current = true;
    }

    // Popup on click
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [SEASON_CIRCLES] });
      if (!features?.length) return;
      const p = features[0].properties;
      if (!p) return;
      const coords = (features[0].geometry as any).coordinates as [number, number];
      const insights: string[] = (() => { try { return JSON.parse(p.insights); } catch { return []; } })();
      const zone = seasonData?.find(z => z.postalCode === p.postalCode);
      
      const MONTH_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      let sparkHtml = '';
      if (zone) {
        const months = Object.keys(zone.series).sort();
        const last12 = months.slice(-12);
        const maxNb = Math.max(...last12.map(m2 => zone.series[m2]?.nb || 0), 1);
        sparkHtml = `<div style="display:flex;align-items:flex-end;gap:2px;height:40px;margin:8px 0;">` +
          last12.map(m2 => {
            const nb = zone.series[m2]?.nb || 0;
            const h = Math.max(2, Math.round((nb / maxNb) * 36));
            const isCurrentM = m2 === currentSeasonMonth;
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;"><div style="width:${isCurrentM ? 10 : 7}px;height:${h}px;background:${isCurrentM ? '#f97316' : '#fbbf24'};border-radius:2px;"></div><span style="font-size:8px;color:#9ca3af;">${MONTH_SHORT[parseInt(m2.slice(5, 7)) - 1]}</span></div>`;
          }).join('') + `</div>`;
      }

      const varColor = p.variation > 20 ? '#dc2626' : p.variation < -20 ? '#3b82f6' : '#6b7280';
      const varLabel = p.variation > 0 ? `+${p.variation}%` : `${p.variation}%`;

      new mapboxgl.Popup({ closeButton: true, maxWidth: '360px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family: system-ui; font-size: 12px; line-height: 1.6;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">${p.postalCode} ${p.city}</div>
            <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">Mois : ${currentSeasonMonth}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:6px;">
              <div>📁 <b>${p.nb}</b> dossiers</div>
              <div>💰 CA: <b>${Number(p.ca).toLocaleString('fr-FR')} €</b></div>
              <div style="color:${varColor}">📈 Variation: <b>${varLabel}</b></div>
              <div>🔧 ${p.topUnivers || 'N/A'}</div>
            </div>
            ${sparkHtml}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:4px;">
              <div>🌡️ Saisonnalité: <b>${p.seasonalityIndex}/100</b></div>
              <div>🎯 Prévisibilité: <b>${p.predictabilityIndex}/100</b></div>
              <div>📍 Pic: <b>${p.peakMonth}</b></div>
              <div>🚨 Urgences: <b>${p.urgences}</b></div>
            </div>
            ${insights.length > 0 ? `<div style="background:#fef3c7;border-radius:6px;padding:6px 8px;margin-top:6px;">${insights.map(i => `<div style="color:#92400e;font-size:11px;">💡 ${i}</div>`).join('')}</div>` : ''}
          </div>
        `)
        .addTo(m);
    };

    m.on('click', SEASON_CIRCLES, handleClick);
    m.on('mouseenter', SEASON_CIRCLES, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', SEASON_CIRCLES, () => { m.getCanvas().style.cursor = ''; });

    return () => { m.off('click', SEASON_CIRCLES, handleClick); };
  }, [seasonData, currentSeasonMonth, seasonViewMode, mapReady, mapMode]);

  // Score Global choropleth layer
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    cleanLayers(m, [SCORE_FILL, SCORE_LINE, SCORE_LABELS], SCORE_SOURCE);
    if (mapMode !== 'score_global' || !scoreGeoJson?.features?.length) return;

    // Inject the active score key into each feature for color interpolation
    const scoreKey = scoreSubView === 'global' ? 'scoreGlobal' : scoreSubView === 'commercial' ? 'scoreCommercial' : scoreSubView === 'economique' ? 'scoreEconomique' : scoreSubView === 'operationnel' ? 'scoreOperationnel' : scoreSubView === 'qualite' ? 'scoreQualite' : 'scoreResilience';
    const enriched: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: scoreGeoJson.features.map(f => ({
        ...f,
        properties: { ...f.properties, score: f.properties?.[scoreKey] ?? 0 },
      })),
    };

    addChoroplethLayers(m, SCORE_SOURCE, SCORE_FILL, SCORE_LINE, SCORE_LABELS, enriched, [
      'interpolate', ['linear'], ['get', 'score'],
      0, '#dc2626', 40, '#f97316', 55, '#fbbf24', 70, '#22c55e', 85, '#3b82f6',
    ]);
    fitBoundsToGeoJson(m, enriched);

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [SCORE_FILL] });
      if (!features?.length) return;
      const p = features[0].properties;
      if (!p) return;
      const scoreBg = p.scoreGlobal >= 85 ? '#3b82f6' : p.scoreGlobal >= 70 ? '#22c55e' : p.scoreGlobal >= 55 ? '#fbbf24' : p.scoreGlobal >= 40 ? '#f97316' : '#dc2626';
      const scoreBar = (label: string, value: number, icon: string) => {
        const bg = value >= 70 ? '#22c55e' : value >= 50 ? '#fbbf24' : '#dc2626';
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><span style="width:14px;text-align:center;">${icon}</span><span style="flex:1;font-size:11px;">${label}</span><div style="width:60px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${value}%;background:${bg};border-radius:3px;"></div></div><span style="font-size:11px;font-weight:600;width:24px;text-align:right;">${value}</span></div>`;
      };
      new mapboxgl.Popup({ closeButton: true, maxWidth: '380px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:system-ui;font-size:12px;line-height:1.6;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-weight:700;font-size:14px;">${p.nom || ''} ${p.city || ''}</span>
              <span style="background:${scoreBg};color:white;border-radius:10px;padding:2px 10px;font-size:12px;font-weight:700;">${p.scoreGlobal}/100</span>
              <span style="font-size:11px;color:#6b7280;">${p.scoreLabel}</span>
            </div>
            <div style="margin-bottom:8px;">
              ${scoreBar('Commercial', p.scoreCommercial, '📊')}
              ${scoreBar('Économique', p.scoreEconomique, '💰')}
              ${scoreBar('Opérationnel', p.scoreOperationnel, '⚙️')}
              ${scoreBar('Qualité', p.scoreQualite, '✅')}
              ${scoreBar('Résilience', p.scoreResilience, '🛡️')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;padding:6px 0;border-top:1px solid #e5e7eb;margin-bottom:6px;">
              <div>📁 <b>${p.nbProjects}</b> dossiers</div><div>👤 <b>${p.nbClients}</b> clients</div>
              <div>💰 CA: <b>${Number(p.ca||0).toLocaleString('fr-FR')} €</b></div>
              <div>📈 Marge: <b style="color:${(p.margin||0) >= 0 ? '#15803d' : '#dc2626'}">${Number(p.margin||0).toLocaleString('fr-FR')} €</b></div>
            </div>
            <div style="font-size:11px;margin-bottom:4px;"><span style="color:#22c55e;">▲</span> Force: <b>${p.mainStrength}</b> (${p.mainStrengthScore}/100)</div>
            <div style="font-size:11px;margin-bottom:6px;"><span style="color:#dc2626;">▼</span> Faiblesse: <b>${p.mainWeakness}</b> (${p.mainWeaknessScore}/100)</div>
            <div style="background:#f0f9ff;border-radius:6px;padding:6px 8px;"><div style="color:#1e40af;font-size:11px;font-weight:600;">💡 ${p.recommendation}</div></div>
          </div>
        `)
        .addTo(m);
    };
    m.on('click', SCORE_FILL, handleClick);
    m.on('mouseenter', SCORE_FILL, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', SCORE_FILL, () => { m.getCanvas().style.cursor = ''; });
    return () => { m.off('click', SCORE_FILL, handleClick); };
  }, [scoreGeoJson, scoreSubView, mapReady, mapMode, cleanLayers, addChoroplethLayers, fitBoundsToGeoJson]);

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
              {heatmapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${densityGeoJson?.features?.length || 0} communes`}
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
                {profitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${profitGeoJson?.features?.length || 0} communes`}
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
                {zonesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${zonesGeoJson?.features?.length || 0} communes`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d1d5db' }} /><span className="text-muted-foreground">Zone blanche</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} /><span className="text-muted-foreground">Faible</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} /><span className="text-muted-foreground">Correcte</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1e40af' }} /><span className="text-muted-foreground">Forte</span></div>
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l"><span className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#dc2626', backgroundColor: 'transparent' }} /><span className="text-muted-foreground">Bordure = opportunité</span></div>
            </div>
            {zonesGeoJson && zonesGeoJson.features.length > 0 && (() => {
              const top = zonesGeoJson.features[0].properties;
              return top ? (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>🏆 Top : <b>{top.code_insee} {top.nom}</b> (score {top.opportunityScore ?? top.activityIndex}/100)</span>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Barre info apporteurs */}
        {mapMode === 'apporteurs' && (
          <div className="flex-none p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Network className="h-4 w-4" />
              <span>Origine des clients & apporteurs — analyse par code postal</span>
              <span className="ml-auto">
                {apporteursLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${apporteursGeoJson?.features?.length || 0} communes`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              {[
                { label: 'Assurance', color: '#3b82f6' },
                { label: 'Agence Immo', color: '#8b5cf6' },
                { label: 'Syndic', color: '#f97316' },
                { label: 'Bailleur', color: '#06b6d4' },
                { label: 'Client direct', color: '#6b7280' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
                <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#dc2626', backgroundColor: 'transparent' }} />
                <span className="text-muted-foreground">Bordure = dépendance</span>
              </div>
            </div>
          </div>
        )}

        {/* Barre info + panneau latéral disponibilité */}
        {mapMode === 'disponibilite' && (
          <div className="flex-none p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Radio className="h-4 w-4" />
              <span>Disponibilité techniciens — {format(selectedDate, 'd MMMM yyyy', { locale: fr })}</span>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setSelectedDate(d => subDays(d, 1))}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedDate(new Date())}>Aujourd'hui</Button>
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setSelectedDate(d => addDays(d, 1))}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <span className="ml-auto">
                {dispoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${dispoData?.length || 0} techniciens`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              {[
                { label: 'Disponible', color: '#22c55e' },
                { label: 'Bientôt', color: '#eab308' },
                { label: 'Occupé', color: '#f97316' },
                { label: 'Saturé', color: '#dc2626' },
                { label: 'Indisponible', color: '#9ca3af' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barre info + timeline saisonnalité */}
        {mapMode === 'saisonnalite' && (
          <div className="flex-none p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarRange className="h-4 w-4" />
              <span>Saisonnalité géographique</span>
              <div className="flex items-center gap-1 ml-2">
                <Button variant={seasonViewMode === 'volume' ? 'default' : 'ghost'} size="sm" className="h-6 text-xs gap-1" onClick={() => setSeasonViewMode('volume')}>
                  Volume
                </Button>
                <Button variant={seasonViewMode === 'variation' ? 'default' : 'ghost'} size="sm" className="h-6 text-xs gap-1" onClick={() => setSeasonViewMode('variation')}>
                  <TrendingUp className="h-3 w-3" />Variation
                </Button>
              </div>
              <span className="ml-auto">
                {seasonLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${seasonData?.length || 0} zones · ${seasonMonths.length} mois`}
              </span>
            </div>
            {seasonMonths.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSeasonMonth(0)} disabled={seasonMonth === 0}>
                    <SkipBack className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSeasonMonth(m2 => Math.max(0, m2 - 1))} disabled={seasonMonth === 0}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant={seasonPlaying ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => { if (seasonMonth >= seasonMonths.length - 1) setSeasonMonth(0); setSeasonPlaying(p => !p); }}>
                    {seasonPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSeasonMonth(m2 => Math.min(seasonMonths.length - 1, m2 + 1))} disabled={seasonMonth >= seasonMonths.length - 1}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSeasonMonth(seasonMonths.length - 1)} disabled={seasonMonth >= seasonMonths.length - 1}>
                    <SkipForward className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1">
                  <Slider
                    value={[seasonMonth]}
                    onValueChange={([v]) => { setSeasonPlaying(false); setSeasonMonth(v); }}
                    min={0}
                    max={Math.max(0, seasonMonths.length - 1)}
                    step={1}
                  />
                </div>
                <span className="text-sm font-semibold min-w-[90px] text-right">
                  {currentSeasonMonth ? format(parse(currentSeasonMonth, 'yyyy-MM', new Date()), 'MMM yyyy', { locale: fr }) : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs flex-wrap">
              {seasonViewMode === 'variation' ? (
                <>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} /><span className="text-muted-foreground">Forte baisse</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} /><span className="text-muted-foreground">Stable</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }} /><span className="text-muted-foreground">Forte hausse</span></div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fef3c7' }} /><span className="text-muted-foreground">Faible</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} /><span className="text-muted-foreground">Moyen</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7f1d1d' }} /><span className="text-muted-foreground">Élevé</span></div>
                </>
              )}
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
                <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#dc2626', backgroundColor: 'transparent' }} />
                <span className="text-muted-foreground">Bordure = saisonnalité forte</span>
              </div>
            </div>
          </div>
        )}

        {/* Barre info + panneau latéral Score Global */}
        {mapMode === 'score_global' && (
          <div className="flex-none p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span>Score Global — synthèse multi-critères par zone</span>
              <div className="flex items-center gap-1 ml-2">
                {([['global', 'Global'], ['commercial', 'Commercial'], ['economique', 'Économique'], ['operationnel', 'Opérationnel'], ['qualite', 'Qualité'], ['resilience', 'Résilience']] as const).map(([key, label]) => (
                  <Button key={key} variant={scoreSubView === key ? 'default' : 'ghost'} size="sm" className="h-6 text-xs" onClick={() => setScoreSubView(key)}>
                    {label}
                  </Button>
                ))}
              </div>
              <span className="ml-auto">
                {scoreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${scoreGeoJson?.features?.length || 0} communes`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }} /><span className="text-muted-foreground">Critique (&lt;40)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} /><span className="text-muted-foreground">Fragile (40-54)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} /><span className="text-muted-foreground">Moyenne (55-69)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} /><span className="text-muted-foreground">Saine (70-84)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} /><span className="text-muted-foreground">Premium (85+)</span></div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 flex" style={{ minHeight: '400px' }}>
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

            {((isLoading && mapMode === 'pins') || (heatmapLoading && mapMode === 'heatmap') || (profitLoading && mapMode === 'profitability') || (zonesLoading && mapMode === 'zones') || (apporteursLoading && mapMode === 'apporteurs') || (dispoLoading && mapMode === 'disponibilite') || (seasonLoading && mapMode === 'saisonnalite') || (scoreLoading && mapMode === 'score_global')) && mapboxToken && !mapInitError && (
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

          {/* Panneau latéral disponibilité */}
          {mapMode === 'disponibilite' && dispoData && dispoData.length > 0 && (
            <div className="w-72 border-l border-border bg-background flex flex-col">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Techniciens ({dispoData.length})
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {[...dispoData]
                    .sort((a, b) => {
                      const order = { available: 0, soon: 1, busy: 2, saturated: 3, unavailable: 4 };
                      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
                    })
                    .map(tech => {
                      const statusColor = DISPO_STATUS_COLORS[tech.status] || '#9ca3af';
                      const capacityPct = tech.totalDayMin > 0 ? Math.round((tech.occupiedMin / tech.totalDayMin) * 100) : 0;
                      const isSelected = selectedDispoTech?.techId === tech.techId;
                      return (
                        <button
                          key={tech.techId}
                          onClick={() => {
                            setSelectedDispoTech(isSelected ? null : tech);
                            if (map.current && tech.lat && tech.lng) {
                              map.current.flyTo({ center: [tech.lng, tech.lat], zoom: 12, duration: 800 });
                            }
                          }}
                          className={cn(
                            'w-full text-left p-2.5 rounded-lg transition-colors text-xs',
                            isSelected ? 'bg-accent border border-border' : 'hover:bg-muted'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tech.color, border: `2px solid ${statusColor}` }} />
                            <span className="font-medium truncate">{tech.name}</span>
                            <span className="ml-auto px-1.5 py-0.5 rounded-full text-white text-[10px] font-semibold" style={{ backgroundColor: statusColor }}>
                              {tech.statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{tech.freeMinutes}m libre</span>
                            <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{tech.rdvDone}/{tech.rdvCount}</span>
                            <span>{capacityPct}%</span>
                          </div>
                          {tech.nextTask && (
                            <div className="mt-1 text-muted-foreground truncate">
                              ⏭️ {tech.nextTask} {tech.nextTaskTime ? `à ${tech.nextTaskTime}` : ''}
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Panneau latéral Score Global — Top insights */}
          {mapMode === 'score_global' && scoreGeoJson && scoreGeoJson.features.length > 0 && scoreMeta && (
            <div className="w-80 border-l border-border bg-background flex flex-col">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Top Insights
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {/* Top zones premium */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Star className="h-3 w-3" /> Top zones performantes
                    </h4>
                    {scoreGeoJson.features.slice(0, 5).map(f => {
                      const p = f.properties as any;
                      const coords = f.geometry?.type === 'Polygon' ? f.geometry.coordinates[0][0] : f.geometry?.type === 'MultiPolygon' ? f.geometry.coordinates[0][0][0] : [0, 0];
                      return (
                        <button
                          key={p.code_insee}
                          onClick={() => { if (map.current) map.current.flyTo({ center: [coords[0], coords[1]], zoom: 12, duration: 800 }); }}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs flex items-center gap-2"
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: (p.scoreGlobal ?? 0) >= 85 ? '#3b82f6' : (p.scoreGlobal ?? 0) >= 70 ? '#22c55e' : '#fbbf24' }} />
                          <span className="font-medium">{p.code_insee} {p.nom}</span>
                          <span className="ml-auto font-semibold">{p.scoreGlobal ?? 0}/100</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Zones à risque */}
                  {scoreMeta.insights.topRisk.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" /> Zones à risque
                      </h4>
                      {scoreMeta.insights.topRisk.map(z => (
                        <button
                          key={z.pc}
                          onClick={() => {
                            const zone = scoreGeoJson.features.find(f => (f.properties as any)?.code_insee === z.pc);
                            const coords = zone?.geometry?.type === 'Polygon' ? zone.geometry.coordinates[0][0] : zone?.geometry?.type === 'MultiPolygon' ? zone.geometry.coordinates[0][0][0] : null;
                            if (coords && map.current) map.current.flyTo({ center: [coords[0], coords[1]], zoom: 12, duration: 800 });
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs flex items-center gap-2"
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#dc2626' }} />
                          <span className="font-medium">{z.pc} {z.city}</span>
                          <span className="ml-auto font-semibold text-destructive">{z.score}/100</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Zones à développer */}
                  {scoreMeta.insights.topDevelop.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Target className="h-3 w-3" /> Zones à développer
                      </h4>
                      {scoreMeta.insights.topDevelop.map(z => (
                        <button
                          key={z.pc}
                          onClick={() => {
                            const zone = scoreGeoJson.features.find(f => (f.properties as any)?.code_insee === z.pc);
                            const coords = zone?.geometry?.type === 'Polygon' ? zone.geometry.coordinates[0][0] : zone?.geometry?.type === 'MultiPolygon' ? zone.geometry.coordinates[0][0][0] : null;
                            if (coords && map.current) map.current.flyTo({ center: [coords[0], coords[1]], zoom: 12, duration: 800 });
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs flex items-center gap-2"
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#f97316' }} />
                          <span className="font-medium">{z.pc} {z.city}</span>
                          <span className="ml-auto font-semibold">{z.score}/100</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Plus rentables */}
                  {scoreMeta.insights.topRentable.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <BarChart3 className="h-3 w-3" /> Plus rentables
                      </h4>
                      {scoreMeta.insights.topRentable.map(z => (
                        <button
                          key={z.pc}
                          onClick={() => {
                            const zone = scoreGeoJson.features.find(f => (f.properties as any)?.code_insee === z.pc);
                            const coords = zone?.geometry?.type === 'Polygon' ? zone.geometry.coordinates[0][0] : zone?.geometry?.type === 'MultiPolygon' ? zone.geometry.coordinates[0][0][0] : null;
                            if (coords && map.current) map.current.flyTo({ center: [coords[0], coords[1]], zoom: 12, duration: 800 });
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs flex items-center gap-2"
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e' }} />
                          <span className="font-medium">{z.pc} {z.city}</span>
                          <span className="ml-auto font-semibold text-emerald-600">{(z.margin || 0).toLocaleString('fr-FR')} €</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DraggableFolderContentContainer>
    </div>
  );
}
