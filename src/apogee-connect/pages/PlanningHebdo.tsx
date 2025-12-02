import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck } from "lucide-react";
import { AppLayout } from "@/apogee-connect/components/layout/AppLayout";
import { TechWeeklyPlanningList } from "@/apogee-connect/components/TechWeeklyPlanningList";
import { AgencyProvider, useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { useTechniciens } from "@/apogee-connect/hooks/useTechniciens";
import { api } from "@/apogee-connect/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function PlanningHebdoContent() {
  const { isAgencyReady } = useAgency();
  const [selectedTechId, setSelectedTechId] = useState<number | undefined>(undefined);

  // Fetch users for technician selection
  const { data: usersData, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["planning-users-select"],
    queryFn: async () => {
      const result = await api.getUsers();
      return (result || []) as any[];
    },
    enabled: isAgencyReady,
    staleTime: 5 * 60 * 1000,
  });

  const { techniciensList } = useTechniciens(usersData || []);

  if (!isAgencyReady) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Planning Hebdomadaire Techniciens
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualisez et validez les plannings de la semaine
            </p>
          </div>

          {/* Filters */}
          <div className="group w-full lg:w-auto rounded-xl border border-helpconfort-blue/20 overflow-hidden
            bg-gradient-to-br from-white to-helpconfort-blue/5
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
                disabled={loadingUsers}
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
                        {tech.prenom} {tech.nom}
                        {!tech.actif && (
                          <span className="text-xs text-muted-foreground">(inactif)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </div>
        </div>

        {/* Planning List */}
        <TechWeeklyPlanningList techFilterId={selectedTechId} />
      </div>
    </AppLayout>
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
