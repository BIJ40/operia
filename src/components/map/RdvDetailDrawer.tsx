/**
 * RdvDetailDrawer - Panneau latéral pour afficher les détails d'un RDV
 */

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, MapPin, Users, ExternalLink, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MapRdvUser {
  id: number;
  name: string;
  color: string;
}

interface MapRdv {
  rdvId: number;
  projectId: number;
  lat: number;
  lng: number;
  startAt: string;
  durationMin: number;
  univers: string;
  address: string;
  users: MapRdvUser[];
}

interface RdvDetailDrawerProps {
  rdv: MapRdv | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencySlug?: string;
}

export function RdvDetailDrawer({ rdv, open, onOpenChange, agencySlug }: RdvDetailDrawerProps) {
  if (!rdv) return null;
  
  const startTime = new Date(rdv.startAt);
  const endTime = new Date(startTime.getTime() + rdv.durationMin * 60000);
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}`;
  };
  
  // URL vers Apogée pour ouvrir le dossier
  const apogeeProjectUrl = agencySlug 
    ? `https://${agencySlug}.hc-apogee.fr/desktop.php#/projects/project/${rdv.projectId}`
    : null;
  
  // URL vers Apogée pour ouvrir l'intervention
  const apogeeRdvUrl = agencySlug
    ? `https://${agencySlug}.hc-apogee.fr/desktop.php#/projects/intervention/${rdv.rdvId}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {rdv.univers}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-6 space-y-6">
          {/* Heure et durée */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <span className="text-foreground font-medium">
                {format(startTime, 'HH:mm', { locale: fr })} - {format(endTime, 'HH:mm', { locale: fr })}
              </span>
              <span className="text-sm ml-2">
                ({formatDuration(rdv.durationMin)})
              </span>
            </div>
          </div>
          
          {/* Adresse */}
          <div className="flex items-start gap-3 text-muted-foreground">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-foreground">{rdv.address}</span>
          </div>
          
          {/* Techniciens */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Techniciens</span>
            </div>
            <div className="flex flex-wrap gap-2 ml-7">
              {rdv.users.map((user) => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  style={{
                    backgroundColor: `${user.color}20`,
                    borderColor: user.color,
                    borderWidth: 2,
                  }}
                  className="px-3 py-1"
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: user.color }}
                  />
                  {user.name}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="pt-4 space-y-3 border-t">
            {apogeeRdvUrl && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open(apogeeRdvUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir le RDV dans Apogée
              </Button>
            )}
            
            {apogeeProjectUrl && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open(apogeeProjectUrl, '_blank')}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Ouvrir le dossier dans Apogée
              </Button>
            )}
          </div>
          
          {/* Infos techniques (debug) */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p>RDV #{rdv.rdvId} • Dossier #{rdv.projectId}</p>
            <p className="opacity-50">
              {rdv.lat.toFixed(5)}, {rdv.lng.toFixed(5)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RdvDetailDrawer;
