/**
 * Contenu de l'onglet Plannings - Wrapper pour le planning hebdomadaire
 */
import { TechWeeklyPlanningList } from "@/apogee-connect/components/TechWeeklyPlanningList";
import { AgencyProvider } from "@/apogee-connect/contexts/AgencyContext";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";

export default function PlanningsTabContent() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <div className="space-y-4">
          <TechWeeklyPlanningList />
        </div>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
