// Écran B - Détail d'une intervention

import { ArrowLeft, Phone, MapPin, FileText, Image, Clock, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TechIntervention } from '../types';
import { getRtStatusLabel, getRtStatusColor } from '../hooks/useTechPlanning';

interface InterventionDetailProps {
  intervention: TechIntervention;
  onBack: () => void;
  onStartRt: () => void;
  onViewPhotos?: () => void;
  photoCount?: number;
}

export function InterventionDetail({ 
  intervention, 
  onBack, 
  onStartRt,
  onViewPhotos,
  photoCount = 0
}: InterventionDetailProps) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${intervention.address}, ${intervention.postalCode} ${intervention.city}`
  )}`;

  const handleCall = () => {
    if (intervention.clientPhone) {
      window.location.href = `tel:${intervention.clientPhone.replace(/\s/g, '')}`;
    }
  };

  const isRtStarted = intervention.rtStatus !== 'not_started';
  const isRtCompleted = intervention.rtStatus === 'completed' || intervention.rtStatus === 'pdf_sent';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Intervention</h1>
            <p className="text-xs text-muted-foreground">{intervention.dossierRef}</p>
          </div>
          <Badge className={getRtStatusColor(intervention.rtStatus)}>
            {getRtStatusLabel(intervention.rtStatus)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Client Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-lg">{intervention.clientName}</p>
              <p className="text-sm text-muted-foreground">Dossier : {intervention.dossierRef}</p>
            </div>
            
            {intervention.clientPhone && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={handleCall}
              >
                <Phone className="h-4 w-4" />
                {intervention.clientPhone}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-left h-auto py-2"
              onClick={() => window.open(googleMapsUrl, '_blank')}
            >
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                {intervention.address}<br/>
                {intervention.postalCode} {intervention.city}
              </span>
            </Button>
          </CardContent>
        </Card>

        {/* Intervention Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{intervention.startTime} - {intervention.endTime}</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{intervention.univers}</Badge>
              <Badge variant="secondary">{intervention.type}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Photos section (if any) */}
        {photoCount > 0 && (
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={onViewPhotos}
          >
            <Image className="h-4 w-4" />
            Voir les photos ({photoCount})
          </Button>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-background border-t p-4 space-y-2">
        <Button 
          className="w-full h-14 text-base font-semibold"
          size="lg"
          onClick={onStartRt}
          disabled={isRtCompleted}
        >
          {intervention.rtStatus === 'not_started' 
            ? 'Démarrer le relevé technique'
            : intervention.rtStatus === 'in_progress'
            ? 'Reprendre le relevé'
            : intervention.rtStatus === 'completed'
            ? 'Générer le PDF'
            : 'PDF déjà envoyé'
          }
        </Button>
      </div>
    </div>
  );
}

export default InterventionDetail;
