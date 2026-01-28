/**
 * DashboardMapWidget - Carte RDV intégrée au dashboard (Hero Section)
 * 
 * Version compacte de la carte des RDV pour le dashboard:
 * - Affiche les RDV du jour uniquement
 * - Pastilles colorées par technicien
 * - Bouton pour agrandir en modal
 * - Compteur de RDV visible
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Maximize2, Users, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useRdvMap, calculateBounds, MapRdv } from '@/hooks/useRdvMap';
import { createPinMarkerElement } from '@/components/map/PinMarker';
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
    staleTime: Infinity, // Le token ne change pas
    gcTime: Infinity,
  });
}

interface DashboardMapWidgetProps {
  className?: string;
  agencySlug?: string;
}

function MapContent({
  rdvs,
  selectedRdv,
  onSelectRdv,
  containerRef,
  isExpanded = false,
  mapboxToken,
}: {
  rdvs: MapRdv[];
  selectedRdv: MapRdv | null;
  onSelectRdv: (rdv: MapRdv | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  isExpanded?: boolean;
  mapboxToken: string;
}) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [2.3522, 48.8566], // Paris par défaut
      zoom: 10,
      attributionControl: false,
    });

    // Ajouter contrôles de navigation en mode expanded
    if (isExpanded) {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    }

    mapRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [containerRef, isExpanded]);

  // Mise à jour des markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Nettoyer les anciens markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Ajouter les nouveaux markers
    rdvs.forEach(rdv => {
      const isSelected = selectedRdv?.rdvId === rdv.rdvId;
      const el = createPinMarkerElement(rdv.users, isExpanded ? 40 : 32, isSelected, () => {
        onSelectRdv(isSelected ? null : rdv);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([rdv.lng, rdv.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Ajuster la vue sur les markers
    const bounds = calculateBounds(rdvs);
    if (bounds && rdvs.length > 0) {
      map.fitBounds(bounds as [[number, number], [number, number]], {
        padding: isExpanded ? 60 : 40,
        maxZoom: 14,
        duration: 500,
      });
    }
  }, [rdvs, selectedRdv, onSelectRdv, isExpanded]);

  return null;
}

export function DashboardMapWidget({ className, agencySlug }: DashboardMapWidgetProps) {
  const today = new Date();
  const { rdvs, isLoading, technicians } = useRdvMap({ date: today, agencySlug });
  const { data: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
  const [selectedRdv, setSelectedRdv] = useState<MapRdv | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const compactMapRef = useRef<HTMLDivElement>(null);
  const expandedMapRef = useRef<HTMLDivElement>(null);

  if (isLoading || tokenLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('rounded-warm overflow-hidden h-full min-h-[240px]', className)}
      >
        <Skeleton className="w-full h-full min-h-[240px] rounded-warm" />
      </motion.div>
    );
  }

  if (tokenError || !mapboxToken) {
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
        'bg-gradient-to-br from-warm-blue/10 to-warm-teal/5',
        'shadow-warm',
        className
      )}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 bg-gradient-to-b from-white/90 to-white/0 dark:from-background/90 dark:to-background/0">
        <div className="flex items-center justify-between">
          <HumanTitle
            titleKey="map"
            icon={MapPin}
            iconColor="text-warm-teal"
            size="md"
          />
          
          <div className="flex items-center gap-2">
            {/* Compteur de RDV */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-background/80 border border-border/50 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-warm-blue" />
              <span className="text-sm font-medium">
                {rdvs.length} RDV
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
                <div ref={expandedMapRef} className="flex-1 w-full h-full min-h-[500px]">
                  {isExpanded && (
                    <MapContent
                      rdvs={rdvs}
                      selectedRdv={selectedRdv}
                      onSelectRdv={setSelectedRdv}
                      containerRef={expandedMapRef}
                      isExpanded
                      mapboxToken={mapboxToken}
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Carte compacte */}
      <div ref={compactMapRef} className="w-full h-full min-h-[240px]">
        {!isExpanded && (
          <MapContent
            rdvs={rdvs}
            selectedRdv={selectedRdv}
            onSelectRdv={setSelectedRdv}
            containerRef={compactMapRef}
            mapboxToken={mapboxToken}
          />
        )}
      </div>

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
            </div>
          </div>
        </motion.div>
      )}

      {/* Message si pas de RDV */}
      {rdvs.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Pas de RDV aujourd'hui</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default DashboardMapWidget;
