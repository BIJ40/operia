/**
 * Planning V2 — Vue Carte
 * Affiche les RDV du jour sélectionné sur une carte Mapbox
 * Réutilise les données déjà chargées par usePlanningV2Data
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
import { supabase } from "@/integrations/supabase/client";
import { dateKey } from "../../utils/dateUtils";
import type { PlanningAppointment, PlanningTechnician } from "../../types";
import { MapMiniPreview } from "./MapMiniPreview";

const MAPBOX_STYLE = "mapbox://styles/bij40/cmjbi8grj000t01s3ajxo3amm";
const DEFAULT_CENTER: [number, number] = [1.4442, 43.6047];
const DEFAULT_ZOOM = 6;

interface MapPlanningViewProps {
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  selectedDate: Date;
}

/** Convert planning appointments to map-ready items for the selected day */
function useMapAppointments(
  appointments: PlanningAppointment[],
  technicians: PlanningTechnician[],
  selectedDate: Date
) {
  return useMemo(() => {
    const dk = dateKey(selectedDate);
    const techMap = new Map(technicians.map((t) => [t.id, t]));

    return appointments
      .filter((a) => dateKey(a.start) === dk && a.latitude != null && a.longitude != null)
      .map((a) => ({
        ...a,
        lat: a.latitude!,
        lng: a.longitude!,
        users: a.technicianIds
          .map((tid) => {
            const t = techMap.get(tid);
            return t ? { id: t.id, name: t.name, color: t.color } : null;
          })
          .filter(Boolean) as { id: number; name: string; color: string }[],
      }));
  }, [appointments, technicians, selectedDate]);
}

export function MapPlanningView({ technicians, appointments, selectedDate }: MapPlanningViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<PlanningAppointment | null>(null);
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [techFilterOpen, setTechFilterOpen] = useState(false);

  const allMapAppts = useMapAppointments(appointments, technicians, selectedDate);

  // Filter by selected techs
  const mapAppts = useMemo(() => {
    if (selectedTechIds.length === 0) return allMapAppts;
    return allMapAppts.filter((a) =>
      a.technicianIds.some((tid) => selectedTechIds.includes(tid))
    );
  }, [allMapAppts, selectedTechIds]);

  const hasFittedRef = useRef(false);
  const lastCountRef = useRef(0);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        if (envToken) {
          setMapboxToken(envToken);
          return;
        }
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        if (error || !data?.token) {
          setTokenError("Token Mapbox non disponible");
          return;
        }
        setMapboxToken(data.token);
      } catch {
        setTokenError("Impossible de récupérer le token Mapbox");
      }
    };
    fetchToken();
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;
    if (!mapboxgl.supported()) {
      setMapInitError("WebGL non supporté");
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      const safeResize = () => {
        try { map.current?.resize(); } catch { /* ignore */ }
      };

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && mapContainer.current) {
        ro = new ResizeObserver(() => safeResize());
        ro.observe(mapContainer.current);
      }

      requestAnimationFrame(safeResize);
      setTimeout(safeResize, 50);
      setTimeout(safeResize, 250);

      map.current.on("load", () => {
        setMapReady(true);
        requestAnimationFrame(safeResize);
      });

      map.current.on("error", (e) => {
        const msg = (e as any)?.error?.message || "Erreur Mapbox";
        setMapInitError(String(msg));
      });

      return () => {
        ro?.disconnect();
        setMapReady(false);
        map.current?.remove();
        map.current = null;
      };
    } catch (err) {
      setMapInitError(err instanceof Error ? err.message : "Erreur initialisation carte");
      map.current = null;
    }
  }, [mapboxToken]);

  // Reset fit when date changes
  useEffect(() => {
    hasFittedRef.current = false;
    lastCountRef.current = 0;
  }, [selectedDate]);

  // Update markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    mapAppts.forEach((appt) => {
      const isSelected = selectedAppt?.id === appt.id;
      const el = createPinMarkerElement(appt.users, 40, isSelected, () => {
        setSelectedAppt((prev) => (prev?.id === appt.id ? null : appt));
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([appt.lng, appt.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds only when data changes
    const changed = mapAppts.length !== lastCountRef.current || !hasFittedRef.current;
    lastCountRef.current = mapAppts.length;

    if (changed && mapAppts.length > 0) {
      const bounds = computeBounds(mapAppts);
      if (bounds) {
        const container = map.current.getContainer();
        const padX = Math.max(56, Math.round((container.clientWidth || 800) * 0.12));
        const padY = Math.max(56, Math.round((container.clientHeight || 600) * 0.12));
        map.current.fitBounds(bounds, {
          padding: { top: padY, bottom: padY, left: padX, right: padX },
          maxZoom: 14,
          duration: 1000,
        });
        hasFittedRef.current = true;
      }
    }
  }, [mapAppts, selectedAppt, mapReady]);

  // Toggle tech filter
  const toggleTech = useCallback((id: number) => {
    setSelectedTechIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  // Techs active this day
  const dayTechs = useMemo(() => {
    const activeTechIds = new Set(allMapAppts.flatMap((a) => a.technicianIds));
    return technicians.filter((t) => activeTechIds.has(t.id));
  }, [allMapAppts, technicians]);

  // Error / loading states
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
    <div className="relative h-full w-full">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading overlay */}
      {!mapReady && mapboxToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute top-4 right-16 z-10 flex items-center gap-2">
        <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm">
          <MapPin className="h-3 w-3 mr-1" />
          {mapAppts.length} RDV géolocalisés
        </Badge>
        {allMapAppts.length !== mapAppts.length && (
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm shadow-sm text-muted-foreground">
            {allMapAppts.length - mapAppts.length} masqués
          </Badge>
        )}
      </div>

      {/* Tech filter */}
      {dayTechs.length > 0 && (
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
                    {dayTechs.map((tech) => (
                      <CommandItem
                        key={tech.id}
                        onSelect={() => toggleTech(tech.id)}
                        className="cursor-pointer"
                      >
                        <span
                          className="w-3 h-3 rounded-full mr-2 shrink-0 border"
                          style={{ backgroundColor: tech.color, borderColor: tech.color }}
                        />
                        <span className="truncate flex-1">{tech.name}</span>
                        {selectedTechIds.includes(tech.id) && (
                          <span className="text-primary font-bold ml-auto">✓</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              {selectedTechIds.length > 0 && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setSelectedTechIds([])}
                  >
                    Réinitialiser
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Mini preview */}
      <MapMiniPreview
        appointment={selectedAppt}
        technicians={technicians}
        onClose={() => setSelectedAppt(null)}
      />

      {/* Empty state */}
      {mapReady && mapAppts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 shadow-lg text-center max-w-xs pointer-events-auto">
            <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Aucun RDV géolocalisé</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(selectedDate, "EEEE d MMMM", { locale: fr })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Calculate bounds from appointments with lat/lng */
function computeBounds(
  items: { lat: number; lng: number }[]
): [[number, number], [number, number]] | null {
  if (items.length === 0) return null;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const item of items) {
    minLng = Math.min(minLng, item.lng);
    maxLng = Math.max(maxLng, item.lng);
    minLat = Math.min(minLat, item.lat);
    maxLat = Math.max(maxLat, item.lat);
  }
  const lngPad = (maxLng - minLng) * 0.1 || 0.01;
  const latPad = (maxLat - minLat) * 0.1 || 0.01;
  return [
    [minLng - lngPad, minLat - latPad],
    [maxLng + lngPad, maxLat + latPad],
  ];
}
