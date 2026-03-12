/**
 * RdvMapPage - Carte des RDV planifiés
 * 
 * Affiche sur une carte Mapbox tous les RDV planifiés pour une journée.
 * Filtres: date, technicien(s)
 * Markers personnalisés avec camembert multi-couleurs
 * Clustering à faible zoom
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useRdvMap, calculateBounds, MapRdv } from '@/hooks/useRdvMap';
import { createPinMarkerElement } from '@/components/map/PinMarker';
import { RdvMiniPreview } from '@/components/map/RdvMiniPreview';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';

// Mapbox token sera récupéré via Edge Function
const MAPBOX_STYLE = 'mapbox://styles/bij40/cmjbi8grj000t01s3ajxo3amm';
const DEFAULT_CENTER: [number, number] = [1.4442, 43.6047]; // Toulouse (centre France sud)
const DEFAULT_ZOOM = 6;

export default function RdvMapPage() {
  const { agence } = useProfile();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  // État
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [techFilterOpen, setTechFilterOpen] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<MapRdv | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Charger les RDV
  const { rdvs, isLoading, error, technicians } = useRdvMap({
    date: selectedDate,
    techIds: selectedTechIds.length > 0 ? selectedTechIds : undefined,
    agencySlug: agence || undefined,
  });

  // Récupérer le token Mapbox depuis les secrets
  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Le token doit être dans les secrets Supabase
        // On le récupère via une edge function simple ou directement si exposé
        const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        if (token) {
          setTokenError(null);
          setMapInitError(null);
          setMapboxToken(token);
          return;
        }

        // Récupérer via edge function avec authentification
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');

        if (error) {
          console.error('Erreur Edge Function:', error);
          setTokenError('Impossible de récupérer le token Mapbox');
          return;
        }

        if (data?.token) {
          setTokenError(null);
          setMapInitError(null);
          setMapboxToken(data.token);
          return;
        }

        setTokenError('Token Mapbox non configuré');
      } catch (err) {
        console.error('Erreur lors de la récupération du token Mapbox:', err);
        setTokenError('Impossible de récupérer le token Mapbox');
      }
    };

    fetchToken();
  }, []);

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    if (!mapboxgl.supported()) {
      setMapInitError('WebGL non supporté par ce navigateur/appareil.');
      return;
    }

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

      const safeResize = () => {
        try {
          map.current?.resize();
        } catch {
          // ignore
        }
      };

      // Ajouter les contrôles de navigation
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      // Dans un layout flex/overflow, Mapbox peut nécessiter un resize explicite
      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => safeResize());
        ro.observe(mapContainer.current);
      }

      // Quelques resizes pour stabiliser les dimensions (flex + transitions)
      requestAnimationFrame(safeResize);
      window.setTimeout(safeResize, 50);
      window.setTimeout(safeResize, 250);

      map.current.on('load', () => {
        setMapReady(true);
        requestAnimationFrame(safeResize);
      });

      map.current.on('error', (e) => {
        const msg = (e as any)?.error?.message || (e as any)?.error || 'Erreur Mapbox';
        console.error('[RdvMap] Mapbox error:', msg);
        setMapInitError(String(msg));
      });

      return () => {
        ro?.disconnect();
        setMapReady(false);
        map.current?.remove();
        map.current = null;
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation de la carte';
      console.error('[RdvMap] Map init failed:', err);
      setMapReady(false);
      setMapInitError(msg);
      map.current = null;
    }
  }, [mapboxToken]);
  
  // Ref pour tracker si on a déjà centré la carte sur les RDV actuels
  const hasFittedBoundsRef = useRef(false);
  const lastRdvsLengthRef = useRef(0);

  // Mettre à jour les markers (sans dézoom au clic)
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Supprimer les anciens markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Ajouter les nouveaux markers
    rdvs.forEach((rdv) => {
      const isSelected = selectedRdv?.rdvId === rdv.rdvId;

      const el = createPinMarkerElement(rdv.users, 40, isSelected, () => {
        setSelectedRdv(prev => prev?.rdvId === rdv.rdvId ? null : rdv);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([rdv.lng, rdv.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Centrer sur les RDV UNIQUEMENT si les données ont changé (pas au clic sur marker)
    const rdvsChanged = rdvs.length !== lastRdvsLengthRef.current || !hasFittedBoundsRef.current;
    lastRdvsLengthRef.current = rdvs.length;

    if (rdvsChanged && rdvs.length > 0) {
      const bounds = calculateBounds(rdvs);
      if (bounds) {
        const container = map.current.getContainer();
        const w = container.clientWidth || 800;
        const h = container.clientHeight || 600;
        const padX = Math.max(56, Math.round(w * 0.12));
        const padY = Math.max(56, Math.round(h * 0.12));

        map.current.fitBounds(bounds, {
          padding: { top: padY, bottom: padY, left: padX, right: padX },
          maxZoom: 14,
          duration: 1000,
        });
        hasFittedBoundsRef.current = true;
      }
    }
  }, [rdvs, selectedRdv, mapReady]);

  // Reset le flag de fitBounds quand la date ou les filtres changent
  useEffect(() => {
    hasFittedBoundsRef.current = false;
  }, [selectedDate, selectedTechIds]);
  
  // Navigation de date
  const goToPreviousDay = () => setSelectedDate(d => subDays(d, 1));
  const goToNextDay = () => setSelectedDate(d => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());
  
  // Toggle technicien
  const toggleTechnician = (techId: number) => {
    setSelectedTechIds(prev =>
      prev.includes(techId)
        ? prev.filter(id => id !== techId)
        : [...prev, techId]
    );
  };
  
  const clearTechFilter = () => setSelectedTechIds([]);
  
  if (tokenError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {tokenError}. Veuillez configurer le secret MAPBOX_ACCESS_TOKEN.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="h-[calc(100vh-4rem)] min-h-0 flex flex-col">
      {/* Barre de filtres */}
      <div className="flex-none p-4 border-b bg-background space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation date */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={goToToday}>
              Aujourd'hui
            </Button>
          </div>

          {/* Filtre techniciens */}
          <Popover open={techFilterOpen} onOpenChange={setTechFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Techniciens
                {selectedTechIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedTechIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher un technicien..." />
                <CommandList>
                  <CommandEmpty>Aucun technicien trouvé</CommandEmpty>
                  <CommandGroup>
                    {technicians.map((tech) => (
                      <CommandItem
                        key={tech.id}
                        onSelect={() => toggleTechnician(tech.id)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            'mr-2 h-4 w-4 rounded border flex items-center justify-center',
                            selectedTechIds.includes(tech.id)
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground'
                          )}
                        >
                          {selectedTechIds.includes(tech.id) && (
                            <span className="text-xs">✓</span>
                          )}
                        </div>
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: tech.color }}
                        />
                        {tech.name}
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
                    className="w-full"
                    onClick={clearTechFilter}
                  >
                    Effacer les filtres
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Compteur RDV */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
            <MapPin className="h-4 w-4" />
            <span>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${rdvs.length} RDV`
              )}
            </span>
          </div>
        </div>

        {/* Badges techniciens sélectionnés */}
        {selectedTechIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTechIds.map((id) => {
              const tech = technicians.find((t) => t.id === id);
              if (!tech) return null;
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => toggleTechnician(id)}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: tech.color }}
                  />
                  {tech.name}
                  <span className="ml-1 text-muted-foreground">×</span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Carte */}
      <div className="flex-1 min-h-0 bg-muted/20 p-3 sm:p-4 md:p-6">
        <div className="mx-auto h-full w-full max-w-[1400px]">
          <div className="relative h-full w-full overflow-hidden rounded-xl border bg-background shadow-sm">
            {!mapboxToken ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div ref={mapContainer} className="h-full w-full" />
            )}

            {/* Erreur init Mapbox */}
            {mapInitError && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{mapInitError}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Loader overlay */}
            {isLoading && mapboxToken && !mapInitError && (
              <div className="absolute top-4 left-4 bg-background/80 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement des RDV...</span>
              </div>
            )}

            {/* Mini preview RDV sélectionné */}
            {selectedRdv && !isLoading && (
              <RdvMiniPreview
                rdv={selectedRdv}
                onClose={() => setSelectedRdv(null)}
              />
            )}

            {/* Erreur data */}
            {error && !mapInitError && (
              <div className="absolute top-4 left-4 right-4 max-w-md">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
