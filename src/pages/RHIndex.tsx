/**
 * RHIndex - Page index RH et Parc avec navigation par onglets style navigateur
 */
import { CalendarDays, Car, MoreHorizontal, ClipboardList, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSessionState } from "@/hooks/useSessionState";
import { RHSuiviContent } from "@/components/rh/RHSuiviContent";
import { lazy, Suspense } from "react";

// Lazy load des contenus d'onglets
const PlanningsContent = lazy(() => import("@/components/rh/tabs/PlanningsTabContent"));
const VehiculesContent = lazy(() => import("@/components/rh/tabs/VehiculesTabContent"));
const DiversContent = lazy(() => import("@/components/rh/tabs/DiversTabContent"));

type RHTab = 'collaborateurs' | 'plannings' | 'vehicules' | 'divers';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function RHIndex() {
  const [activeTab, setActiveTab] = useSessionState<RHTab>('rh_active_tab', 'collaborateurs');

  return (
    <div className="container mx-auto py-4 px-4 space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RHTab)}>
        <div className="flex items-end gap-1 pb-0">
          <TabsList className="h-auto p-0 bg-transparent gap-0.5 items-end">
            {/* Onglet Mes collaborateurs */}
            <TabsTrigger 
              value="collaborateurs" 
              className="relative px-5 py-3 rounded-t-2xl border-2 border-b-0 transition-all duration-200
                data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:border-border/60
                data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md data-[state=active]:z-10 data-[state=active]:-mb-[2px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">Mes collaborateurs</span>
              </div>
            </TabsTrigger>

            {/* Onglet Plannings */}
            <TabsTrigger 
              value="plannings" 
              className="relative px-5 py-3 rounded-t-2xl border-2 border-b-0 transition-all duration-200
                data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:border-border/60
                data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md data-[state=active]:z-10 data-[state=active]:-mb-[2px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm">
                  <CalendarDays className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">Plannings</span>
              </div>
            </TabsTrigger>

            {/* Onglet Véhicules */}
            <TabsTrigger 
              value="vehicules" 
              className="relative px-5 py-3 rounded-t-2xl border-2 border-b-0 transition-all duration-200
                data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:border-border/60
                data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md data-[state=active]:z-10 data-[state=active]:-mb-[2px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm">
                  <Car className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">Véhicules</span>
              </div>
            </TabsTrigger>

            {/* Onglet Divers */}
            <TabsTrigger 
              value="divers" 
              className="relative px-5 py-3 rounded-t-2xl border-2 border-b-0 transition-all duration-200
                data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:border-border/60
                data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md data-[state=active]:z-10 data-[state=active]:-mb-[2px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm">
                  <MoreHorizontal className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">Divers</span>
              </div>
            </TabsTrigger>
          </TabsList>
          {/* Ligne de séparation qui passe "sous" l'onglet actif */}
          <div className="flex-1 border-b border-border" />
        </div>

        <div className="pt-4">
          <TabsContent value="collaborateurs" className="mt-0">
            <RHSuiviContent />
          </TabsContent>

          <TabsContent value="plannings" className="mt-0">
            <Suspense fallback={<LoadingFallback />}>
              <PlanningsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="vehicules" className="mt-0">
            <Suspense fallback={<LoadingFallback />}>
              <VehiculesContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="divers" className="mt-0">
            <Suspense fallback={<LoadingFallback />}>
              <DiversContent />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
