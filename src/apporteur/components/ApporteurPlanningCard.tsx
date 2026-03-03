/**
 * ApporteurPlanningCard - Planning semaine des RDV pour l'apporteur
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  useApporteurPlanning, 
  PlanningEvent,
  formatTime, 
  getWeekDays,
  formatWeekRange
} from '../hooks/useApporteurPlanning';
import { 
  useApporteurDossiers, 
  DossierRow, 
  STATUS_CONFIG, 
  formatCurrency, 
  formatDate 
} from '../hooks/useApporteurDossiers';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  MapPin,
  User,
  Loader2,
  AlertTriangle,
  FolderOpen,
  FileText,
  Receipt,
  Euro,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEPPER_STEPS_ORDERED, STEPPER_LABELS, type StepperStep } from '../types/apporteur-dossier-v2';

const DAY_NAMES_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const TYPE_COLORS: Record<string, string> = {
  rt: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  travaux: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  depannage: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  sav: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
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

/** Mini stepper for dossier detail */
function DossierStepper({ dossier }: { dossier: DossierRow }) {
  // Determine completed steps from dossier dates
  const completedSteps: StepperStep[] = [];
  if (dossier.dateCreation) completedSteps.push('created');
  if (dossier.datePremierRdv) completedSteps.push('rdv_planned');
  if (dossier.dateDevisEnvoye) completedSteps.push('devis_sent');
  if (dossier.dateDevisValide) completedSteps.push('devis_validated');
  if (dossier.dateFacture) completedSteps.push('invoice_sent');
  if (dossier.dateReglement) completedSteps.push('invoice_paid');

  const stepDates: Record<StepperStep, string | null> = {
    created: dossier.dateCreation,
    rdv_planned: dossier.datePremierRdv,
    devis_sent: dossier.dateDevisEnvoye,
    devis_validated: dossier.dateDevisValide,
    invoice_sent: dossier.dateFacture,
    invoice_paid: dossier.dateReglement,
  };

  return (
    <div className="space-y-1.5">
      {STEPPER_STEPS_ORDERED.map((step) => {
        const done = completedSteps.includes(step);
        return (
          <div key={step} className="flex items-center gap-2">
            {done ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className={cn("text-sm flex-1", done ? "text-foreground" : "text-muted-foreground")}>
              {STEPPER_LABELS[step]}
            </span>
            <span className="text-xs text-muted-foreground">
              {stepDates[step] ? formatDate(stepDates[step]) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ApporteurPlanningCard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<PlanningEvent | null>(null);
  
  const { data, isLoading, error } = useApporteurPlanning({ weekOffset });
  const { data: dossiersData } = useApporteurDossiers();

  const events = data?.data?.events || [];
  const week = data?.data?.week;
  const dossiers = dossiersData?.data?.dossiers || [];

  // Index dossiers by projectId for quick lookup
  const dossiersById = useMemo(() => {
    const map = new Map<number, DossierRow>();
    for (const d of dossiers) map.set(d.id, d);
    return map;
  }, [dossiers]);

  // Group events by day
  const eventsByDay: Record<string, PlanningEvent[]> = {};
  for (const event of events) {
    if (!eventsByDay[event.date]) {
      eventsByDay[event.date] = [];
    }
    eventsByDay[event.date].push(event);
  }

  const selectedDossier = selectedEvent ? dossiersById.get(selectedEvent.projectId) : null;

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

      {/* Dossier Detail Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              Dossier {selectedEvent?.projectRef}
            </SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="space-y-5 mt-4">
              {/* RDV info */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">RDV sélectionné</p>
                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(selectedEvent.type)}>
                    {selectedEvent.typeLabel}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
                      weekday: 'short', day: 'numeric', month: 'long'
                    })}
                  </div>
                  {selectedEvent.time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatTime(selectedEvent.time)}
                    </div>
                  )}
                  {selectedEvent.technicianName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedEvent.technicianName}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedEvent.city || '—'}
                  </div>
                </div>
              </div>

              {/* Client info */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</p>
                <p className="font-semibold text-lg">{selectedEvent.clientName}</p>
                {selectedDossier && (
                  <p className="text-sm text-muted-foreground">
                    {selectedDossier.address ? `${selectedDossier.address}, ` : ''}{selectedDossier.city}
                  </p>
                )}
              </div>

              {/* Status */}
              {selectedDossier && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">État du dossier</p>
                    <Badge className={cn(
                      STATUS_CONFIG[selectedDossier.status]?.bgColor,
                      STATUS_CONFIG[selectedDossier.status]?.color
                    )}>
                      {selectedDossier.statusLabel}
                    </Badge>
                  </div>

                  {/* Stepper */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avancement</p>
                    <DossierStepper dossier={selectedDossier} />
                  </div>

                  {/* Financials */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Financier</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Devis HT</span>
                        </div>
                        <p className="font-semibold">
                          {selectedDossier.devisHT > 0 ? formatCurrency(selectedDossier.devisHT) : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Facturé HT</span>
                        </div>
                        <p className="font-semibold">
                          {selectedDossier.factureHT > 0 ? formatCurrency(selectedDossier.factureHT) : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border p-2.5 text-center col-span-2">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Reste dû</span>
                        </div>
                        <p className={cn(
                          "font-semibold",
                          selectedDossier.restedu > 0 ? "text-foreground" : "text-foreground"
                        )}>
                          {selectedDossier.restedu > 0 
                            ? formatCurrency(selectedDossier.restedu) 
                            : selectedDossier.factureHT > 0 ? 'Soldé ✓' : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!selectedDossier && (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Détails du dossier non disponibles
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
