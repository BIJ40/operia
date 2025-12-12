import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";
import { addWeeks, subWeeks, isSameDay } from "date-fns";

import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/config/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { useApogeeUsers } from "@/shared/api/apogee/useApogeeUsers";
import { usePlanningCreneaux } from "@/shared/api/apogee/usePlanningCreneaux";
import { buildUserMap, toEvents } from "@/shared/planning/planningMapper";
import { getWeekRange, formatWeekRange, buildLunchBreakBlocks, getWeekDays } from "@/shared/planning/weekUtils";
import { computeWeeklyWorkMinutes, formatMinutes } from "@/shared/planning/workTime";
import type { PlanningEvent } from "@/shared/types/apogeePlanning";
import { AgencyProvider } from "@/apogee-connect/contexts/AgencyContext";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";

// Heures affichées dans la grille
const START_HOUR = 7;
const END_HOUR = 19;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

function getEventStyle(refType: string, customColor?: string): { bg: string; border: string; text: string } {
  switch (refType) {
    case "visite-interv":
      return {
        bg: customColor || "hsl(var(--primary))",
        border: customColor || "hsl(var(--primary))",
        text: "#ffffff",
      };
    case "conge":
      return {
        bg: "hsl(var(--warning) / 0.2)",
        border: "hsl(var(--warning))",
        text: "hsl(var(--warning-foreground))",
      };
    case "rappel":
      return {
        bg: "hsl(var(--accent) / 0.3)",
        border: "hsl(var(--accent))",
        text: "hsl(var(--accent-foreground))",
      };
    case "pause":
      return {
        bg: "hsl(var(--muted))",
        border: "hsl(var(--muted-foreground) / 0.3)",
        text: "hsl(var(--muted-foreground))",
      };
    default:
      return {
        bg: "hsl(var(--secondary))",
        border: "hsl(var(--secondary))",
        text: "hsl(var(--secondary-foreground))",
      };
  }
}

function EventBlock({ event, dayStart }: { event: PlanningEvent; dayStart: Date }) {
  const style = getEventStyle(event.refType, event.color);
  
  // Calculer position et hauteur
  const eventStart = new Date(Math.max(event.start.getTime(), dayStart.getTime()));
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(END_HOUR, 0, 0, 0);
  const eventEnd = new Date(Math.min(event.end.getTime(), dayEnd.getTime()));
  
  const dayStartMinutes = START_HOUR * 60;
  const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
  const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
  
  const topPercent = ((startMinutes - dayStartMinutes) / TOTAL_MINUTES) * 100;
  const heightPercent = ((endMinutes - startMinutes) / TOTAL_MINUTES) * 100;
  
  if (heightPercent <= 0) return null;
  
  const startTime = `${String(eventStart.getHours()).padStart(2, "0")}:${String(eventStart.getMinutes()).padStart(2, "0")}`;
  const endTime = `${String(eventEnd.getHours()).padStart(2, "0")}:${String(eventEnd.getMinutes()).padStart(2, "0")}`;
  
  return (
    <div
      className="absolute left-1 right-1 rounded-md px-2 py-1 text-xs overflow-hidden"
      style={{
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
        minHeight: "20px",
        backgroundColor: style.bg,
        borderLeft: `3px solid ${style.border}`,
        color: style.text,
      }}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="opacity-80 text-[10px]">{startTime} - {endTime}</div>
      {event.refType !== "pause" && (
        <Badge variant="outline" className="mt-0.5 text-[9px] px-1 py-0">
          {event.refType}
        </Badge>
      )}
    </div>
  );
}

function WeekGrid({
  events,
  weekStart,
}: {
  events: PlanningEvent[];
  weekStart: Date;
}) {
  const weekDays = getWeekDays(weekStart);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  
  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Header avec jours */}
      <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b bg-muted/50">
        <div className="p-2 text-xs font-medium text-muted-foreground">Heure</div>
        {weekDays.map((day) => (
          <div key={day.label} className="p-2 text-center border-l">
            <div className="font-medium text-sm capitalize">{day.label}</div>
          </div>
        ))}
      </div>
      
      {/* Grille horaire */}
      <div className="grid grid-cols-[60px_repeat(5,1fr)]">
        {/* Colonne heures */}
        <div className="border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-12 border-b text-xs text-muted-foreground flex items-start justify-end pr-2 pt-1"
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        
        {/* Colonnes jours */}
        {weekDays.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.start, day.date));
          const dayStart = new Date(day.date);
          dayStart.setHours(START_HOUR, 0, 0, 0);
          
          return (
            <div key={day.label} className="relative border-l">
              {/* Lignes horaires */}
              {hours.map((hour) => (
                <div key={hour} className="h-12 border-b border-dashed border-muted" />
              ))}
              
              {/* Events */}
              {dayEvents.map((event) => (
                <EventBlock key={event.id} event={event} dayStart={dayStart} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanningTechnicienHebdoContent() {
  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [selectedTechId, setSelectedTechId] = useState<number | undefined>(undefined);
  
  const { users, loading: loadingUsers } = useApogeeUsers();
  const { creneaux, loading: loadingCreneaux } = usePlanningCreneaux();
  
  const isLoading = loadingUsers || loadingCreneaux;
  
  // Mapper les events (même si users est vide, on a quand même les userIds)
  const allEvents = useMemo(() => {
    const userMap = buildUserMap(users);
    return toEvents(creneaux, userMap);
  }, [users, creneaux]);
  
  // Liste techniciens avec filtre robuste + fallback "tous les techniciens"
  const { techniciansAll, techniciansActive, techniciens } = useMemo(() => {
    console.log("[PLANNING] users length:", users?.length);
    console.log("[PLANNING] first user:", users?.[0]);

    const norm = (v: any) => String(v ?? "").trim().toLowerCase();

    const isActive = (u: any) => {
      const v = u?.is_on ?? u?.isOn ?? u?.is_active ?? u?.isActive;
      return v === true || v === 1 || v === "1" || norm(v) === "true";
    };

    const isTech = (u: any) => norm(u?.type) === "technicien";

    const techniciansAll = (users ?? []).filter(isTech);
    const techniciansActive = techniciansAll.filter(isActive);

    console.log(
      "[PLANNING] techsAll:",
      techniciansAll.map((u: any) => ({ id: u.id, type: u.type, is_on: u.is_on, isOn: u.isOn }))
    );
    console.log(
      "[PLANNING] techsActive:",
      techniciansActive.map((u: any) => ({ id: u.id, type: u.type, is_on: u.is_on, isOn: u.isOn }))
    );

    const technicians = techniciansActive.length > 0 ? techniciansActive : techniciansAll;

    const techniciens = technicians.map((u: any) => ({
      id: u.id,
      label:
        `${(u.firstname ?? "").trim()} ${(u.name ?? "").trim()}`.trim() || `#${u.id}`,
      color:
        u.data?.bgcolor?.hex ||
        u.bgcolor?.hex ||
        u.data?.color?.hex ||
        u.color?.hex ||
        "#808080",
    }));

    return { techniciansAll, techniciansActive, techniciens };
  }, [users]);
  
  // Semaine courante
  const { weekStart, weekEnd } = useMemo(() => getWeekRange(weekDate), [weekDate]);
  const weekLabel = useMemo(() => formatWeekRange(weekStart, weekEnd), [weekStart, weekEnd]);
  
  // Filtrer par technicien et semaine
  const filteredEvents = useMemo(() => {
    if (!selectedTechId) return [];
    
    return allEvents.filter((e) => {
      if (e.userId !== selectedTechId) return false;
      // Event dans la semaine
      return e.start >= weekStart && e.start <= weekEnd;
    });
  }, [allEvents, selectedTechId, weekStart, weekEnd]);
  
  // Ajouter les pauses méridiane
  const eventsWithLunch = useMemo(() => {
    const lunchBlocks = buildLunchBreakBlocks(weekStart);
    return [...filteredEvents, ...lunchBlocks];
  }, [filteredEvents, weekStart]);
  
  // Temps de travail hebdo
  const workMinutes = useMemo(() => {
    return computeWeeklyWorkMinutes(filteredEvents, weekStart);
  }, [filteredEvents, weekStart]);
  
  const goToPrevWeek = () => setWeekDate((d) => subWeeks(d, 1));
  const goToNextWeek = () => setWeekDate((d) => addWeeks(d, 1));
  const goToCurrentWeek = () => setWeekDate(new Date());
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning Hebdomadaire"
        backTo={ROUTES.pilotage.rhTech}
        backLabel="Retour RH Tech"
      />
      
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Sélecteur technicien */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Technicien :</label>
            {isLoading ? (
              <Skeleton className="h-10 w-[250px]" />
            ) : (
              <Select
                value={selectedTechId?.toString() ?? ""}
                onValueChange={(v) => setSelectedTechId(v ? Number(v) : undefined)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Sélectionner un technicien" />
                </SelectTrigger>
                <SelectContent>
                  {techniciens.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <div className="flex items-center gap-2">
                        {t.color && (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                        )}
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {(techniciens?.length ?? 0) === 0 && (
            <div className="text-xs text-destructive mt-2">
              Aucun technicien trouvé (vérifier la structure de apiGetUsers dans la console).
            </div>
          )}

          {(techniciens?.length ?? 0) > 0 && techniciansActive.length === 0 && (
            <div className="text-xs text-amber-600 mt-2">
              Attention: aucun technicien marqué actif, affichage de tous les techniciens (fallback).
            </div>
          )}
        </div>

        {/* Navigation semaine */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            <Calendar className="h-4 w-4 mr-2" />
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium">{weekLabel}</span>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        {/* Grille planning */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planning de la semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTechId ? (
              <div className="text-center py-12 text-muted-foreground">
                Sélectionnez un technicien pour afficher son planning
              </div>
            ) : isLoading ? (
              <Skeleton className="h-[600px] w-full" />
            ) : (
              <WeekGrid events={eventsWithLunch} weekStart={weekStart} />
            )}
          </CardContent>
        </Card>
        
        {/* Sidebar - Temps de travail */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Temps de travail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedTechId ? (
                <p className="text-sm text-muted-foreground">--</p>
              ) : (
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-primary">
                    {formatMinutes(workMinutes)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total hebdomadaire (hors pause méridienne)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Légende */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Légende</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--primary))" }} />
                <span className="text-sm">Intervention</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--warning) / 0.3)" }} />
                <span className="text-sm">Congé</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--accent) / 0.3)" }} />
                <span className="text-sm">Rappel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--muted))" }} />
                <span className="text-sm">Pause méridienne</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PlanningTechnicienHebdo() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <PlanningTechnicienHebdoContent />
      </AgencyProvider>
    </ApiToggleProvider>
  );
}

