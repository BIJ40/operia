/**
 * ZoneConfigDialog — Interactive map to select/deselect communes for the agency zone.
 * Click communes to toggle. Save persists to Supabase.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Trash2, MapPin } from 'lucide-react';
import { useAgencyZone, ZoneCommune } from '@/hooks/useAgencyZone';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const MAPBOX_STYLE = 'mapbox://styles/mapbox/light-v11';
const DEFAULT_CENTER: [number, number] = [-1.0, 43.7];
const DEFAULT_ZOOM = 8;
const SOURCE_ID = 'zone-config-communes';
const FILL_LAYER = 'zone-config-fill';
const LINE_LAYER = 'zone-config-line';
const SELECTED_FILL = 'zone-config-selected-fill';

interface ZoneConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ZoneConfigDialog({ open, onOpenChange }: ZoneConfigDialogProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { zone, isLoading: zoneLoading, saveZone } = useAgencyZone();

  // Local selection state (only saved on click "Enregistrer")
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [dirty, setDirty] = useState(false);

  // Fetch mapbox token
  const { data: mapboxToken } = useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;
      const resp = await supabase.functions.invoke('get-mapbox-token');
      return resp.data?.token || null;
    },
    staleTime: 60 * 60 * 1000,
  });

  // Fetch ALL commune polygons (departments 40, 64)
  const { data: communeGeoJson, isLoading: communesLoading } = useQuery({
    queryKey: ['commune-polygons-config'],
    queryFn: async () => {
      const allFeatures: any[] = [];
      for (const dept of ['40', '64']) {
        try {
          const resp = await fetch(`https://geo.api.gouv.fr/departements/${dept}/communes?fields=code,nom&format=geojson&geometry=contour`);
          if (!resp.ok) continue;
          const geojson = await resp.json();
          for (const feature of geojson.features || []) {
            if (feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon') {
              allFeatures.push(feature);
            }
          }
        } catch { /* skip dept */ }
      }
      return { type: 'FeatureCollection', features: allFeatures } as GeoJSON.FeatureCollection;
    },
    staleTime: 60 * 60 * 1000,
    enabled: open,
  });

  // Initialize selection from saved zone
  useEffect(() => {
    if (!zoneLoading && zone.length > 0 && selected.size === 0 && !dirty) {
      const m = new Map<string, string>();
      for (const c of zone) m.set(c.code_insee, c.nom);
      setSelected(m);
    }
  }, [zone, zoneLoading, dirty]);

  // Init map
  useEffect(() => {
    if (!open || !mapboxToken || !mapContainer.current || map.current) return;
    mapboxgl.accessToken = mapboxToken;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    m.on('load', () => setMapReady(true));
    map.current = m;

    return () => {
      map.current = null;
      setMapReady(false);
      m.remove();
    };
  }, [open, mapboxToken]);

  // Update map layers when communeGeoJson or selection changes
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !communeGeoJson) return;

    // Enrich features with 'selected' property
    const enriched: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: communeGeoJson.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          selected: selected.has(f.properties?.code || '') ? 1 : 0,
        },
      })),
    };

    if (m.getSource(SOURCE_ID)) {
      (m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(enriched);
    } else {
      m.addSource(SOURCE_ID, { type: 'geojson', data: enriched });

      // Unselected fill (light gray)
      m.addLayer({
        id: FILL_LAYER,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'selected'], 1],
            '#22c55e',
            '#f3f4f6',
          ],
          'fill-opacity': [
            'case',
            ['==', ['get', 'selected'], 1],
            0.55,
            0.3,
          ],
        },
      });

      // Borders
      m.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'selected'], 1],
            '#15803d',
            '#d1d5db',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'selected'], 1],
            2,
            0.5,
          ],
        },
      });

      // Hover effect
      m.on('mouseenter', FILL_LAYER, () => {
        m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', FILL_LAYER, () => {
        m.getCanvas().style.cursor = '';
      });

      // Click to toggle
      m.on('click', FILL_LAYER, (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] });
        if (!features?.length) return;
        const code = features[0].properties?.code;
        const nom = features[0].properties?.nom || '';
        if (!code) return;

        setSelected(prev => {
          const next = new Map(prev);
          if (next.has(code)) {
            next.delete(code);
          } else {
            next.set(code, nom);
          }
          return next;
        });
        setDirty(true);
      });

      // Tooltip on hover
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
      m.on('mousemove', FILL_LAYER, (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] });
        if (!features?.length) { popup.remove(); return; }
        const p = features[0].properties;
        const isSelected = selected.has(p?.code || '');
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-size:12px;font-weight:600;">${p?.nom || ''} <span style="font-weight:400;color:#888;">${p?.code || ''}</span></div><div style="font-size:11px;color:${isSelected ? '#15803d' : '#666'};">${isSelected ? '✓ Dans la zone' : 'Cliquer pour ajouter'}</div>`)
          .addTo(m);
      });
      m.on('mouseleave', FILL_LAYER, () => popup.remove());
    }
  }, [communeGeoJson, mapReady, selected]);

  const handleSave = useCallback(() => {
    const communes: ZoneCommune[] = Array.from(selected.entries()).map(([code_insee, nom]) => ({ code_insee, nom }));
    saveZone.mutate(communes);
    setDirty(false);
  }, [selected, saveZone]);

  const handleClearAll = useCallback(() => {
    setSelected(new Map());
    setDirty(true);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!communeGeoJson) return;
    const m = new Map<string, string>();
    for (const f of communeGeoJson.features) {
      const code = f.properties?.code;
      if (code) m.set(code, f.properties?.nom || '');
    }
    setSelected(m);
    setDirty(true);
  }, [communeGeoJson]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Configuration de la zone d'intervention
          </DialogTitle>
          <DialogDescription>
            Cliquez sur les communes pour les ajouter ou retirer de votre zone. Toutes les cartes utiliseront ce référentiel.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {selected.size} commune{selected.size !== 1 ? 's' : ''} sélectionnée{selected.size !== 1 ? 's' : ''}
          </Badge>
          {communeGeoJson && (
            <Badge variant="secondary" className="text-xs">
              {communeGeoJson.features.length} disponibles
            </Badge>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={communesLoading}>
            Tout sélectionner
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Tout désélectionner
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveZone.isPending || !dirty}>
            {saveZone.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Enregistrer
          </Button>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0 relative">
          {(communesLoading || !mapboxToken) && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
