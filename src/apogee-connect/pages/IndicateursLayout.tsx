import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { IndicateursSidebar } from "@/apogee-connect/components/layout/IndicateursSidebar";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { AgencyProvider } from "@/apogee-connect/contexts/AgencyContext";
import { FiltersProvider } from "@/apogee-connect/contexts/FiltersContext";
import { SecondaryFiltersProvider } from "@/apogee-connect/contexts/SecondaryFiltersContext";

export default function IndicateursLayout() {
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
