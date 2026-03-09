/**
 * ApporteurPlanningCard - Tous les prochains RDV chronologiques
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const TYPE_COLORS: Record<string, string> = {
  rt: 'bg-[hsl(var(--ap-info-light))] text-[hsl(var(--ap-info))]',
  travaux: 'bg-primary/10 text-primary',
  depannage: 'bg-secondary/10 text-secondary',
  sav: 'bg-[hsl(var(--ap-warning-light))] text-[hsl(var(--ap-warning))]',
  default: 'bg-muted text-muted-foreground',
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

export function ApporteurPlanningCard() {
  const [selectedEvent, setSelectedEvent] = useState<PlanningEvent | null>(null);
  
  const { data, isLoading, error } = useApporteurPlanning();
  const { data: dossiersData } = useApporteurDossiers();

  const events = data?.data?.events || [];
  const dossiers = dossiersData?.data?.dossiers || [];

  // Index dossiers by projectId for quick lookup
  const dossiersById = useMemo(() => {
    const map = new Map<number, DossierRow>();
    for (const d of dossiers) map.set(d.id, d);
    return map;
  }, [dossiers]);

  // Sort all events chronologically and take next 10
  const next10Events = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter(e => {
        const eventDate = new Date(`${e.date}T${e.time || '00:00'}`);
        return eventDate >= now;
      })
      .sort((a, b) => {
        const da = `${a.date}T${a.time || '00:00'}`;
        const db = `${b.date}T${b.time || '00:00'}`;
        return da.localeCompare(db);
      })
      .slice(0, 10);
  }, [events]);

  const selectedDossier = selectedEvent ? dossiersById.get(selectedEvent.projectId) : null;

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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Prochains RDV
            {next10Events.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-auto">{next10Events.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : next10Events.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Aucun RDV planifié à venir
            </p>
          ) : (
            <div className="space-y-1">
              {next10Events.map((event) => {
                const d = new Date(event.date);
                const isToday = event.date === new Date().toISOString().split('T')[0];
                const dayLabel = d.toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all hover:bg-muted/50",
                      isToday && "bg-primary/5"
                    )}
                    onClick={() => setSelectedEvent(event)}
                  >
                    {/* Date */}
                    <span className={cn(
                      "text-xs font-medium w-20 shrink-0 capitalize",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}>
                      {isToday ? "Aujourd'hui" : dayLabel}
                    </span>

                    {/* Time */}
                    {event.time && (
                      <span className="text-xs font-mono text-muted-foreground shrink-0 w-12">
                        {formatTime(event.time)}
                      </span>
                    )}

                    {/* Client name */}
                    <span className="text-sm font-medium truncate flex-1 text-foreground">
                      {event.clientName}
                    </span>

                    {/* Type badge */}
                    <Badge className={cn("text-[10px] shrink-0", getTypeColor(event.type))}>
                      {event.typeLabel}
                    </Badge>
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
