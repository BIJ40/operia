/**
 * Planning V2 — Vue Carte
 * Utilise l'edge function get-rdv-map (géocodage serveur) pour les coordonnées GPS
 * + les données technicians du planning V2 pour les couleurs
 * Mode tournée: quand 1 seul tech filtré → numéros + trajet routier réel
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Loader2, AlertCircle, Filter } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { createPinMarkerElement } from "@/components/map/PinMarker";
import { RdvMiniPreview } from "@/components/map/RdvMiniPreview";
import { TourSummaryBar } from "@/components/map/TourSummaryBar";
import { useRdvMap, calculateBounds, type MapRdv } from "@/hooks/useRdvMap";
import { useRouteDirections } from "@/hooks/useRouteDirections";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import type { PlanningTechnician } from "../../types";

const MAPBOX_STYLE = "mapbox://styles/bij40/cmjbi8grj000t01s3ajxo3amm";
const DEFAULT_CENTER: [number, number] = [1.4442, 43.6047];
const DEFAULT_ZOOM = 6;
const TOUR_ROUTE_SOURCE = "tour-route-source";
const TOUR_ROUTE_LAYER = "tour-route-layer";

interface MapPlanningViewProps {
  technicians: PlanningTechnician[];
  selectedDate: Date;
}

export function MapPlanningView({ technicians, selectedDate }: MapPlanningViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const { currentAgency } = useAgency();
  const agencySlug = currentAgency?.slug;

  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<MapRdv | null>(null);
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [techFilterOpen, setTechFilterOpen] = useState(false);

  const { rdvs: allRdvs, isLoading: rdvsLoading, technicians: rdvTechnicians } = useRdvMap({
    date: selectedDate,
    techIds: selectedTechIds.length > 0 ? selectedTechIds : undefined,
    agencySlug,
  });

  // Merge tech colors from planning V2 data
  const techColorMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of technicians) m.set(t.id, t.color);
    return m;
  }, [technicians]);

  const rdvs = useMemo(() => {
    return allRdvs.map((rdv) => ({
      ...rdv,
      users: rdv.users.map((u) => ({ ...u, color: techColorMap.get(u.id) || u.color })),
    }));
  }, [allRdvs, techColorMap]);

  const filterTechs = useMemo(() => {
    if (technicians.length > 0) return technicians.map((t) => ({ id: t.id, name: t.name, color: t.color }));
    return rdvTechnicians;
  }, [technicians, rdvTechnicians]);

  // Tour mode
  const isTourMode = selectedTechIds.length === 1;
  const tourTech = isTourMode ? filterTechs.find(t => t.id === selectedTechIds[0]) : null;

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

  const hasFittedRef = useRef(false);
  const lastCountRef = useRef(0);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        if (envToken) { setMapboxToken(envToken); return; }
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        if (error || !data?.token) { setTokenError("Token Mapbox non disponible"); return; }
        setMapboxToken(data.token);
      } catch { setTokenError("Impossible de récupérer le token Mapbox"); }
    };
    fetchToken();
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;
    if (!mapboxgl.supported()) { setMapInitError("WebGL non supporté"); return; }

    try {
      mapboxgl.accessToken = mapboxToken;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      const safeResize = () => { try { map.current?.resize(); } catch {} };
      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && mapContainer.current) {
        ro = new ResizeObserver(() => safeResize());
        ro.observe(mapContainer.current);
      }

      requestAnimationFrame(safeResize);
      setTimeout(safeResize, 50);
      setTimeout(safeResize, 250);

      map.current.on("load", () => { setMapReady(true); requestAnimationFrame(safeResize); });
      map.current.on("error", (e) => {
        setMapInitError(String((e as any)?.error?.message || "Erreur Mapbox"));
      });

      return () => { ro?.disconnect(); setMapReady(false); map.current?.remove(); map.current = null; };
    } catch (err) {
      setMapInitError(err instanceof Error ? err.message : "Erreur initialisation carte");
      map.current = null;
    }
  }, [mapboxToken]);

  const currentDateKey = format(selectedDate, "yyyy-MM-dd");
  const lastDateKeyRef = useRef(currentDateKey);

  // Update markers
  useEffect(() => {
    if (!map.current || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    sortedRdvs.forEach((rdv, index) => {
      const isSelected = selectedRdv?.rdvId === rdv.rdvId;
      const orderNumber = isTourMode ? index + 1 : undefined;

      const el = createPinMarkerElement(rdv.users, 40, isSelected, () => {
        setSelectedRdv((prev) => (prev?.rdvId === rdv.rdvId ? null : rdv));
      }, orderNumber);

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([rdv.lng, rdv.lat])
        .addTo(map.current!);
      markersRef.current.push(marker);
    });

    const dateChanged = currentDateKey !== lastDateKeyRef.current;
    const countChanged = sortedRdvs.length !== lastCountRef.current;
    lastDateKeyRef.current = currentDateKey;
    lastCountRef.current = sortedRdvs.length;

    if ((dateChanged || countChanged || !hasFittedRef.current) && sortedRdvs.length > 0) {
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
        hasFittedRef.current = true;
      }
    }
  }, [sortedRdvs, selectedRdv, mapReady, currentDateKey, isTourMode]);

  // Draw/remove route layer
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    if (m.getLayer(TOUR_ROUTE_LAYER)) m.removeLayer(TOUR_ROUTE_LAYER);
    if (m.getSource(TOUR_ROUTE_SOURCE)) m.removeSource(TOUR_ROUTE_SOURCE);

    if (!isTourMode || !routeGeometry) return;

    m.addSource(TOUR_ROUTE_SOURCE, {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: routeGeometry },
    });

    m.addLayer({
      id: TOUR_ROUTE_LAYER,
      type: "line",
      source: TOUR_ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": tourTech?.color || "#6366f1",
        "line-width": 4,
        "line-dasharray": [2, 3],
        "line-opacity": 0.75,
      },
    });
  }, [routeGeometry, isTourMode, mapReady, tourTech?.color]);

  const toggleTech = useCallback((id: number) => {
    setSelectedTechIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }, []);

  if (tokenError || mapInitError) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{tokenError || mapInitError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: "100%", minHeight: "400px" }}>
      <div ref={mapContainer} className="absolute inset-0" style={{ minHeight: "400px" }} />

      {/* Edge gradients */}
      <div className="absolute top-0 left-0 right-0 h-16 z-[2] pointer-events-none bg-gradient-to-b from-white/90 to-white/0 dark:from-background/90 dark:to-background/0" />
      <div className="absolute bottom-0 left-0 right-0 h-16 z-[2] pointer-events-none bg-gradient-to-t from-white/90 to-white/0 dark:from-background/90 dark:to-background/0" />
      <div className="absolute top-0 bottom-0 left-0 w-10 z-[2] pointer-events-none bg-gradient-to-r from-white/70 to-white/0 dark:from-background/70 dark:to-background/0" />
      <div className="absolute top-0 bottom-0 right-0 w-10 z-[2] pointer-events-none bg-gradient-to-l from-white/70 to-white/0 dark:from-background/70 dark:to-background/0" />

      {/* Loading overlay */}
      {(!mapReady || rdvsLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {rdvsLoading && <span className="text-xs text-muted-foreground">Géocodage des adresses…</span>}
          </div>
        </div>
      )}

      {/* Stats bar */}
      {mapReady && !isTourMode && (
        <div className="absolute top-4 right-16 z-10 flex items-center gap-2">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm">
            <MapPin className="h-3 w-3 mr-1" />
            {sortedRdvs.length} RDV géolocalisés
          </Badge>
        </div>
      )}

      {/* Tech filter */}
      {filterTechs.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10">
          <Popover open={techFilterOpen} onOpenChange={setTechFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedTechIds.length > 0 ? "default" : "secondary"}
                size="sm"
                className="shadow-lg bg-background/90 backdrop-blur-sm text-foreground hover:bg-background"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                {selectedTechIds.length > 0
                  ? `${selectedTechIds.length} tech${selectedTechIds.length > 1 ? "s" : ""}`
                  : "Filtrer techs"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" side="top" align="start">
              <Command>
                <CommandInput placeholder="Rechercher…" />
                <CommandList>
                  <CommandEmpty>Aucun technicien</CommandEmpty>
                  <CommandGroup>
                    {filterTechs.map((tech) => (
                      <CommandItem key={tech.id} onSelect={() => toggleTech(tech.id)} className="cursor-pointer">
                        <span className="w-3 h-3 rounded-full mr-2 shrink-0 border" style={{ backgroundColor: tech.color, borderColor: tech.color }} />
                        <span className="truncate flex-1">{tech.name}</span>
                        {selectedTechIds.includes(tech.id) && <span className="text-primary font-bold ml-auto">✓</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              {selectedTechIds.length > 0 && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setSelectedTechIds([])}>Réinitialiser</Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
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

      {/* Mini preview */}
      <RdvMiniPreview rdv={selectedRdv} onClose={() => setSelectedRdv(null)} />

      {/* Empty state */}
      {mapReady && !rdvsLoading && sortedRdvs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 shadow-lg text-center max-w-xs pointer-events-auto">
            <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Aucun RDV géolocalisé</p>
            <p className="text-xs text-muted-foreground mt-1">{format(selectedDate, "EEEE d MMMM", { locale: fr })}</p>
          </div>
        </div>
      )}
    </div>
  );
}
