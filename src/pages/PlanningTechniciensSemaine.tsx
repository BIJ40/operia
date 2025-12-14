import { useState, useMemo, useEffect } from "react";
import { startOfWeek, addDays, format, addWeeks, subWeeks, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, AlertCircle, Printer, Send, CheckCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlanningSignature } from "@/apogee-connect/hooks/usePlanningSignature";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { usePlanningData, useApogeeUsersNormalized } from "@/shared/api/apogee/usePlanningData";
import { buildTechOptions, buildEvents, type PlanningEvent } from "@/shared/planning/events";
import { buildLunchBlocks, computeWeeklyWorkMinutes, formatMinutes, getWeekDays } from "@/shared/planning/time";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { AgencyProvider } from "@/apogee-connect/contexts/AgencyContext";

// Constantes grille
const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_HEIGHT = 48; // px par heure (réduit à l'impression via CSS)
const PRINT_HOUR_HEIGHT = 38; // px par heure à l'impression (compact)
const TOTAL_HOURS = HOUR_END - HOUR_START;

// Clés de persistance (sessionStorage)
const STORAGE_KEY_SELECTED_TECH = "planning-tech-week-selected-tech";
const STORAGE_KEY_WEEK_START = "planning-tech-week-start";

function getEventColor(refType: string): string {
  switch (refType) {
    case "visite-interv":
      return "hsl(var(--primary))";
    case "conge":
      return "hsl(var(--destructive))";
    case "rappel":
      return "hsl(var(--warning, 38 92% 50%))";
    case "pause":
      return "hsl(var(--muted))";
    default:
      return "hsl(var(--secondary))";
  }
}

function getEventTextColor(refType: string): string {
  switch (refType) {
    case "visite-interv":
      return "hsl(var(--primary-foreground))";
    case "conge":
      return "hsl(var(--destructive-foreground))";
    default:
      return "hsl(var(--foreground))";
  }
}

interface EventBlockProps {
  event: PlanningEvent;
  dayStart: Date;
}

function EventBlock({ event, dayStart }: EventBlockProps) {
  const startMinutes = (event.start.getHours() - HOUR_START) * 60 + event.start.getMinutes();
  const durationMinutes = Math.round((event.end.getTime() - event.start.getTime()) / 60_000);
  
  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);
  
  // Ne pas afficher si hors plage horaire
  if (startMinutes < 0 || startMinutes >= TOTAL_HOURS * 60) return null;
  
  const timeStr = `${format(event.start, "HH:mm")} - ${format(event.end, "HH:mm")}`;
  
  // Construire le label client (nom + ville)
  const clientLabel = [event.clientName, event.clientCity].filter(Boolean).join(" - ");
  
  // Tooltip complet
  const tooltipParts = [event.title, clientLabel, timeStr].filter(Boolean);
  
  return (
    <div
      className="absolute left-1 right-1 rounded-md px-2 py-1 text-xs overflow-hidden shadow-sm border border-white/20 planning-event"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: getEventColor(event.refType),
        color: getEventTextColor(event.refType),
      }}
      title={tooltipParts.join("\n")}
    >
      <div className="font-medium truncate">{event.title}</div>
      {clientLabel && height > 30 && (
        <div className="opacity-90 truncate text-[10px]">{clientLabel}</div>
      )}
      {height > 50 && <div className="opacity-80 truncate">{timeStr}</div>}
    </div>
  );
}

interface LunchBlockProps {
  dayStart: Date;
}

function LunchBlock({ dayStart }: LunchBlockProps) {
  const top = (12 - HOUR_START) * HOUR_HEIGHT;
  const height = HOUR_HEIGHT;
  
  return (
    <div
      className="absolute left-0 right-0 bg-muted/60 border-y border-muted-foreground/20 planning-lunch"
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div className="text-xs text-muted-foreground text-center pt-4">
        Pause méridienne
      </div>
    </div>
  );
}

interface DayColumnProps {
  day: Date;
  events: PlanningEvent[];
  showLunch: boolean;
}

function DayColumn({ day, events, showLunch }: DayColumnProps) {
  const dayEvents = events.filter((e) => isSameDay(e.start, day));
  const isToday = isSameDay(day, new Date());
  
  return (
    <div className="flex-1 min-w-[120px]">
      {/* Header jour */}
      <div
        className={`text-center py-2 border-b font-medium text-sm ${
          isToday ? "bg-primary/10 text-primary" : "bg-muted/30"
        }`}
      >
        <div>{format(day, "EEEE", { locale: fr })}</div>
        <div className="text-lg">{format(day, "d")}</div>
      </div>
      
      {/* Grille horaire */}
      <div
        className="relative border-r border-border/50 planning-grid"
        style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
      >
        {/* Lignes horaires */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-border/30 planning-hour-cell"
            style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          />
        ))}
        
        {/* Pause méridienne */}
        {showLunch && <LunchBlock dayStart={day} />}
        
        {/* Événements */}
        {dayEvents.map((event) => (
          <EventBlock key={event.id} event={event} dayStart={day} />
        ))}
      </div>
    </div>
  );
}

// Composant pour afficher la signature dans le print header
function PrintSignatureBox({ 
  techId, 
  weekDate 
}: { 
  techId: number; 
  weekDate: Date; 
}) {
  const { signature, isSignedByTech } = usePlanningSignature({ techId, weekDate });
  
  if (isSignedByTech && signature?.tech_signature_png && signature?.tech_signed_at) {
    const signedDate = format(new Date(signature.tech_signed_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
    return (
      <span className="hidden print:inline-flex items-center gap-2 text-sm ml-4">
        <span>Signé le {signedDate}</span>
        <span className="ml-4">Signature :</span>
        <span className="border border-black w-32 h-10 inline-flex items-center justify-center">
          <img 
            src={signature.tech_signature_png.startsWith('data:') 
              ? signature.tech_signature_png 
              : `data:image/png;base64,${signature.tech_signature_png}`}
            alt="Signature"
            className="max-h-9 max-w-28 object-contain"
          />
        </span>
      </span>
    );
  }
  
  // Pas de signature : cadre vide avec champs à remplir
  return (
    <span className="hidden print:inline-flex items-center gap-2 text-sm ml-4">
      <span>Signé le</span>
      <span className="border-b border-black w-32 inline-block">&nbsp;</span>
      <span className="ml-4">Signature :</span>
      <span className="border border-black w-32 h-10 inline-block align-middle">&nbsp;</span>
    </span>
  );
}

// Composant signature N2 pour le planning
function PlanningSignatureN2Section({ 
  techId, 
  weekDate,
}: { 
  techId: number; 
  weekDate: Date;
}) {
  const { 
    signature, 
    isSent, 
    isSignedByTech, 
    sendToTech, 
    cancelSend,
    isSending,
    isCancelling,
    isLoading 
  } = usePlanningSignature({ techId, weekDate });

  if (isLoading) {
    return <div className="h-8 w-40 bg-muted animate-pulse rounded" />;
  }

  // État 3: Signé par le tech
  if (isSignedByTech && signature?.tech_signed_at) {
    return (
      <Badge variant="default" className="bg-emerald-600 text-white">
        <CheckCircle className="w-3 h-3 mr-1" />
        Signé le {format(new Date(signature.tech_signed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
      </Badge>
    );
  }

  // État 2: Envoyé, en attente signature tech
  if (isSent && signature?.sent_at) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="w-3 h-3 mr-1" />
          En attente signature
        </Badge>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => cancelSend()}
          disabled={isCancelling}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Annuler"}
        </Button>
      </div>
    );
  }

  // État 1: Non envoyé
  return (
    <Button
      onClick={() => sendToTech()}
      disabled={isSending}
      size="sm"
      variant="outline"
      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
    >
      {isSending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Send className="w-4 h-4 mr-2" />
      )}
      Envoyer au technicien
    </Button>
  );
}

function PlanningTechniciensSemaineContent() {
  const [selectedTechId, setSelectedTechId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY_SELECTED_TECH);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    if (typeof window === "undefined") {
      return startOfWeek(new Date(), { weekStartsOn: 1 });
    }
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY_WEEK_START);
      if (stored) {
        const parsed = new Date(stored);
        if (!isNaN(parsed.getTime())) {
          return startOfWeek(parsed, { weekStartsOn: 1 });
        }
      }
    } catch {
      // ignore storage errors
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  
  const { users, loading: usersLoading, error: usersError } = useApogeeUsersNormalized();
  const { creneaux, loading: creneauxLoading, error: creneauxError } = usePlanningData();
  
  const techOptions = useMemo(() => buildTechOptions(users), [users]);
  
  const weekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [currentWeekStart]);
  
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  
  const events = useMemo(
    () => buildEvents(creneaux, selectedTechId ?? undefined, currentWeekStart, weekEnd),
    [creneaux, selectedTechId, currentWeekStart, weekEnd]
  );
  
  // Debug: log events pour comprendre le calcul des heures
  console.log('[PlanningTechniciens] events count:', events.length, 'filtered by tech:', selectedTechId);
  
  const workMinutes = useMemo(
    () => computeWeeklyWorkMinutes(events, currentWeekStart),
    [events, currentWeekStart]
  );
  
  console.log('[PlanningTechniciens] workMinutes computed:', workMinutes, 'from', events.filter(e => e.refType === 'visite-interv').length, 'work events');
  
  // Trouver le nom du technicien sélectionné
  const selectedTechLabel = useMemo(() => {
    if (!selectedTechId) return null;
    const tech = techOptions.find((t) => t.id === selectedTechId);
    return tech ? tech.label : null;
  }, [selectedTechId, techOptions]);
  
  const selectedTechColor = useMemo(() => {
    if (!selectedTechId) return null;
    const tech = techOptions.find((t) => t.id === selectedTechId);
    return tech?.color ?? null;
  }, [selectedTechId, techOptions]);
  
  // Persister les filtres dans la session (pour éviter le reset au changement d'onglet)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (selectedTechId != null) {
        window.sessionStorage.setItem(STORAGE_KEY_SELECTED_TECH, String(selectedTechId));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY_SELECTED_TECH);
      }
    } catch {
      // ignore storage errors
    }
  }, [selectedTechId]);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY_WEEK_START, currentWeekStart.toISOString());
    } catch {
      // ignore storage errors
    }
  }, [currentWeekStart]);
  
  const handlePrevWeek = () => setCurrentWeekStart((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const weekLabel = `${format(currentWeekStart, "d MMM", { locale: fr })} - ${format(
    addDays(currentWeekStart, 4),
    "d MMM yyyy",
    { locale: fr }
  )}`;
  
  const isLoading = usersLoading || creneauxLoading;
  const hasError = usersError || creneauxError;
  
  return (
    <div className="container mx-auto py-6 space-y-6 print:py-0 print:space-y-2 print:max-w-none print:w-full">
      {/* Styles d'impression */}
      <style>
        {`
          @media print {
            @page {
              size: landscape;
              margin: 5mm;
            }
            body, html {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            header, nav, aside, footer, .print\\:hidden {
              display: none !important;
            }
            #print-header, #print-header * {
              display: flex !important;
            }
            .print-only {
              display: flex !important;
            }
            /* Compacter tout le planning pour tenir sur 1 page */
            .planning-print-container {
              transform: scale(0.78);
              transform-origin: top left;
            }
            .planning-lunch {
              display: none !important;
            }
            .planning-event {
              font-size: 10px !important;
              padding: 1px 3px !important;
            }
          }
        `}
      </style>
      
      <div className="print:hidden">
        <PageHeader
          title="Planning Techniciens"
          subtitle="Vue hebdomadaire des interventions"
          backTo="/rh/equipe"
          backLabel="Mon équipe"
        />
      </div>
      
      {/* Contrôles */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Sélection technicien */}
            <div className="flex-1 min-w-[200px] max-w-[300px]">
              <Select
                value={selectedTechId?.toString() ?? "all"}
                onValueChange={(v) => setSelectedTechId(v === "all" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un technicien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les techniciens</SelectItem>
                  {techOptions.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id.toString()}>
                      <div className="flex items-center gap-2">
                        {tech.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tech.color }}
                          />
                        )}
                        {tech.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {techOptions.length === 0 && !usersLoading && (
                <p className="text-xs text-destructive mt-1">
                  Aucun technicien trouvé
                </p>
              )}
            </div>
            
            {/* Navigation semaine avec flèches et label */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground min-w-[160px] text-center">
                {weekLabel}
              </span>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Bouton imprimer */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              title="Imprimer"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Bandeau nom technicien + heures + signature N2 */}
      {selectedTechId && selectedTechLabel && (
        <div className="bg-muted/50 border rounded-lg px-4 py-3 print:bg-white print:border-2 print:py-2" id="print-header">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {selectedTechColor && (
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 print:hidden"
                  style={{ backgroundColor: selectedTechColor }}
                />
              )}
              <span className="font-semibold text-lg">{selectedTechLabel}</span>
              {/* Bloc visible uniquement à l'impression: à ___ le ___ Signature: [signature PNG] */}
              <PrintSignatureBox techId={selectedTechId} weekDate={currentWeekStart} />
            </div>
            
            <div className="flex items-center gap-3 print:hidden">
              {/* Section Signature N2 */}
              <PlanningSignatureN2Section 
                techId={selectedTechId} 
                weekDate={currentWeekStart} 
              />
              
              {/* Heures travaillées */}
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">
                  {formatMinutes(workMinutes)}
                </span>
                <span className="text-sm text-muted-foreground">travaillées</span>
              </div>
            </div>
            
          </div>
        </div>
      )}
      
      {/* Erreurs */}
      {hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des données planning. Veuillez réessayer.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Planning grille */}
      <Card className="planning-print-container">
        <CardContent className="p-0 overflow-x-auto print:overflow-visible">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="flex min-w-[700px]">
              {/* Colonne heures */}
              <div className="w-16 flex-shrink-0 border-r">
                <div className="h-[60px] border-b" /> {/* Espace header */}
                <div style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="text-xs text-muted-foreground text-right pr-2 border-t border-border/30"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      {HOUR_START + i}:00
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Colonnes jours */}
              {weekDays.map((day) => (
                <DayColumn
                  key={day.toISOString()}
                  day={day}
                  events={events}
                  showLunch={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-sm print:hidden">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: getEventColor("visite-interv") }}
          />
          <span>Intervention</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: getEventColor("conge") }}
          />
          <span>Congé</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: getEventColor("rappel") }}
          />
          <span>Tâche</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded bg-muted border"
          />
          <span>Pause méridienne</span>
        </div>
      </div>
    </div>
  );
}

export default function PlanningTechniciensSemaine() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <PlanningTechniciensSemaineContent />
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
