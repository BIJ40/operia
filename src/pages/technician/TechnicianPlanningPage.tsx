/**
 * Technician Planning Page
 * Day-focused view with left/right navigation
 * Week view with time grid - click on day header to switch to day view
 */
import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, subDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Calendar, AlertCircle, ChevronLeft, ChevronRight, MapPin, Clock, Building, FileText, CalendarDays, List } from 'lucide-react';
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
const HOUR_HEIGHT = 48; // px par heure
const TOTAL_HOURS = HOUR_END - HOUR_START;

type ViewMode = 'day' | 'week';

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

// ============ Vue Semaine (grille horaire) ============

interface WeekGridViewProps {
  weekStart: Date;
  allSlots: TechPlanningSlot[];
  onDayClick: (day: Date) => void;
  onSlotClick: (slot: TechPlanningSlot) => void;
  totalMinutes: number;
}

function WeekGridView({ weekStart, allSlots, onDayClick, onSlotClick, totalMinutes }: WeekGridViewProps) {
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);
  
  const hours = useMemo(() => 
    Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i),
    []
  );
  
  // Slots par jour
  const slotsByDay = useMemo(() => {
    const map = new Map<string, TechPlanningSlot[]>();
    weekDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      const daySlots = allSlots
        .filter(s => isSameDay(new Date(s.start), day))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      map.set(key, daySlots);
    });
    return map;
  }, [allSlots, weekDays]);
  
  // Calculer position et hauteur d'un slot
  const getSlotPosition = (slot: TechPlanningSlot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    
    const top = Math.max(0, (startHour - HOUR_START) * HOUR_HEIGHT);
    const height = Math.max(20, (endHour - startHour) * HOUR_HEIGHT);
    
    return { top, height };
  };
  
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header avec jours */}
      <div className="grid grid-cols-[40px_repeat(5,1fr)] border-b bg-muted/30">
        <div className="p-2" /> {/* Espace pour colonne heures */}
        {weekDays.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "p-2 text-center border-l transition-colors hover:bg-primary/10",
                isToday && "bg-primary/5"
              )}
            >
              <div className={cn(
                "text-xs uppercase",
                isToday ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {format(day, 'EEE', { locale: fr })}.
              </div>
              <div className={cn(
                "text-lg font-bold",
                isToday ? "text-primary" : "text-foreground"
              )}>
                {format(day, 'd')}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Grille horaire */}
      <div className="relative overflow-x-auto">
        <div 
          className="grid grid-cols-[40px_repeat(5,1fr)]"
          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {/* Colonne des heures */}
          <div className="relative border-r bg-muted/10">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 text-[10px] text-muted-foreground px-1"
                style={{ top: (hour - HOUR_START) * HOUR_HEIGHT }}
              >
                {hour}h
              </div>
            ))}
          </div>
          
          {/* Colonnes des jours */}
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const daySlots = slotsByDay.get(key) || [];
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "relative border-l",
                  isToday && "bg-primary/5"
                )}
              >
                {/* Lignes horizontales pour les heures */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-border/30"
                    style={{ top: (hour - HOUR_START) * HOUR_HEIGHT }}
                  />
                ))}
                
                {/* Slots */}
                {daySlots.map((slot, idx) => {
                  const { top, height } = getSlotPosition(slot);
                  return (
                    <button
                      key={`${slot.slotId}-${idx}`}
                      onClick={() => onSlotClick(slot)}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded text-white text-[10px] p-1 overflow-hidden",
                        getSlotColor(slot.type),
                        "hover:opacity-90 transition-opacity"
                      )}
                      style={{ top, height: Math.max(height, 18) }}
                    >
                      <div className="font-semibold truncate">
                        {slot.type || 'RDV'}
                      </div>
                      {height > 35 && (
                        <div className="truncate opacity-90">
                          {slot.city || slot.clientName}
                        </div>
                      )}
                      {height > 50 && slot.start && (
                        <div className="opacity-80">
                          {format(new Date(slot.start), "HH:mm")} - {format(new Date(slot.end), "HH:mm")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ Vue Jour (liste) ============

interface DayListViewProps {
  selectedDate: Date;
  weekStart: Date;
  allSlots: TechPlanningSlot[];
  onSelectDay: (day: Date) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSlotClick: (slot: TechPlanningSlot) => void;
}

function DayListView({ 
  selectedDate, 
  weekStart, 
  allSlots, 
  onSelectDay, 
  onPrevDay, 
  onNextDay,
  onSlotClick 
}: DayListViewProps) {
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);
  
  const daySlots = useMemo(() => {
    return allSlots
      .filter(s => isSameDay(new Date(s.start), selectedDate))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [allSlots, selectedDate]);
  
  const dayMinutes = useMemo(() => {
    return daySlots
      .filter(s => !s.isBreak)
      .reduce((acc, s) => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return acc + Math.round((end.getTime() - start.getTime()) / 60_000);
      }, 0);
  }, [daySlots]);
  
  const dateLabel = format(selectedDate, "EEEE d MMMM", { locale: fr });
  const isToday = isSameDay(selectedDate, new Date());
  
  return (
    <div className="space-y-3">
      {/* Sélecteur de jour */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isDayToday = isSameDay(day, new Date());
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex-1 min-w-[56px] py-2 px-1 rounded-lg text-center transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md"
                  : isDayToday
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
      
      {/* Navigation jour avec date */}
      <div className="flex items-center justify-between bg-card rounded-lg p-3 border">
        <Button variant="ghost" size="icon" onClick={onPrevDay}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold capitalize">{dateLabel}</p>
          <p className="text-xs text-muted-foreground">
            {daySlots.length} RDV • {formatMinutesToHours(dayMinutes)}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onNextDay}>
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
              onClick={() => onSlotClick(slot)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============ Composant Principal ============

function TechDayPlanning({ techId }: { techId: number }) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
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
  
  const weekEnd = useMemo(() => addDays(currentWeekStart, 4), [currentWeekStart]);
  
  // Extraire les slots pour ce technicien
  const allSlots = useMemo(() => {
    if (!data?.length) return [];
    const techData = data.find(t => t.techId === techId);
    if (!techData) return [];
    return techData.days.flatMap(d => d.slots);
  }, [data, techId]);
  
  // Total heures semaine
  const totalWeekMinutes = useMemo(() => {
    return allSlots
      .filter(s => !s.isBreak)
      .reduce((acc, s) => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return acc + Math.round((end.getTime() - start.getTime()) / 60_000);
      }, 0);
  }, [allSlots]);
  
  // Navigation jour (pour vue jour)
  const goToPrevDay = () => {
    const newDate = subDays(selectedDate, 1);
    if (newDate < currentWeekStart) {
      goToPrevWeek();
    }
    setSelectedDate(newDate);
  };
  
  const goToNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    const weekEndFull = addDays(currentWeekStart, 6);
    if (newDate > weekEndFull) {
      goToNextWeek();
    }
    setSelectedDate(newDate);
  };
  
  const goToToday = () => {
    setSelectedDate(new Date());
    goToCurrentWeek();
  };
  
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setViewMode('day');
  };
  
  const weekLabel = `${format(currentWeekStart, "d MMM", { locale: fr })} - ${format(weekEnd, "d MMM", { locale: fr })}`;
  
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
      {/* Header avec navigation semaine et toggle vue */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <button onClick={goToToday} className="text-center">
          <p className="font-semibold">{weekLabel}</p>
          <p className="text-xs text-muted-foreground">
            {formatMinutesToHours(totalWeekMinutes)} planifiées
          </p>
        </button>
        
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Toggle vue */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
        <Button
          variant={viewMode === 'week' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => setViewMode('week')}
        >
          <CalendarDays className="h-4 w-4" />
          Semaine
        </Button>
        <Button
          variant={viewMode === 'day' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => setViewMode('day')}
        >
          <List className="h-4 w-4" />
          Jour
        </Button>
      </div>
      
      {/* Vue conditionnelle */}
      {viewMode === 'week' ? (
        <WeekGridView
          weekStart={currentWeekStart}
          allSlots={allSlots}
          onDayClick={handleDayClick}
          onSlotClick={setSelectedSlot}
          totalMinutes={totalWeekMinutes}
        />
      ) : (
        <DayListView
          selectedDate={selectedDate}
          weekStart={currentWeekStart}
          allSlots={allSlots}
          onSelectDay={setSelectedDate}
          onPrevDay={goToPrevDay}
          onNextDay={goToNextDay}
          onSlotClick={setSelectedSlot}
        />
      )}
      
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

      {/* Planning */}
      <AgencyProvider>
        <TechDayPlanning techId={profile.apogee_user_id} />
      </AgencyProvider>
    </div>
  );
}