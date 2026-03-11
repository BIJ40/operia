import { Outlet, Navigate } from "react-router-dom";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { AgencyProvider } from "@/apogee-connect/contexts/AgencyContext";
import { FiltersProvider } from "@/apogee-connect/contexts/FiltersContext";
import { SecondaryFiltersProvider } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useProfile } from "@/contexts/ProfileContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import type { ModuleKey } from "@/types/modules";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function IndicateursLayout() {
  const { agence } = useProfile();
  const { hasAccessToScope, hasModule } = usePermissions();
  const { toast } = useToast();

  // Block access if no agency defined
  useEffect(() => {
    if (!agence) {
      toast({
        title: "Accès refusé",
        description: "Vous devez avoir une agence définie pour accéder aux indicateurs.",
        variant: "destructive",
      });
    }
  }, [agence, toast]);

  // Redirect if no agency, no permission, or module not enabled
  if (!agence || !hasAccessToScope('mes_indicateurs') || !hasModule('pilotage.agence' as ModuleKey)) {
    return <Navigate to="/" replace />;
  }

  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <FiltersProvider>
          <SecondaryFiltersProvider>
            <Outlet />
          </SecondaryFiltersProvider>
        </FiltersProvider>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
