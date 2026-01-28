/**
 * DemoStaticMapWidget - Widget carte statique pour la démo N0
 * Affiche une image fixe au lieu d'appeler l'API en temps réel
 */

import { MapPin, Calendar, Users, Expand } from 'lucide-react';
import demoMapImage from '@/assets/demo-map-preview.png';

export function DemoStaticMapWidget() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-sm bg-card h-full min-h-[320px]">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-background/90 to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Sur le terrain aujourd'hui</h3>
              <p className="text-sm text-muted-foreground">Vos RDV du jour</p>
            </div>
          </div>
          
          {/* Stats badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">19 RDV</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">8 techs</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm cursor-not-allowed opacity-60">
              <Expand className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Agrandir</span>
            </div>
          </div>
        </div>
      </div>

      {/* Static map image */}
      <img 
        src={demoMapImage} 
        alt="Carte des interventions - Démo"
        className="w-full h-full object-cover"
      />
      
      {/* Mapbox attribution (for consistency) */}
      <div className="absolute bottom-2 left-2 z-10">
        <span className="text-[10px] text-muted-foreground/60 bg-background/50 px-1 rounded">
          © Mapbox
        </span>
      </div>
    </div>
  );
}

export default DemoStaticMapWidget;
