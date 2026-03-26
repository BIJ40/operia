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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Loader2, MapPin, AlertCircle, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useRdvMap, calculateBounds, MapRdv } from '@/hooks/useRdvMap';
import { useQueries } from '@tanstack/react-query';
import { createPinMarkerElement } from '@/components/map/PinMarker';
import { RdvMiniPreview } from '@/components/map/RdvMiniPreview';
import { TourSummaryBar } from '@/components/map/TourSummaryBar';
import { useRouteDirections } from '@/hooks/useRouteDirections';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';

const MAPBOX_STYLE = 'mapbox://styles/bij40/cmjbi8grj000t01s3ajxo3amm';
const DEFAULT_CENTER: [number, number] = [1.4442, 43.6047];
const DEFAULT_ZOOM = 6;
const TOUR_ROUTE_SOURCE = 'tour-route-source-pilotage';
const TOUR_ROUTE_LAYER = 'tour-route-layer-pilotage';

type ViewMode = 'day' | 'week';

export default function MapsTabContent() {
  const { agence } = useProfile();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
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

  // Init map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;
    if (!mapboxgl.supported()) { setMapInitError('WebGL non supporté.'); return; }
    setMapInitError(null);
    setMapReady(false);

    try {
      mapboxgl.accessToken = mapboxToken;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      const safeResize = () => { try { map.current?.resize(); } catch {} };
      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => safeResize());
        ro.observe(mapContainer.current);
      }

      requestAnimationFrame(safeResize);
      setTimeout(safeResize, 50);
      setTimeout(safeResize, 250);

      map.current.on('load', () => { setMapReady(true); requestAnimationFrame(safeResize); });
      map.current.on('error', (e) => {
        const msg = (e as any)?.error?.message || 'Erreur Mapbox';
        setMapInitError(String(msg));
      });

      return () => { ro?.disconnect(); setMapReady(false); map.current?.remove(); map.current = null; };
    } catch (err) {
      setMapInitError(err instanceof Error ? err.message : 'Erreur init carte');
      map.current = null;
    }
  }, [mapboxToken]);

  const hasFittedBoundsRef = useRef(false);
  const lastRdvsLengthRef = useRef(0);

  // Update markers
  useEffect(() => {
    if (!map.current || !mapReady) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

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
  }, [sortedRdvs, selectedRdv, mapReady, isTourMode]);

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

  useEffect(() => { hasFittedBoundsRef.current = false; }, [selectedDate, selectedTechIds]);

  const goToPreviousDay = () => setSelectedDate(d => subDays(d, 1));
  const goToNextDay = () => setSelectedDate(d => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

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

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 14rem)' }}>
      {/* Barre de filtres */}
      <div className="flex-none p-4 border rounded-t-xl bg-card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goToPreviousDay}><ChevronLeft className="h-4 w-4" /></Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus locale={fr} />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={goToNextDay}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>Aujourd'hui</Button>
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

      {/* Carte */}
      <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
        <div className="relative h-full w-full overflow-hidden rounded-b-xl border border-t-0 bg-background shadow-sm">
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

          {isLoading && mapboxToken && !mapInitError && (
            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Chargement des RDV...</span>
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
    </div>
  );
}
