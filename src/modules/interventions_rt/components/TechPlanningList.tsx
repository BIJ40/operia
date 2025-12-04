// Écran A - Liste des interventions du jour

import { Phone, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useTechPlanning, 
  DateFilter, 
  getDateLabel, 
  getRtStatusLabel, 
  getRtStatusColor 
} from '../hooks/useTechPlanning';
import { TechIntervention } from '../types';

interface TechPlanningListProps {
  onSelectIntervention: (intervention: TechIntervention) => void;
}

export function TechPlanningList({ onSelectIntervention }: TechPlanningListProps) {
  const { interventions, isLoading, dateFilter, setDateFilter } = useTechPlanning();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <h1 className="text-lg font-semibold mb-3">Mes interventions</h1>
        
        {/* Date filter tabs */}
        <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="today" className="text-xs">Aujourd'hui</TabsTrigger>
            <TabsTrigger value="tomorrow" className="text-xs">Demain</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <p className="text-sm text-muted-foreground mt-2">
          {getDateLabel(dateFilter)}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {interventions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune intervention prévue
          </div>
        ) : (
          interventions.map(intervention => (
            <InterventionCard 
              key={intervention.id} 
              intervention={intervention}
              onSelect={() => onSelectIntervention(intervention)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface InterventionCardProps {
  intervention: TechIntervention;
  onSelect: () => void;
}

function InterventionCard({ intervention, onSelect }: InterventionCardProps) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${intervention.address}, ${intervention.postalCode} ${intervention.city}`
  )}`;

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (intervention.clientPhone) {
      window.location.href = `tel:${intervention.clientPhone.replace(/\s/g, '')}`;
    }
  };

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Time & Status row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{intervention.startTime} - {intervention.endTime}</span>
          </div>
          <Badge className={getRtStatusColor(intervention.rtStatus)}>
            {getRtStatusLabel(intervention.rtStatus)}
          </Badge>
        </div>

        {/* Client name */}
        <h3 className="font-semibold text-base mb-1">{intervention.clientName}</h3>

        {/* Address */}
        <button 
          onClick={handleMapClick}
          className="flex items-start gap-2 text-sm text-muted-foreground hover:text-primary mb-2 text-left"
        >
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{intervention.address}, {intervention.postalCode} {intervention.city}</span>
        </button>

        {/* Type & Univers */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            {intervention.univers}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {intervention.type}
          </Badge>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-2 border-t">
          {intervention.clientPhone && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handlePhoneClick}
              className="text-xs gap-1"
            >
              <Phone className="h-3.5 w-3.5" />
              Appeler
            </Button>
          )}
          <div className="flex-1" />
          <Button 
            variant="default" 
            size="sm"
            className="text-xs gap-1"
          >
            {intervention.rtStatus === 'not_started' ? 'Démarrer' : 'Continuer'}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default TechPlanningList;
