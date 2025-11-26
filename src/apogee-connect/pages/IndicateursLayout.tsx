import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { IndicateursSidebar } from "@/apogee-connect/components/layout/IndicateursSidebar";
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

  // Bloquer l'accès si pas d'agence définie
  useEffect(() => {
    if (!agence) {
      toast({
        title: "Accès refusé",
        description: "Vous devez avoir une agence définie pour accéder aux indicateurs",
        variant: "destructive",
      });
    }
  }, [agence, toast]);

  // Rediriger vers l'accueil si pas d'agence
  if (!agence || !hasAccessToScope('mes_indicateurs')) {
    return <Navigate to="/" replace />;
  }

  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <FiltersProvider>
          <SecondaryFiltersProvider>
            <SidebarProvider>
              <div className="flex min-h-screen w-full">
                <IndicateursSidebar />
                <main className="flex-1 p-6">
                  <Outlet />
                </main>
              </div>
            </SidebarProvider>
          </SecondaryFiltersProvider>
        </FiltersProvider>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
