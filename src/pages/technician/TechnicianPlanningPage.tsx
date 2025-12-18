/**
 * Technician Planning Page
 * Grid-based weekly planning view similar to /rh/equipe/plannings
 * Clicking on a slot opens the intervention detail
 */
import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Calendar, AlertCircle, ChevronLeft, ChevronRight, MapPin, Phone, Clock, Building, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { useWeeklyTechPlanning } from '@/apogee-connect/hooks/useWeeklyTechPlanning';
import { TechPlanningSlot, formatMinutesToHours } from '@/apogee-connect/utils/planning';

// Constantes grille
const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_HEIGHT = 40; // px par heure (adapté mobile)
const TOTAL_HOURS = HOUR_END - HOUR_START;

function getSlotColor(type: string | null | undefined): string {
  const t = type?.toLowerCase() || '';
  if (t.includes('pause')) return 'bg-amber-500/80';
  if (t.includes('rt') || t.includes('releve') || t.includes('technique')) return 'bg-blue-500/80';
  if (t.includes('travaux') || t.includes('tvx')) return 'bg-emerald-500/80';
  if (t.includes('depannage') || t.includes('repair')) return 'bg-orange-500/80';
  return 'bg-primary/80';
}

interface EventBlockProps {
  slot: TechPlanningSlot;
  onClick: () => void;
}

function EventBlock({ slot, onClick }: EventBlockProps) {
  const startDate = new Date(slot.start);
  const endDate = new Date(slot.end);
  const startMinutes = (startDate.getHours() - HOUR_START) * 60 + startDate.getMinutes();
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);
  
  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24);
  
  if (startMinutes < 0 || startMinutes >= TOTAL_HOURS * 60) return null;
  
  const timeStr = `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;
  const isBreak = slot.isBreak === true;
  
  return (
    <button
      onClick={onClick}
      className={`absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 text-[10px] overflow-hidden shadow-sm text-white text-left transition-transform active:scale-95 ${getSlotColor(slot.type)}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <div className="font-semibold truncate">{isBreak ? 'Pause' : slot.clientName || slot.type || 'RDV'}</div>
      {!isBreak && height > 28 && slot.city && (
        <div className="opacity-90 truncate">{slot.city}</div>
      )}
      {height > 40 && <div className="opacity-80 truncate">{timeStr}</div>}
    </button>
  );
}

interface DayColumnProps {
  day: Date;
  slots: TechPlanningSlot[];
  onSlotClick: (slot: TechPlanningSlot) => void;
}

function DayColumn({ day, slots, onSlotClick }: DayColumnProps) {
  const daySlots = slots.filter((s) => isSameDay(new Date(s.start), day));
  const isToday = isSameDay(day, new Date());
  
  return (
    <div className="flex-1 min-w-[60px]">
      {/* Header jour */}
      <div
        className={`text-center py-1.5 border-b font-medium text-xs ${
          isToday ? 'bg-primary/20 text-primary' : 'bg-muted/30'
        }`}
      >
        <div className="capitalize">{format(day, 'EEE', { locale: fr })}</div>
        <div className="text-base font-bold">{format(day, 'd')}</div>
      </div>
      
      {/* Grille horaire */}
      <div
        className="relative border-r border-border/50"
        style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
      >
        {/* Lignes horaires */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-border/20"
            style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          />
        ))}
        
        {/* Événements */}
        {daySlots.map((slot, idx) => (
          <EventBlock 
            key={`${slot.slotId}-${idx}`} 
            slot={slot} 
            onClick={() => onSlotClick(slot)}
          />
        ))}
      </div>
    </div>
  );
}

interface SlotDetailSheetProps {
  slot: TechPlanningSlot | null;
  open: boolean;
  onClose: () => void;
}

function SlotDetailSheet({ slot, open, onClose }: SlotDetailSheetProps) {
  if (!slot) return null;
  
  const startDate = new Date(slot.start);
  const endDate = new Date(slot.end);
  const timeStr = `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;
  const dateStr = format(startDate, "EEEE d MMMM", { locale: fr });
  
  // Construire l'URL Google Maps si on a une adresse
  const googleMapsUrl = slot.city 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(slot.city)}`
    : null;
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-left flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Détail du RDV
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-4 space-y-4 overflow-auto">
          {/* Horaire */}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">{timeStr}</p>
                <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Client */}
          {slot.clientName && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="font-semibold text-lg">{slot.clientName}</p>
                {slot.projectRef && (
                  <p className="text-sm text-muted-foreground">Dossier : {slot.projectRef}</p>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Ville / Adresse */}
          {slot.city && (
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-left h-auto py-3"
              onClick={() => googleMapsUrl && window.open(googleMapsUrl, '_blank')}
            >
              <MapPin className="h-5 w-5 flex-shrink-0 text-primary" />
              <span>{slot.city}</span>
            </Button>
          )}
          
          {/* Type d'intervention */}
          {slot.type && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Type d'intervention
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="secondary" className="text-sm">
                  {slot.type}
                </Badge>
              </CardContent>
            </Card>
          )}
          
          {/* État */}
          {slot.state && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">État :</span>
              <Badge variant="outline">{slot.state}</Badge>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TechPlanningGrid({ techId }: { techId: number }) {
  const [selectedSlot, setSelectedSlot] = useState<TechPlanningSlot | null>(null);
  
  const { 
    data, 
    isLoading, 
    error,
    weekDate,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek
  } = useWeeklyTechPlanning(techId, false);
  
  const currentWeekStart = useMemo(() => 
    startOfWeek(weekDate, { weekStartsOn: 1 }),
    [weekDate]
  );
  
  // Calculer les jours de la semaine (Lun-Ven)
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);
  
  // Extraire les slots pour ce technicien
  const slots = useMemo(() => {
    if (!data?.length) return [];
    const techData = data.find(t => t.techId === techId);
    if (!techData) return [];
    return techData.days.flatMap(d => d.slots);
  }, [data, techId]);
  
  // Filtrer les slots de la semaine courante
  const weekSlots = useMemo(() => {
    const weekEnd = addDays(currentWeekStart, 4); // Vendredi
    return slots.filter(s => {
      const slotDate = new Date(s.start);
      return slotDate >= currentWeekStart && slotDate <= weekEnd;
    });
  }, [slots, currentWeekStart]);
  
  // Calculer les heures totales
  const totalMinutes = useMemo(() => {
    return weekSlots
      .filter(s => !s.isBreak)
      .reduce((acc, s) => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return acc + Math.round((end.getTime() - start.getTime()) / 60_000);
      }, 0);
  }, [weekSlots]);
  
  const weekLabel = `${format(currentWeekStart, "d MMM", { locale: fr })} - ${format(
    addDays(currentWeekStart, 4),
    "d MMM",
    { locale: fr }
  )}`;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          Erreur lors du chargement du planning
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Navigation semaine */}
      <div className="flex items-center justify-between bg-card rounded-lg p-2 border">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <button 
            onClick={goToCurrentWeek}
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            {weekLabel}
          </button>
          <p className="text-xs text-muted-foreground">
            {formatMinutesToHours(totalMinutes)} planifiées
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Grille planning */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex overflow-x-auto">
            {/* Colonne heures */}
            <div className="flex-shrink-0 w-10 bg-muted/30 border-r">
              <div className="h-[52px] border-b" /> {/* Header spacer */}
              <div style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="text-[10px] text-muted-foreground text-right pr-1 border-t border-border/20"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {HOUR_START + i}h
                  </div>
                ))}
              </div>
            </div>
            
            {/* Colonnes jours */}
            {weekDays.map((day) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                slots={weekSlots}
                onSlotClick={setSelectedSlot}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Sheet détail */}
      <SlotDetailSheet 
        slot={selectedSlot}
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
      />
    </div>
  );
}

export default function TechnicianPlanningPage() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun profil salarié configuré
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile.apogee_user_id) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">Compte non lié à Apogée</p>
              <p className="text-sm mt-1">
                Votre profil n'est pas encore lié à votre compte technicien Apogée.
                Contactez votre responsable pour effectuer cette liaison.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Mon Planning</h1>
      </div>

      {/* Planning Grid */}
      <AgencyProvider>
        <TechPlanningGrid techId={profile.apogee_user_id} />
      </AgencyProvider>
    </div>
  );
}
