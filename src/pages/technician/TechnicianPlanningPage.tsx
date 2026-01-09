/**
 * Technician Planning Page
 * Day-focused view with left/right navigation
 * Click on day header to switch days
 */
import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Calendar, AlertCircle, ChevronLeft, ChevronRight, MapPin, Clock, Building, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { useWeeklyTechPlanning } from '@/apogee-connect/hooks/useWeeklyTechPlanning';
import { TechPlanningSlot, formatMinutesToHours } from '@/apogee-connect/utils/planning';
import { cn } from '@/lib/utils';

// Constantes grille
const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_HEIGHT = 48; // px par heure (plus grand pour mobile)
const TOTAL_HOURS = HOUR_END - HOUR_START;

function getSlotColor(type: string | null | undefined): string {
  const t = type?.toLowerCase() || '';
  if (t.includes('pause')) return 'bg-amber-500/80';
  if (t.includes('rt') || t.includes('releve') || t.includes('technique')) return 'bg-blue-500/80';
  if (t.includes('travaux') || t.includes('tvx')) return 'bg-emerald-500/80';
  if (t.includes('depannage') || t.includes('repair')) return 'bg-orange-500/80';
  return 'bg-primary/80';
}

interface DayEventCardProps {
  slot: TechPlanningSlot;
  onClick: () => void;
}

function DayEventCard({ slot, onClick }: DayEventCardProps) {
  const startDate = new Date(slot.start);
  const endDate = new Date(slot.end);
  const timeStr = `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;
  const isBreak = slot.isBreak === true;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg p-3 shadow-sm transition-all active:scale-[0.98]",
        getSlotColor(slot.type),
        "text-white"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {isBreak ? 'Pause' : slot.clientName || slot.type || 'RDV'}
          </p>
          {!isBreak && slot.city && (
            <p className="text-sm opacity-90 truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {slot.city}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="flex-shrink-0 bg-white/20 text-white border-0 text-xs">
          {timeStr}
        </Badge>
      </div>
      {slot.projectRef && (
        <p className="text-xs opacity-80 mt-1">Dossier: {slot.projectRef}</p>
      )}
    </button>
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
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">{timeStr}</p>
                <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
              </div>
            </CardContent>
          </Card>
          
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

interface DaySelectorProps {
  selectedDate: Date;
  weekStart: Date;
  onSelectDay: (day: Date) => void;
}

function DaySelector({ selectedDate, weekStart, onSelectDay }: DaySelectorProps) {
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {weekDays.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        
        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={cn(
              "flex-1 min-w-[56px] py-2 px-1 rounded-lg text-center transition-all",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : isToday
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <div className="text-[10px] uppercase font-medium">
              {format(day, 'EEE', { locale: fr })}
            </div>
            <div className="text-lg font-bold">{format(day, 'd')}</div>
          </button>
        );
      })}
    </div>
  );
}

function TechDayPlanning({ techId }: { techId: number }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
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
  
  // Extraire les slots pour ce technicien
  const allSlots = useMemo(() => {
    if (!data?.length) return [];
    const techData = data.find(t => t.techId === techId);
    if (!techData) return [];
    return techData.days.flatMap(d => d.slots);
  }, [data, techId]);
  
  // Filtrer les slots du jour sélectionné
  const daySlots = useMemo(() => {
    return allSlots
      .filter(s => isSameDay(new Date(s.start), selectedDate))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [allSlots, selectedDate]);
  
  // Calculer les heures du jour
  const dayMinutes = useMemo(() => {
    return daySlots
      .filter(s => !s.isBreak)
      .reduce((acc, s) => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return acc + Math.round((end.getTime() - start.getTime()) / 60_000);
      }, 0);
  }, [daySlots]);
  
  // Navigation jour
  const goToPrevDay = () => {
    const newDate = subDays(selectedDate, 1);
    // Si on change de semaine, mettre à jour la semaine
    if (newDate < currentWeekStart) {
      goToPrevWeek();
    }
    setSelectedDate(newDate);
  };
  
  const goToNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    const weekEnd = addDays(currentWeekStart, 6);
    // Si on change de semaine, mettre à jour la semaine
    if (newDate > weekEnd) {
      goToNextWeek();
    }
    setSelectedDate(newDate);
  };
  
  const goToToday = () => {
    setSelectedDate(new Date());
    goToCurrentWeek();
  };
  
  const handleSelectDay = (day: Date) => {
    setSelectedDate(day);
  };
  
  const dateLabel = format(selectedDate, "EEEE d MMMM", { locale: fr });
  const isToday = isSameDay(selectedDate, new Date());
  
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
      {/* Sélecteur de semaine */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goToPrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button 
          onClick={goToToday}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Sem. {format(currentWeekStart, "d MMM", { locale: fr })}
        </button>
        <Button variant="ghost" size="sm" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Sélecteur de jour */}
      <DaySelector 
        selectedDate={selectedDate}
        weekStart={currentWeekStart}
        onSelectDay={handleSelectDay}
      />
      
      {/* Navigation jour avec date */}
      <div className="flex items-center justify-between bg-card rounded-lg p-3 border">
        <Button variant="ghost" size="icon" onClick={goToPrevDay}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold capitalize">{dateLabel}</p>
          <p className="text-xs text-muted-foreground">
            {daySlots.length} RDV • {formatMinutesToHours(dayMinutes)}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextDay}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Liste des RDV du jour */}
      <div className="space-y-2">
        {daySlots.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Aucun RDV prévu</p>
              <p className="text-sm">
                {isToday ? "Votre journée est libre" : "Pas d'intervention ce jour"}
              </p>
            </CardContent>
          </Card>
        ) : (
          daySlots.map((slot, idx) => (
            <DayEventCard
              key={`${slot.slotId}-${idx}`}
              slot={slot}
              onClick={() => setSelectedSlot(slot)}
            />
          ))
        )}
      </div>
      
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

      {/* Planning du jour */}
      <AgencyProvider>
        <TechDayPlanning techId={profile.apogee_user_id} />
      </AgencyProvider>
    </div>
  );
}
