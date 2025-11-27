import { Outlet, Navigate } from "react-router-dom";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { AgencyProvider } from "@/apogee-connect/contexts/AgencyContext";
import { FiltersProvider } from "@/apogee-connect/contexts/FiltersContext";
import { SecondaryFiltersProvider } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function IndicateursLayout() {
  const { agence, hasAccessToScope } = useAuth();
  const { toast } = useToast();

  // Block access if no agency defined
  useEffect(() => {
    if (!agence) {
      toast({
        title: "Accès refusé",
        description: "Vous devez avoir une agence définie pour accéder aux indicateurs",
        variant: "destructive",
      });
    }
  }, [agence, toast]);

  // Redirect if no agency or no permission
  if (!agence || !hasAccessToScope('mes_indicateurs')) {
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
