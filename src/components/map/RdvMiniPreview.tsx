/**
 * RdvMiniPreview - Mini-card de prévisualisation d'un RDV
 * Affichée en overlay sur la carte (top-left)
 */

import React from 'react';
import { X, Clock, MapPin, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MapRdv } from '@/hooks/useRdvMap';

interface RdvMiniPreviewProps {
  rdv: MapRdv | null;
  onClose: () => void;
}

export function RdvMiniPreview({ rdv, onClose }: RdvMiniPreviewProps) {
  if (!rdv) return null;

  const startTime = rdv.startAt ? format(parseISO(rdv.startAt), 'HH:mm', { locale: fr }) : '--:--';
  const endTime = rdv.startAt && rdv.durationMin 
    ? format(new Date(parseISO(rdv.startAt).getTime() + rdv.durationMin * 60000), 'HH:mm', { locale: fr })
    : '--:--';

  return (
    <div className="absolute top-4 left-4 z-10 w-72 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg overflow-hidden">
      {/* Header avec badge univers */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <Badge variant="secondary" className="text-xs">
          {rdv.univers || 'Non classé'}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Contenu */}
      <div className="p-3 space-y-2">
        {/* Horaire */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{startTime} - {endTime}</span>
          <span className="text-muted-foreground">({rdv.durationMin} min)</span>
        </div>

        {/* Adresse */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{rdv.address}</span>
        </div>

        {/* Techniciens */}
        <div className="flex items-start gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {rdv.users.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${user.color}20`,
                  color: user.color,
                  border: `1px solid ${user.color}40`
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                {user.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer avec ID dossier */}
      <div className="px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
        Dossier #{rdv.projectId}
      </div>
    </div>
  );
}

export default RdvMiniPreview;
