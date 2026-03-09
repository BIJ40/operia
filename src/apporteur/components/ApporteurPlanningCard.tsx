/**
 * ApporteurPlanningCard — Planning hebdomadaire des RDV
 * Affiche les RDV sous forme de semaine avec navigation, matin/après-midi.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useApporteurPlanning,
  PlanningEvent,
} from '../hooks/useApporteurPlanning';
import {
  useApporteurDossiers,
  DossierRow,
  STATUS_CONFIG,
  formatCurrency,
  formatDate,
} from '../hooks/useApporteurDossiers';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  Loader2,
  AlertTriangle,
  FolderOpen,
  FileText,
  Receipt,
  Euro,
  CheckCircle2,
  Circle,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEPPER_STEPS_ORDERED, STEPPER_LABELS, type StepperStep } from '../types/apporteur-dossier-v2';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/** Local YYYY-MM-DD (avoid UTC offset issues with toISOString) */
function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTimeSlot(time: string | null): 'matin' | 'apres-midi' {
  if (!time) return 'matin';
  const hour = parseInt(time.split(':')[0] || '8', 10);
  return hour < 13 ? 'matin' : 'apres-midi';
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 4);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${weekStart.getDate()} – ${weekEnd.getDate()} ${MONTHS_FR[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  return `${weekStart.getDate()} ${MONTHS_FR[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTHS_FR[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
}

const TYPE_COLORS: Record<string, string> = {
  rt: 'border-l-[hsl(var(--ap-info))]',
  travaux: 'border-l-primary',
  depannage: 'border-l-secondary',
  sav: 'border-l-[hsl(var(--ap-warning))]',
  default: 'border-l-muted-foreground',
};

function getTypeBorderColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('rt') || t.includes('relev')) return TYPE_COLORS.rt;
  if (t.includes('tvx') || t.includes('travaux')) return TYPE_COLORS.travaux;
  if (t.includes('depan') || t.includes('dépan')) return TYPE_COLORS.depannage;
  if (t.includes('sav')) return TYPE_COLORS.sav;
  return TYPE_COLORS.default;
}

// ─── Stepper (detail sheet) ──────────────────────────────────────────────────

function DossierStepper({ dossier }: { dossier: DossierRow }) {
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
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--ap-success))] shrink-0" />
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

// ─── Event Card ──────────────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: PlanningEvent; onClick: () => void }) {
  return (
    <div
      className={cn(
        "border-l-[3px] rounded-md bg-card px-2.5 py-1.5 cursor-pointer transition-all hover:shadow-sm hover:bg-muted/50 text-left w-full",
        getTypeBorderColor(event.type)
      )}
      onClick={onClick}
    >
      <p className="text-sm font-semibold text-foreground truncate leading-tight">
        {event.clientName}
      </p>
      <p className="text-[11px] text-muted-foreground font-mono truncate">
        {event.projectRef}
      </p>
      {event.technicianName && (
        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
          <User className="w-3 h-3 shrink-0" />
          {event.technicianName}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ApporteurPlanningCard() {
  const [selectedEvent, setSelectedEvent] = useState<PlanningEvent | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const { data, isLoading, error } = useApporteurPlanning();
  const { data: dossiersData } = useApporteurDossiers();

  const events = data?.data?.events || [];
  const dossiers = dossiersData?.data?.dossiers || [];

  const dossiersById = useMemo(() => {
    const map = new Map<number, DossierRow>();
    for (const d of dossiers) map.set(d.id, d);
    return map;
  }, [dossiers]);

  // Current week days (Mon-Fri)
  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => addDays(getWeekStart(today), weekOffset * 7), [today, weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Group events by day + slot
  const eventsByDaySlot = useMemo(() => {
    const map = new Map<string, { matin: PlanningEvent[]; 'apres-midi': PlanningEvent[] }>();

    for (const day of weekDays) {
      const key = toLocalDateKey(day);
      map.set(key, { matin: [], 'apres-midi': [] });
    }

    for (const ev of events) {
      const evDate = new Date(ev.date);
      const key = ev.date;
      const bucket = map.get(key);
      if (bucket) {
        const slot = getTimeSlot(ev.time);
        bucket[slot].push(ev);
      }
    }

    return map;
  }, [events, weekDays]);

  // Count events this week
  const weekEventCount = useMemo(() => {
    let count = 0;
    for (const bucket of eventsByDaySlot.values()) {
      count += bucket.matin.length + bucket['apres-midi'].length;
    }
    return count;
  }, [eventsByDaySlot]);

  const selectedDossier = selectedEvent ? dossiersById.get(selectedEvent.projectId) : null;

  const goToCurrentWeek = () => setWeekOffset(0);

  if (error || data?.error === 'non_raccorde') {
    return (
      <Card className="border-[hsl(var(--ap-warning)/.4)] bg-[hsl(var(--ap-warning-light))]">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--ap-warning))]" />
            <span className="text-foreground">Planning indisponible</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Planning RDV
              {weekEventCount > 0 && (
                <Badge variant="secondary" className="text-xs">{weekEventCount}</Badge>
              )}
            </CardTitle>

            {/* Week navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWeekOffset(o => o - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                variant={weekOffset === 0 ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs px-3 min-w-[180px] font-medium"
                onClick={goToCurrentWeek}
              >
                {weekOffset === 0 ? "Cette semaine" : formatWeekLabel(weekStart)}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWeekOffset(o => o + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Week date range subtitle when on current week */}
          {weekOffset === 0 && (
            <p className="text-xs text-muted-foreground mt-1">{formatWeekLabel(weekStart)}</p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-px bg-border rounded-lg overflow-hidden">
              {weekDays.map((day, dayIdx) => {
                const key = toLocalDateKey(day);
                const bucket = eventsByDaySlot.get(key) || { matin: [], 'apres-midi': [] };
                const isToday = isSameDay(day, new Date());
                const dayNum = day.getDate();

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "bg-card flex flex-col min-h-[180px]",
                      isToday && "bg-primary/[0.03]"
                    )}
                  >
                    {/* Day header */}
                    <div className={cn(
                      "text-center py-1.5 border-b",
                      isToday ? "bg-primary text-primary-foreground" : "bg-muted/50"
                    )}>
                      <p className="text-[11px] font-medium uppercase tracking-wide">
                        {DAYS_FR[dayIdx]}
                      </p>
                      <p className={cn("text-lg font-bold leading-none", isToday ? "text-primary-foreground" : "text-foreground")}>
                        {dayNum}
                      </p>
                    </div>

                    {/* Matin */}
                    <div className="flex-1 p-1.5 space-y-1 border-b border-dashed">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Sun className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">Matin</span>
                      </div>
                      {bucket.matin.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground/50 text-center py-2">—</p>
                      ) : (
                        bucket.matin.map(ev => (
                          <EventCard key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} />
                        ))
                      )}
                    </div>

                    {/* Après-midi */}
                    <div className="flex-1 p-1.5 space-y-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Moon className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">Après-midi</span>
                      </div>
                      {bucket['apres-midi'].length === 0 ? (
                        <p className="text-[10px] text-muted-foreground/50 text-center py-2">—</p>
                      ) : (
                        bucket['apres-midi'].map(ev => (
                          <EventCard key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} />
                        ))
                      )}
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
              Dossier — {selectedEvent?.clientName || selectedEvent?.projectRef}
            </SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="space-y-5 mt-4">
              {/* RDV info */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">RDV sélectionné</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
                      weekday: 'short', day: 'numeric', month: 'long'
                    })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getTimeSlot(selectedEvent.time) === 'matin' ? (
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    {getTimeSlot(selectedEvent.time) === 'matin' ? 'Matin' : 'Après-midi'}
                  </div>
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
                <p className="text-xs text-muted-foreground font-mono">Réf. {selectedEvent.projectRef}</p>
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

              {/* Status + Stepper + Financials */}
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

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avancement</p>
                    <DossierStepper dossier={selectedDossier} />
                  </div>

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
                        <p className="font-semibold">
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
