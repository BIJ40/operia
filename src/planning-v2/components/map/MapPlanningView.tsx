/**
 * Planning V2 — Vue Carte
 * Utilise l'edge function get-rdv-map (géocodage serveur) pour les coordonnées GPS
 * + les données technicians du planning V2 pour les couleurs
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
import { useRdvMap, calculateBounds, type MapRdv } from "@/hooks/useRdvMap";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import type { PlanningTechnician } from "../../types";

const MAPBOX_STYLE = "mapbox://styles/bij40/cmjbi8grj000t01s3ajxo3amm";
const DEFAULT_CENTER: [number, number] = [1.4442, 43.6047];
const DEFAULT_ZOOM = 6;

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

  // Use the existing hook that calls get-rdv-map edge function (with server-side geocoding)
  const { rdvs: allRdvs, isLoading: rdvsLoading, technicians: rdvTechnicians } = useRdvMap({
    date: selectedDate,
    techIds: selectedTechIds.length > 0 ? selectedTechIds : undefined,
    agencySlug,
  });

  // Merge tech colors from planning V2 data into rdv users
  const techColorMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of technicians) m.set(t.id, t.color);
    return m;
  }, [technicians]);

  const rdvs = useMemo(() => {
    return allRdvs.map((rdv) => ({
      ...rdv,
      users: rdv.users.map((u) => ({
        ...u,
        color: techColorMap.get(u.id) || u.color,
      })),
    }));
  }, [allRdvs, techColorMap]);

  // Use planning V2 techs for filter list (richer data), fallback to rdv techs
  const filterTechs = useMemo(() => {
    if (technicians.length > 0) {
      return technicians.map((t) => ({ id: t.id, name: t.name, color: t.color }));
    }
    return rdvTechnicians;
  }, [technicians, rdvTechnicians]);

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

  // Track current date key to force marker refresh
  const currentDateKey = format(selectedDate, "yyyy-MM-dd");
  const lastDateKeyRef = useRef(currentDateKey);

  // Update markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    rdvs.forEach((rdv) => {
      const isSelected = selectedRdv?.rdvId === rdv.rdvId;
      const el = createPinMarkerElement(rdv.users, 40, isSelected, () => {
        setSelectedRdv((prev) => (prev?.rdvId === rdv.rdvId ? null : rdv));
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([rdv.lng, rdv.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds when date changes or data changes
    const dateChanged = currentDateKey !== lastDateKeyRef.current;
    const countChanged = rdvs.length !== lastCountRef.current;
    lastDateKeyRef.current = currentDateKey;
    lastCountRef.current = rdvs.length;

    if ((dateChanged || countChanged || !hasFittedRef.current) && rdvs.length > 0) {
      const bounds = calculateBounds(rdvs);
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
  }, [rdvs, selectedRdv, mapReady, currentDateKey]);

  // Toggle tech filter
  const toggleTech = useCallback((id: number) => {
    setSelectedTechIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

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
    <div className="relative w-full" style={{ height: "100%", minHeight: "400px" }}>
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" style={{ minHeight: "400px" }} />

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
      {mapReady && (
        <div className="absolute top-4 right-16 z-10 flex items-center gap-2">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm">
            <MapPin className="h-3 w-3 mr-1" />
            {rdvs.length} RDV géolocalisés
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
      <RdvMiniPreview
        rdv={selectedRdv}
        onClose={() => setSelectedRdv(null)}
      />

      {/* Empty state */}
      {mapReady && !rdvsLoading && rdvs.length === 0 && (
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
