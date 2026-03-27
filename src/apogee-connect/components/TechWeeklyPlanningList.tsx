import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Clock, Printer } from "lucide-react";
import { useWeeklyTechPlanning } from "@/apogee-connect/hooks/useWeeklyTechPlanning";
import { formatMinutesToHours, WeeklyTechPlanning } from "@/apogee-connect/utils/planning";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { stateLabel } from "@/shared/utils/stateLabels";
import { cn } from "@/lib/utils";

interface TechWeeklyPlanningListProps {
  techFilterId?: number;
  showInactiveTechs?: boolean;
}

// NOTE: Composants de signature N1 supprimés (portail salarié supprimé en v0.8.3)

export const TechWeeklyPlanningList: React.FC<TechWeeklyPlanningListProps> = ({
  techFilterId,
  showInactiveTechs = false,
}) => {
  const {
    data,
    isLoading,
    error,
    weekDate,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = useWeeklyTechPlanning(techFilterId, showInactiveTechs);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    console.error("[TechWeeklyPlanningList] Error loading planning:", error);
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Erreur lors du chargement du planning.</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Une erreur inattendue s'est produite."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Aucun planning trouvé pour cette semaine.</p>
        </CardContent>
      </Card>
    );
  }

  const weekLabel = `Semaine du ${format(weekDate, "dd MMMM yyyy", { locale: fr })}`;

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {weekLabel}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {data.length} technicien{data.length > 1 ? "s" : ""} avec planning
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Précédente
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            Suivante
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Tech Planning Cards */}
      {data.map((techWeek: WeeklyTechPlanning) => (
        <Card key={techWeek.techId} className="overflow-hidden print:break-inside-avoid">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {techWeek.color && (
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: techWeek.color }}
                  />
                )}
                <CardTitle className="text-lg">{techWeek.techName}</CardTitle>
                <Badge variant="secondary" className="font-mono">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatMinutesToHours(techWeek.weeklyTotalMinutes)}
                </Badge>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {techWeek.days.map((day) => (
                <div
                  key={day.date}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium text-sm capitalize">{day.label}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {formatMinutesToHours(day.totalMinutes)}
                    </Badge>
                  </div>

                  {day.slots.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Aucun RDV</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {day.slots.map((slot, idx) => {
                        const start = format(new Date(slot.start), "HH:mm");
                        const end = format(new Date(slot.end), "HH:mm");
                        const isBreak = slot.isBreak === true;

                        return (
                          <li
                            key={`${slot.slotId}-${idx}`}
                            className={cn(
                              "rounded px-2 py-1.5 text-xs border",
                              isBreak
                                ? "border-amber-500/40 bg-amber-500/10"
                                : "border-border bg-muted/30"
                            )}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-foreground">
                                {start} - {end}
                              </span>
                              {slot.state && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-[10px] px-1.5 py-0 h-4"
                                >
                                  {stateLabel(slot.state)}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {isBreak ? (
                                <span className="font-medium text-amber-600">Pause</span>
                              ) : (
                                <>
                                  {slot.clientName && (
                                    <div className="font-medium text-foreground truncate">
                                      {slot.clientName}
                                    </div>
                                  )}
                                  {slot.city && (
                                    <div className="text-muted-foreground truncate">
                                      {slot.city}
                                    </div>
                                  )}
                                  {slot.type && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">
                                      {slot.type}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
