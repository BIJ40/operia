import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/config/routes";
import { TechWeeklyPlanningList } from "@/apogee-connect/components/TechWeeklyPlanningList";
import { AgencyProvider, useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { apogeeProxy } from "@/services/apogeeProxy";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeeklyTechPlanning } from "@/apogee-connect/hooks/useWeeklyTechPlanning";

interface TechnicienOption {
  id: number;
  firstname: string;
  name: string;
  color: string | null;
}

function PlanningHebdoContent() {
  const { isAgencyReady } = useAgency();
  const [selectedTechId, setSelectedTechId] = useState<number | undefined>(undefined);

  // Réutiliser les données du hook de planning hebdo pour récupérer les techniciens
  const { planningByTech, isLoading: loadingPlanning } = useWeeklyTechPlanning(undefined, true);

  const techniciensList = useMemo<TechnicienOption[]>(() => {
    if (!planningByTech) return [];

    const list = Object.values(planningByTech).map((tech) => {
      const parts = tech.techName.split(" ");
      const lastName = parts.pop() || "";
      const firstName = parts.join(" ");

      return {
        id: tech.techId,
        firstname: firstName || tech.techName,
        name: lastName,
        color: tech.color || null,
      };
    });

    return list.sort((a, b) => a.firstname.localeCompare(b.firstname));
  }, [planningByTech]);


  if (!isAgencyReady) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Planning Hebdomadaire Techniciens"
        subtitle="Visualisez et validez les plannings de la semaine"
        backTo={ROUTES.pilotage.rhTech}
        backLabel="RH Techniciens"
      />

      {/* Filters */}
      <div className="group w-full lg:w-auto rounded-xl border border-helpconfort-blue/20 overflow-hidden
        bg-gradient-to-br from-background to-helpconfort-blue/5
        shadow-sm transition-all duration-300
        hover:to-helpconfort-blue/10 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-helpconfort-blue" />
            </div>
            Filtrer par technicien
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={selectedTechId?.toString() ?? "all"}
            onValueChange={(value) =>
              setSelectedTechId(value === "all" ? undefined : Number(value))
            }
            disabled={loadingPlanning || techniciensList.length === 0}
          >
            <SelectTrigger className="w-full lg:w-[250px]">
              <SelectValue placeholder="Sélectionner un technicien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les techniciens</SelectItem>
              {techniciensList.map((tech) => (
                <SelectItem key={tech.id} value={tech.id.toString()}>
                  <div className="flex items-center gap-2">
                    {tech.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tech.color }}
                      />
                    )}
                    {tech.firstname} {tech.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </div>

      {/* Planning List */}
      <TechWeeklyPlanningList techFilterId={selectedTechId} />
    </div>
  );
}

export default function PlanningHebdo() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <PlanningHebdoContent />
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
