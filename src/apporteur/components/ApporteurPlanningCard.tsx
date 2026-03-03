/**
 * ApporteurPlanningCard - Planning semaine des RDV pour l'apporteur
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  useApporteurPlanning, 
  PlanningEvent,
  formatTime, 
  getWeekDays,
  formatWeekRange
} from '../hooks/useApporteurPlanning';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  MapPin,
  User,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_NAMES_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const TYPE_COLORS: Record<string, string> = {
  rt: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  travaux: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  depannage: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  sav: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

function getTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('rt') || t.includes('relev')) return TYPE_COLORS.rt;
  if (t.includes('tvx') || t.includes('travaux')) return TYPE_COLORS.travaux;
  if (t.includes('depan') || t.includes('dépan')) return TYPE_COLORS.depannage;
  if (t.includes('sav')) return TYPE_COLORS.sav;
  return TYPE_COLORS.default;
}

export function ApporteurPlanningCard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<PlanningEvent | null>(null);
  
  const { data, isLoading, error } = useApporteurPlanning({ weekOffset });

  const events = data?.data?.events || [];
  const week = data?.data?.week;
  const weekDays = week ? getWeekDays(week.start) : [];

  // Group events by day
  const eventsByDay: Record<string, PlanningEvent[]> = {};
  for (const event of events) {
    if (!eventsByDay[event.date]) {
      eventsByDay[event.date] = [];
    }
    eventsByDay[event.date].push(event);
  }

  if (error || data?.error === 'non_raccorde') {
    return (
      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800 dark:text-amber-200">Planning indisponible</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Planning
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setWeekOffset(w => w - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setWeekOffset(0)}
              >
                {week ? formatWeekRange(week.start, week.end) : 'Cette semaine'}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setWeekOffset(w => w + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(eventsByDay).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Aucun RDV planifié cette semaine
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(eventsByDay)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dayEvents]) => {
                  const d = new Date(date);
                  const isToday = date === new Date().toISOString().split('T')[0];
                  const dayName = DAY_NAMES_FULL[d.getDay()];
                  const dayNum = d.getDate();
                  const monthStr = d.toLocaleDateString('fr-FR', { month: 'short' });

                  return (
                    <div key={date} className={cn(
                      "rounded-xl border p-3",
                      isToday ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "text-sm font-semibold capitalize",
                          isToday ? "text-primary" : "text-foreground"
                        )}>
                          {dayName} {dayNum} {monthStr}
                        </span>
                        {isToday && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/40 text-primary">
                            Aujourd'hui
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">
                          {dayEvents.length} RDV
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {dayEvents
                          .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                          .map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm",
                              getTypeColor(event.type)
                            )}
                            onClick={() => setSelectedEvent(event)}
                          >
                            {event.time && (
                              <span className="text-xs font-mono font-medium shrink-0 opacity-80">
                                {formatTime(event.time)}
                              </span>
                            )}
                            <span className="text-xs font-medium truncate flex-1">
                              {event.clientName}
                            </span>
                            <span className="text-[10px] opacity-70 shrink-0">
                              {event.typeLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Détails du RDV
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-lg">{selectedEvent.clientName}</p>
                  <p className="text-sm text-muted-foreground">Dossier {selectedEvent.projectRef}</p>
                </div>
                <Badge className={getTypeColor(selectedEvent.type)}>
                  {selectedEvent.typeLabel}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </span>
                </div>
                {selectedEvent.time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{formatTime(selectedEvent.time)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedEvent.city || '-'}</span>
                </div>
                {selectedEvent.technicianName && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedEvent.technicianName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
