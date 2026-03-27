/**
 * Planning V2 — Drawer de suggestions IA pour planifier un dossier
 * Affiche la grille visuelle du planning réel + créneaux clignotants
 */
import { useState } from "react";
import {
  Sparkles,
  Clock,
  User,
  CalendarDays,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SuggestPlanningGrid } from "./SuggestPlanningGrid";
import type { PlanningUnscheduled, PlanningTechnician, PlanningAppointment, PlanningBlock } from "../../types";
import type { Suggestion, SuggestPlanningResponse } from "@/hooks/usePlanningAugmente";

interface AiSuggestDrawerProps {
  open: boolean;
  onClose: () => void;
  item: PlanningUnscheduled | null;
  isLoading: boolean;
  data: SuggestPlanningResponse | null;
  onApply: (suggestion: Suggestion) => void;
  isApplying: boolean;
  /** Real planning data for the visual grid */
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
}

const SCORE_COLORS: Record<string, string> = {
  competence: "bg-blue-500",
  proximite_delai: "bg-emerald-500",
  urgence: "bg-amber-500",
  equilibrage: "bg-violet-500",
  coherence: "bg-blue-500",
  equity: "bg-emerald-500",
  continuity: "bg-amber-500",
  route: "bg-violet-500",
  zone: "bg-cyan-500",
  gap: "bg-rose-500",
  proximity: "bg-cyan-500",
};

const SCORE_LABELS: Record<string, string> = {
  competence: "compétence",
  proximite_delai: "proximité/délai",
  urgence: "urgence",
  equilibrage: "équilibrage",
};

export function AiSuggestDrawer({
  open,
  onClose,
  item,
  isLoading,
  data,
  onApply,
  isApplying,
  technicians,
  appointments,
  blocks,
}: AiSuggestDrawerProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  const suggestions = data?.suggestions || [];
  const alternatives = data?.alternatives || [];
  const blockers = data?.blockers || [];
  const meta = data?.meta;

  const allSuggestions = [...suggestions, ...(showAlternatives ? alternatives : [])];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] w-full h-[85vh] max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">Suggestions IA</DialogTitle>
                <DialogDescription className="text-xs">
                  {item ? `${item.client} — Dossier #${item.dossierId}` : ""}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {meta && (
                <div className="hidden sm:flex flex-wrap gap-2 text-[10px] text-muted-foreground mr-2">
                  <span>{meta.techs_qualified}/{meta.techs_total} techs qualifiés</span>
                  <span>•</span>
                  <span>{meta.estimated_duration} min</span>
                  {meta.dossier_universes?.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-medium">{meta.dossier_universes.join(' + ')}</span>
                    </>
                  )}
                  {meta.is_first_rdv && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/50 text-primary">1er RDV</Badge>
                  )}
                </div>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Analyse des créneaux…</span>
            </div>
          ) : suggestions.length === 0 && blockers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-sm text-muted-foreground">Aucun créneau trouvé</p>
              {meta?.message && <p className="text-xs text-destructive">{meta.message}</p>}
              {meta?.techs_qualified === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun technicien n'a la compétence requise ({meta.dossier_universes?.join(' + ')})
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full">
              {/* LEFT: Visual planning grid */}
              <div className="flex-1 min-w-0 p-3 overflow-hidden flex flex-col">
                {/* Blockers */}
                {blockers.length > 0 && (
                  <Collapsible className="mb-2 shrink-0">
                    <CollapsibleTrigger className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {blockers.length} tech{blockers.length > 1 ? "s" : ""} qualifié{blockers.length > 1 ? "s" : ""} indisponible{blockers.length > 1 ? "s" : ""}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="rounded-b-lg border border-t-0 border-amber-500/30 bg-amber-500/5 px-3 pb-2 pt-1 space-y-0.5">
                      {blockers.map((b: any, i: number) => (
                        <div key={i} className="text-[10px] text-muted-foreground">
                          <span className="font-medium">{b.techName}</span> — {b.reason}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Grid */}
                <div className="flex-1 min-h-0 overflow-auto">
                  <SuggestPlanningGrid
                    suggestions={allSuggestions}
                    technicians={technicians}
                    appointments={appointments}
                    blocks={blocks}
                    onApply={onApply}
                    isApplying={isApplying}
                    selectedRank={selectedRank}
                    onSelectSuggestion={(s) => setSelectedRank(s.rank === selectedRank ? null : s.rank)}
                  />
                </div>
              </div>

              {/* RIGHT: Suggestion cards sidebar */}
              <div className="w-[320px] shrink-0 border-l border-border bg-muted/20 flex flex-col">
                <div className="px-3 py-2 border-b border-border shrink-0">
                  <h3 className="text-xs font-semibold text-foreground">Créneaux proposés</h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {suggestions.map((s) => (
                      <SuggestionCard
                        key={s.rank}
                        suggestion={s}
                        onApply={onApply}
                        isApplying={isApplying}
                        isSelected={selectedRank === s.rank}
                        onSelect={() => setSelectedRank(s.rank === selectedRank ? null : s.rank)}
                      />
                    ))}

                    {alternatives.length > 0 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs gap-1"
                          onClick={() => setShowAlternatives(!showAlternatives)}
                        >
                          {showAlternatives ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {alternatives.length} alternative{alternatives.length > 1 ? "s" : ""}
                        </Button>
                        {showAlternatives && alternatives.map((s) => (
                          <SuggestionCard
                            key={s.rank}
                            suggestion={s}
                            onApply={onApply}
                            isApplying={isApplying}
                            compact
                            isSelected={selectedRank === s.rank}
                            onSelect={() => setSelectedRank(s.rank === selectedRank ? null : s.rank)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte suggestion ───────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onApply,
  isApplying,
  compact = false,
  isSelected = false,
  onSelect,
}: {
  suggestion: Suggestion;
  onApply: (s: Suggestion) => void;
  isApplying: boolean;
  compact?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const s = suggestion;
  const scorePercent = Math.round(s.score);
  const isTop = s.rank === 1;

  return (
    <div
      className={`rounded-lg border p-2.5 space-y-1.5 transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
          : isTop
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-card hover:bg-accent/30"
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isTop && <Star className="h-3 w-3 text-primary fill-primary" />}
          <span className="text-[10px] font-semibold text-foreground">#{s.rank}</span>
          <Badge
            variant={scorePercent >= 70 ? "default" : scorePercent >= 50 ? "secondary" : "outline"}
            className="text-[9px] px-1 h-4"
          >
            {scorePercent}%
          </Badge>
        </div>
        <Button
          size="sm"
          variant={isTop ? "default" : "outline"}
          className="h-6 text-[10px] gap-0.5 px-2"
          onClick={(e) => { e.stopPropagation(); onApply(s); }}
          disabled={isApplying}
        >
          {isApplying ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
          Planifier
        </Button>
      </div>

      {/* Info */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground">
        <span className="flex items-center gap-0.5">
          <User className="h-2.5 w-2.5 text-muted-foreground" />
          {s.tech_name}
        </span>
        <span className="flex items-center gap-0.5">
          <CalendarDays className="h-2.5 w-2.5 text-muted-foreground" />
          {s.date}
        </span>
        <span className="flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          {s.hour} ({s.duration}min)
        </span>
        {(s as any).travel_km != null && (
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Navigation className="h-2.5 w-2.5" />
            ~{(s as any).travel_km}km
          </span>
        )}
      </div>

      {/* Score breakdown */}
      {!compact && s.score_breakdown && (
        <div className="space-y-0.5">
          <div className="flex h-1 rounded-full overflow-hidden bg-muted">
            {Object.entries(s.score_breakdown).map(([key, val]) => (
              <div
                key={key}
                className={`h-full ${SCORE_COLORS[key] || "bg-muted-foreground"}`}
                style={{ width: `${val}%` }}
                title={`${SCORE_LABELS[key] || key}: ${Math.round(val as number)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0">
            {Object.entries(s.score_breakdown).map(([key, val]) => (
              <span key={key} className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                <span className={`inline-block w-1 h-1 rounded-full ${SCORE_COLORS[key] || "bg-muted-foreground"}`} />
                {SCORE_LABELS[key] || key} {Math.round(val as number)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reasons */}
      {!compact && s.reasons?.length > 0 && (
        <div className="text-[9px] text-muted-foreground space-y-0">
          {s.reasons.map((r, i) => (
            <div key={i}>• {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}
