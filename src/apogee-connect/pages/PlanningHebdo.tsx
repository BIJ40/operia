import React, { useMemo } from "react";
import { UserCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/config/routes";
import { TechWeeklyPlanningList } from "@/apogee-connect/components/TechWeeklyPlanningList";
import { AgencyProvider, useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { useApogeeUsers } from "@/shared/api/apogee/useApogeeUsers";
import { buildTechMap } from "@/apogee-connect/utils/techTools";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionState } from "@/hooks/useSessionState";

interface TechnicienOption {
  id: number;
  firstname: string;
  name: string;
  color: string | null;
}

function PlanningHebdoContent() {
  const { isAgencyReady } = useAgency();
  // Persistance avec sessionStorage pour survie au changement d'onglets
  const [selectedTechId, setSelectedTechId] = useSessionState<number | undefined>('rh-planning-selected-tech-id', undefined);
  const { users, loading: loadingUsers } = useApogeeUsers();

  const techniciensList = useMemo<TechnicienOption[]>(() => {
    if (!users || users.length === 0) return [];

    const techMap = buildTechMap(users as any[]);

    return Object.values(techMap)
      .map((t) => ({
        id: t.id,
        firstname: t.prenom,
        name: t.nom,
        color: t.color || null,
      }))
      .sort((a, b) => a.firstname.localeCompare(b.firstname));
  }, [users]);


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
        backTo={ROUTES.agency.rhTech}
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
            onValueChange={(value) => {
              const newId = value === "all" ? undefined : Number(value);
              setSelectedTechId(newId);
            }}
            disabled={loadingUsers || techniciensList.length === 0}
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
