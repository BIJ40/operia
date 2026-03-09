/**
 * Planning V2 — Shell principal (layout + tabs + navigation date + IA)
 */
import { useState, useCallback } from "react";
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, endOfWeek, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  BarChart3,
  Map,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  EyeOff,
  Eye,
  CalendarRange,
  Zap,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AgencyProvider } from "@/apogee-connect/contexts/AgencyContext";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { useFilters } from "../hooks/useFilters";
import { usePlanningV2Data } from "../hooks/usePlanningV2Data";
import { useAiPlanning } from "../hooks/useAiPlanning";
import { DayDispatchView } from "./day/DayDispatchView";
import { WeekHeatmapView } from "./week/WeekHeatmapView";
import { WeekPlanningView } from "./week/WeekPlanningView";
import { MapPlanningView } from "./map/MapPlanningView";
import { DisplaySettings } from "./shared/DisplaySettings";
import { UnscheduledPanel } from "./shared/UnscheduledPanel";
import { AiSuggestDrawer } from "./shared/AiSuggestDrawer";
import { OptimizeWeekDialog } from "./shared/OptimizeWeekDialog";
import { AiSettingsPanel } from "./shared/AiSettingsPanel";
import type { PlanningView, PlanningUnscheduled } from "../types";
import type { Suggestion, Move } from "@/hooks/usePlanningAugmente";
import type { ScoringWeights, HardConstraints } from "../hooks/useAiPlanning";

function PlanningV2ShellContent() {
  const { filters, setDate, setView, setFilters, setDensity, hoverSettings, setHoverSettings } = useFilters();
  const data = usePlanningV2Data(filters.selectedDate);
  const ai = useAiPlanning();

  const [showUnavailable, setShowUnavailable] = useState(false);
  const [unscheduledOpen, setUnscheduledOpen] = useState(false);

  // AI states
  const [suggestItem, setSuggestItem] = useState<PlanningUnscheduled | null>(null);
  const [suggestDrawerOpen, setSuggestDrawerOpen] = useState(false);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const goToday = () => setDate(new Date());
  const isWeekNav = filters.view === "week" || filters.view === "charge";
  const goPrev = () => setDate(isWeekNav ? subWeeks(filters.selectedDate, 1) : subDays(filters.selectedDate, 1));
  const goNext = () => setDate(isWeekNav ? addWeeks(filters.selectedDate, 1) : addDays(filters.selectedDate, 1));

  const dateLabel = isWeekNav
    ? `Semaine du ${format(startOfWeek(filters.selectedDate, { weekStartsOn: 1 }), "d MMM", { locale: fr })} au ${format(endOfWeek(filters.selectedDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: fr })}`
    : format(filters.selectedDate, "EEEE d MMMM yyyy", { locale: fr });
  const todayActive = isToday(filters.selectedDate);

  // AI handlers
  const handleRequestSuggest = useCallback(async (item: PlanningUnscheduled) => {
    setSuggestItem(item);
    setSuggestDrawerOpen(true);
    ai.resetSuggestions();
    await ai.suggest(item.dossierId);
  }, [ai]);

  const handleApplySuggestion = useCallback(async (suggestion: Suggestion) => {
    await ai.applyAction({ type: "suggestion", id: String(suggestion.rank), action: "apply" });
    setSuggestDrawerOpen(false);
    data.refresh();
  }, [ai, data]);

  const handleOptimize = useCallback(async () => {
    setOptimizeOpen(true);
    ai.resetOptimize();
    await ai.optimize(filters.selectedDate);
  }, [ai, filters.selectedDate]);

  const handleApplyMove = useCallback(async (move: Move, index: number) => {
    await ai.applyAction({ type: "move", id: String(index), action: "apply" });
    data.refresh();
  }, [ai, data]);

  const handleSaveConfig = useCallback(async (weights: ScoringWeights, constraints: HardConstraints) => {
    await ai.saveConfig(weights, constraints);
  }, [ai]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0 flex-wrap">
        {/* Navigation date */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goPrev} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={todayActive ? "default" : "outline"}
            size="sm"
            onClick={goToday}
            className="h-8 text-xs"
          >
            Aujourd'hui
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm font-semibold capitalize text-foreground min-w-[180px]">
          {dateLabel}
        </span>

        {/* Tabs vue */}
        <Tabs
          value={filters.view}
          onValueChange={(v) => setView(v as PlanningView)}
          className="ml-auto"
        >
          <TabsList className="h-8">
            <TabsTrigger value="day" className="text-xs gap-1 px-3 h-7">
              <CalendarDays className="h-3.5 w-3.5" />
              Jour
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs gap-1 px-3 h-7">
              <CalendarRange className="h-3.5 w-3.5" />
              Semaine
            </TabsTrigger>
            <TabsTrigger value="charge" className="text-xs gap-1 px-3 h-7">
              <BarChart3 className="h-3.5 w-3.5" />
              Charge
            </TabsTrigger>
            <TabsTrigger value="map" className="text-xs gap-1 px-3 h-7">
              <Map className="h-3.5 w-3.5" />
              Carte
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* AI: Optimize week */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleOptimize}
              disabled={ai.isOptimizing}
            >
              <Zap className="h-3.5 w-3.5" />
              Optimiser
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Optimiser la semaine avec l'IA</p>
          </TooltipContent>
        </Tooltip>

        {/* AI Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettingsOpen(true)}
            >
              <BrainCircuit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Paramètres IA</p>
          </TooltipContent>
        </Tooltip>

        {/* Toggle indisponibles */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showUnavailable ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setShowUnavailable(!showUnavailable)}
              className="h-8 w-8"
            >
              {showUnavailable ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{showUnavailable ? "Masquer indisponibles" : "Voir indisponibles"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Display Settings */}
        <DisplaySettings
          density={filters.density}
          onDensityChange={setDensity}
          granularity={filters.granularity}
          onGranularityChange={(g) => setFilters({ granularity: g })}
          showBlocks={filters.showBlocks}
          onShowBlocksChange={(v) => setFilters({ showBlocks: v })}
          showUnconfirmed={filters.showUnconfirmed}
          onShowUnconfirmedChange={(v) => setFilters({ showUnconfirmed: v })}
          hoverSettings={hoverSettings}
          onHoverSettingsChange={setHoverSettings}
        />

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          onClick={data.refresh}
          className="h-8 w-8"
          disabled={data.isLoading}
        >
          <RotateCcw className={`h-4 w-4 ${data.isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        <div className="flex-1 min-w-0 overflow-hidden h-full relative">
          {data.isLoading && data.technicians.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <RotateCcw className="h-8 w-8 animate-spin" />
                <span className="text-sm">Chargement du planning…</span>
              </div>
            </div>
          ) : data.error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-destructive">
                Erreur de chargement : {data.error.message}
              </div>
            </div>
          ) : data.technicians.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">
                Aucun technicien trouvé pour cette agence
              </div>
            </div>
          ) : (
            <>
              {filters.view === "day" && (
                <DayDispatchView
                  technicians={data.technicians}
                  appointments={data.appointments}
                  blocks={data.blocks}
                  alerts={data.alerts}
                  loads={data.loads}
                  selectedDate={filters.selectedDate}
                  density={filters.density}
                  hoverSettings={hoverSettings}
                  showUnavailable={showUnavailable}
                />
              )}
              {filters.view === "week" && (
                <WeekPlanningView
                  technicians={data.technicians}
                  appointments={data.appointments}
                  blocks={data.blocks}
                  alerts={data.alerts}
                  loads={data.loads}
                  selectedDate={filters.selectedDate}
                  hoverSettings={hoverSettings}
                  showUnavailable={showUnavailable}
                />
              )}
              {filters.view === "charge" && (
                <WeekHeatmapView
                  technicians={data.technicians}
                  appointments={data.appointments}
                  blocks={data.blocks}
                  alerts={data.alerts}
                  selectedDate={filters.selectedDate}
                  showUnavailable={showUnavailable}
                  onDayClick={(day) => {
                    setDate(day);
                    setView("day");
                  }}
                />
              )}
              {filters.view === "map" && (
                <div className="relative w-full h-full">
                  <MapPlanningView
                    technicians={data.technicians}
                    selectedDate={filters.selectedDate}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Unscheduled Panel */}
        <UnscheduledPanel
          items={data.unscheduled}
          open={unscheduledOpen}
          onToggle={() => setUnscheduledOpen(!unscheduledOpen)}
          onRequestSuggest={handleRequestSuggest}
        />
      </div>

      {/* ── AI Drawers & Dialogs ── */}
      <AiSuggestDrawer
        open={suggestDrawerOpen}
        onClose={() => setSuggestDrawerOpen(false)}
        item={suggestItem}
        isLoading={ai.isSuggesting}
        data={ai.suggestions || null}
        onApply={handleApplySuggestion}
        isApplying={ai.isApplying}
      />

      <OptimizeWeekDialog
        open={optimizeOpen}
        onClose={() => setOptimizeOpen(false)}
        isLoading={ai.isOptimizing}
        data={ai.optimizeResult || null}
        onApplyMove={handleApplyMove}
        isApplying={ai.isApplying}
      />

      <AiSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentWeights={(ai.config?.weights as ScoringWeights) || null}
        currentConstraints={(ai.config?.hard_constraints as HardConstraints) || null}
        onSave={handleSaveConfig}
        isLoading={ai.isConfigLoading}
      />
    </div>
  );
}

export default function PlanningV2Shell() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <PlanningV2ShellContent />
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
