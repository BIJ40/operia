/**
 * DashboardMapWidget - Carte RDV intégrée au dashboard (Hero Section)
 * 
 * ARCHITECTURE CORRIGÉE:
 * - Le container map est TOUJOURS rendu (jamais démonté)
 * - Le loading overlay se superpose au container au lieu de le remplacer
 * - Cela évite la race condition mount/unmount qui tuait la map
 * - La map s'initialise dès que le token est disponible
 * - Les markers se mettent à jour quand les rdvs arrivent
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Maximize2, Users, Calendar, AlertCircle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useRdvMap, calculateBounds, MapRdv } from '@/hooks/useRdvMap';
import { createPinMarkerElement } from '@/components/map/PinMarker';
import { TourSummaryBar } from '@/components/map/TourSummaryBar';
import { useRouteDirections } from '@/hooks/useRouteDirections';
import { HumanTitle } from './HumanTitle';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Hook pour récupérer le token Mapbox depuis l'edge function
 */
function useMapboxToken() {
  return useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      if (error) throw new Error(error.message);
      if (!data?.token) throw new Error('Token non disponible');
      return data.token as string;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

interface DashboardMapWidgetProps {
  className?: string;
  agencySlug?: string;
}

const PRIMARY_MAPBOX_STYLE = 'mapbox://styles/bij40/cmjbi8grj000t01s3ajxo3amm';
const FALLBACK_MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

type MapTimeFilter = 'jour' | 'actuel';

function enableStyleFallback(map: mapboxgl.Map) {
  let fallbackApplied = false;

  const applyFallback = () => {
    if (fallbackApplied) return;
    fallbackApplied = true;
    console.warn('[MAP] Style principal indisponible, fallback activé');
    map.setStyle(FALLBACK_MAPBOX_STYLE);
    map.once('style.load', () => {
      console.log('[MAP] Fallback style loaded, forcing resize');
      map.resize();
    });
  };

  map.on('error', (event: any) => {
    const message = String(event?.error?.message ?? '').toLowerCase();
    const status = event?.error?.status ?? event?.error?.statusCode;
    const isStyleError =
      message.includes('style') ||
      message.includes('sprite') ||
      message.includes('source') ||
      status === 401 ||
      status === 403 ||
      status === 404;

    if (isStyleError) {
      applyFallback();
    }
  });

  map.on('styledata', () => {
    if (!map.isStyleLoaded()) return;

    const style = map.getStyle();
    const sourceCount = Object.keys(style?.sources ?? {}).length;
    const hasRenderableLayer = (style?.layers ?? []).some(layer => layer.type !== 'background');

    if (sourceCount === 0 || !hasRenderableLayer) {
      applyFallback();
    }
  });
}

/**
 * Attach a ResizeObserver to auto-resize the map when container dimensions change
 */
function attachResizeObserver(container: HTMLElement, map: mapboxgl.Map): ResizeObserver {
  const ro = new ResizeObserver(() => {
    if (map && !((map as any)._removed)) {
      map.resize();
    }
  });
  ro.observe(container);
  return ro;
}

export function DashboardMapWidget({ className, agencySlug }: DashboardMapWidgetProps) {
  const today = new Date();
  const { rdvs, isLoading, technicians } = useRdvMap({ date: today, agencySlug });
  const { data: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
  const [selectedRdv, setSelectedRdv] = useState<MapRdv | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeFilter, setTimeFilter] = useState<MapTimeFilter>('jour');

  // Refs for the compact map (always mounted)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Filter RDVs based on timeFilter
  const filteredRdvs = useMemo(() => {
    if (timeFilter === 'jour') return rdvs;
    const now = new Date();
    return rdvs.filter(rdv => {
      const start = new Date(rdv.startAt);
      const end = rdv.endAt 
        ? new Date(rdv.endAt) 
        : new Date(start.getTime() + rdv.durationMin * 60 * 1000);
      return now >= start && now <= end;
    });
  }, [rdvs, timeFilter]);

  // ====================================================================
  // MAP INIT — runs once when token becomes available
  // The container is ALWAYS in the DOM so dimensions are always valid
  // ====================================================================
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !mapboxToken || mapRef.current) return;

    let ro: ResizeObserver | null = null;

    // Delay init to let Framer Motion animation finish
    const initTimer = setTimeout(() => {
      console.log('[MAP] Init. Container:', container.offsetWidth, 'x', container.offsetHeight);

      mapboxgl.accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container,
        style: PRIMARY_MAPBOX_STYLE,
        center: [2.3522, 48.8566],
        zoom: 10,
        attributionControl: true,
      });

      map.on('load', () => {
        console.log('[MAP] Style loaded');
        map.resize();
      });

      enableStyleFallback(map);
      ro = attachResizeObserver(container, map);

      mapRef.current = map;
      setMapReady(true);
    }, 150);

    return () => {
      clearTimeout(initTimer);
      console.log('[MAP] Cleanup');
      setMapReady(false);
      ro?.disconnect();
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapboxToken]);

  // ====================================================================
  // MARKERS — re-run when rdvs change OR map becomes ready
  // ====================================================================
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Filter valid coordinates
    const validRdvs = filteredRdvs.filter(rdv => 
      typeof rdv.lat === 'number' && typeof rdv.lng === 'number' && 
      !isNaN(rdv.lat) && !isNaN(rdv.lng) && rdv.lat !== 0 && rdv.lng !== 0
    );

    console.log('[MAP] Adding', validRdvs.length, 'markers (of', filteredRdvs.length, 'total)');

    validRdvs.forEach(rdv => {
      const isSelected = selectedRdv?.rdvId === rdv.rdvId;
      const el = createPinMarkerElement(rdv.users, 32, isSelected, () => {
        setSelectedRdv(prev => prev?.rdvId === rdv.rdvId ? null : rdv);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([rdv.lng, rdv.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Fit bounds
    const bounds = calculateBounds(validRdvs);
    if (bounds && validRdvs.length > 0) {
      const doFit = () => {
        map.fitBounds(bounds as [[number, number], [number, number]], {
          padding: 40,
          maxZoom: 14,
          duration: 500,
        });
      };
      if (map.isStyleLoaded()) {
        doFit();
      } else {
        map.once('load', doFit);
      }
    }
  }, [filteredRdvs, selectedRdv, mapReady]);

  // ====================================================================
  // RESIZE on visibility change (e.g. tab switch)
  // ====================================================================
  useEffect(() => {
    if (mapRef.current && mapReady) {
      // Small delay to let layout settle
      const timer = setTimeout(() => mapRef.current?.resize(), 100);
      return () => clearTimeout(timer);
    }
  }, [mapReady]);

  // Error state
  if (tokenError && !tokenLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative rounded-warm overflow-hidden border border-border/50 h-full min-h-[240px]',
          'bg-muted/30 flex items-center justify-center',
          className
        )}
      >
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Carte non disponible</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'relative rounded-warm overflow-hidden border border-border/50 h-full min-h-[240px]',
        'shadow-warm',
        className
      )}
    >
      {/* MAP CONTAINER — ALWAYS MOUNTED, never conditional */}
      <div className="absolute inset-0">
        <div 
          ref={mapContainerRef} 
          className="w-full h-full"
        />
      </div>

      {/* Loading overlay — superposed, doesn't unmount the map */}
      {(isLoading || tokenLoading) && (
        <div className="absolute inset-0 z-[5]">
          <Skeleton className="w-full h-full rounded-warm" />
        </div>
      )}

      {/* Edge gradients — bottom + sides */}
      <div className="absolute bottom-0 left-0 right-0 h-16 z-[2] pointer-events-none bg-gradient-to-t from-white/90 to-white/0 dark:from-background/90 dark:to-background/0" />
      <div className="absolute top-0 bottom-0 left-0 w-10 z-[2] pointer-events-none bg-gradient-to-r from-white/70 to-white/0 dark:from-background/70 dark:to-background/0" />
      <div className="absolute top-0 bottom-0 right-0 w-10 z-[2] pointer-events-none bg-gradient-to-l from-white/70 to-white/0 dark:from-background/70 dark:to-background/0" />

      {/* Header */}
      {!isLoading && !tokenLoading && (
        <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 bg-gradient-to-b from-white/90 to-white/0 dark:from-background/90 dark:to-background/0">
          <div className="flex items-center justify-between">
            <HumanTitle
              titleKey="map"
              icon={MapPin}
              iconColor="text-warm-teal"
              size="md"
            />
            
            <div className="flex items-center gap-2">
              {/* Toggle Jour / Actuel */}
              <div className="flex items-center rounded-full bg-white/80 dark:bg-background/80 border border-border/50 shadow-sm p-0.5">
                <button
                  onClick={() => setTimeFilter('jour')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                    timeFilter === 'jour'
                      ? "bg-warm-blue text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  Jour
                </button>
                <button
                  onClick={() => setTimeFilter('actuel')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                    timeFilter === 'actuel'
                      ? "bg-warm-teal text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  Actuel
                </button>
              </div>

              {/* Compteur de RDV */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-background/80 border border-border/50 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-warm-blue" />
                <span className="text-sm font-medium">
                  {filteredRdvs.length} RDV
                </span>
              </div>

              {/* Compteur techniciens */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-background/80 border border-border/50 shadow-sm">
                <Users className="h-3.5 w-3.5 text-warm-purple" />
                <span className="text-sm font-medium">
                  {technicians.length} techs
                </span>
              </div>

              {/* Bouton agrandir */}
              <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 bg-white/80 dark:bg-background/80 border-border/50 hover:bg-white dark:hover:bg-background"
                  >
                    <Maximize2 className="h-4 w-4" />
                    <span className="ml-1.5 hidden sm:inline">Agrandir</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl h-[80vh] p-0">
                  <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-warm-teal" />
                      Carte des RDV du jour
                    </DialogTitle>
                  </DialogHeader>
                  <div className="relative flex-1 w-full h-full min-h-[500px]">
                    <ExpandedMapContent
                      rdvs={filteredRdvs}
                      selectedRdv={selectedRdv}
                      onSelectRdv={setSelectedRdv}
                      mapboxToken={mapboxToken || ''}
                      isOpen={isExpanded}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      )}

      {/* Info RDV sélectionné */}
      {selectedRdv && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-3 right-3 z-10"
        >
          <div className="p-3 rounded-lg bg-white/95 dark:bg-background/95 border border-border shadow-lg backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{selectedRdv.clientName}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedRdv.address}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-warm-blue">
                    {new Date(selectedRdv.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {selectedRdv.durationMin} min
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                    {selectedRdv.univers}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {selectedRdv.users.slice(0, 3).map(user => (
                    <div
                      key={user.id}
                      className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: user.color }}
                      title={user.name}
                    >
                      {user.name.charAt(0)}
                    </div>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedRdv(null); }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Message si pas de RDV */}
      {filteredRdvs.length === 0 && !isLoading && !tokenLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-[6]">
          <div className="text-center">
            {timeFilter === 'actuel' ? (
              <>
                <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun RDV en cours</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {rdvs.length} RDV planifié{rdvs.length > 1 ? 's' : ''} aujourd'hui
                </p>
              </>
            ) : (
              <>
                <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Pas de RDV aujourd'hui</p>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Expanded map in dialog — separate instance with tech filter + tour mode
 */
function ExpandedMapContent({
  rdvs,
  selectedRdv,
  onSelectRdv,
  mapboxToken,
  isOpen,
  technicians,
}: {
  rdvs: MapRdv[];
  selectedRdv: MapRdv | null;
  onSelectRdv: (rdv: MapRdv | null) => void;
  mapboxToken: string;
  isOpen: boolean;
  technicians: { id: number; name: string; color: string }[];
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);

  // Filter rdvs by selected techs
  const filteredRdvs = useMemo(() => {
    if (selectedTechIds.length === 0) return rdvs;
    return rdvs.filter(r => r.users.some(u => selectedTechIds.includes(u.id)));
  }, [rdvs, selectedTechIds]);

  // Tour mode
  const isTourMode = selectedTechIds.length === 1;
  const tourTech = isTourMode ? technicians.find(t => t.id === selectedTechIds[0]) : null;

  const sortedRdvs = useMemo(() => {
    if (!isTourMode) return filteredRdvs;
    return [...filteredRdvs].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [filteredRdvs, isTourMode]);

  // Route directions
  const routeCoords = useMemo<[number, number][]>(() => {
    if (!isTourMode || sortedRdvs.length < 2) return [];
    return sortedRdvs.map(r => [r.lng, r.lat]);
  }, [isTourMode, sortedRdvs]);

  const { geometry: routeGeometry, distanceKm, durationMin, isLoading: routeLoading } =
    useRouteDirections(routeCoords, mapboxToken, isTourMode && routeCoords.length >= 2);

  useEffect(() => {
    if (!isOpen) return;
    const container = mapContainerRef.current;
    if (!container || !mapboxToken) return;

    let ro: ResizeObserver | null = null;

    const timer = setTimeout(() => {
      mapboxgl.accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container,
        style: PRIMARY_MAPBOX_STYLE,
        center: [2.3522, 48.8566],
        zoom: 10,
        attributionControl: true,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('load', () => map.resize());
      enableStyleFallback(map);
      ro = attachResizeObserver(container, map);

      mapRef.current = map;
      setMapReady(true);
    }, 200);

    return () => {
      clearTimeout(timer);
      setMapReady(false);
      ro?.disconnect();
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, mapboxToken]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    sortedRdvs.forEach((rdv, index) => {
      const isSelected = selectedRdv?.rdvId === rdv.rdvId;
      const orderNumber = isTourMode ? index + 1 : undefined;

      const el = createPinMarkerElement(rdv.users, 40, isSelected, () => {
        onSelectRdv(isSelected ? null : rdv);
      }, orderNumber);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([rdv.lng, rdv.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    const bounds = calculateBounds(sortedRdvs);
    if (bounds && sortedRdvs.length > 0) {
      const doFit = () => {
        map.fitBounds(bounds as [[number, number], [number, number]], {
          padding: 60,
          maxZoom: 14,
          duration: 500,
        });
      };
      if (map.isStyleLoaded()) doFit();
      else map.once('load', doFit);
    }
  }, [sortedRdvs, selectedRdv, onSelectRdv, mapReady, isTourMode]);

  // Draw/remove route layer
  const TOUR_SRC = 'tour-route-src';
  const TOUR_LYR = 'tour-route-lyr';

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (map.getLayer(TOUR_LYR)) map.removeLayer(TOUR_LYR);
    if (map.getSource(TOUR_SRC)) map.removeSource(TOUR_SRC);

    if (!isTourMode || !routeGeometry) return;

    map.addSource(TOUR_SRC, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: routeGeometry },
    });

    map.addLayer({
      id: TOUR_LYR,
      type: 'line',
      source: TOUR_SRC,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': tourTech?.color || '#6366f1',
        'line-width': 4,
        'line-dasharray': [2, 3],
        'line-opacity': 0.75,
      },
    });
  }, [routeGeometry, isTourMode, mapReady, tourTech?.color]);

  const toggleTech = useCallback((id: number) => {
    setSelectedTechIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Tech filter chips — top left */}
      {technicians.length > 0 && (
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[60%]">
          {technicians.map(tech => {
            const active = selectedTechIds.includes(tech.id);
            return (
              <button
                key={tech.id}
                onClick={() => toggleTech(tech.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-sm border",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background/90 text-foreground border-border/50 hover:bg-background backdrop-blur-sm"
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tech.color }}
                />
                <span className="truncate max-w-[100px]">{tech.name}</span>
              </button>
            );
          })}
          {selectedTechIds.length > 0 && (
            <button
              onClick={() => setSelectedTechIds([])}
              className="px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground bg-background/90 border border-border/50 backdrop-blur-sm shadow-sm transition-all"
            >
              ✕ Tous
            </button>
          )}
        </div>
      )}

      {/* Tour summary bar */}
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
  );
}

export default DashboardMapWidget;
