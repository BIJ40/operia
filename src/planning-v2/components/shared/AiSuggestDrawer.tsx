/**
 * Planning V2 — Drawer de suggestions IA pour planifier un dossier
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { PlanningUnscheduled } from "../../types";
import type { Suggestion, SuggestPlanningResponse } from "@/hooks/usePlanningAugmente";

interface AiSuggestDrawerProps {
  open: boolean;
  onClose: () => void;
  item: PlanningUnscheduled | null;
  isLoading: boolean;
  data: SuggestPlanningResponse | null;
  onApply: (suggestion: Suggestion) => void;
  isApplying: boolean;
}

const SCORE_COLORS: Record<string, string> = {
  competence: "bg-blue-500",
  proximite_delai: "bg-emerald-500",
  urgence: "bg-amber-500",
  equilibrage: "bg-violet-500",
  // Legacy keys
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
}: AiSuggestDrawerProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  const suggestions = data?.suggestions || [];
  const alternatives = data?.alternatives || [];
  const blockers = data?.blockers || [];
  const meta = data?.meta;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DrawerTitle className="text-base">Suggestions IA</DrawerTitle>
                <DrawerDescription className="text-xs">
                  {item ? `${item.client} — Dossier #${item.dossierId}` : ""}
                </DrawerDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Analyse des créneaux…</span>
            </div>
          ) : suggestions.length === 0 && blockers.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">Aucun créneau trouvé</p>
              {meta?.message && (
                <p className="text-xs text-destructive">{meta.message}</p>
              )}
              {meta?.techs_qualified === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun technicien n'a la compétence requise ({meta.dossier_universes?.join(' + ')})
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Meta summary */}
              {meta && (
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span>{meta.techs_qualified}/{meta.techs_total} techs qualifiés</span>
                  <span>•</span>
                  <span>{meta.candidates_evaluated} créneaux évalués</span>
                  <span>•</span>
                  <span>{meta.estimated_duration} min</span>
                  {meta.dossier_universes?.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-medium">{meta.dossier_universes.join(' + ')}</span>
                    </>
                  )}
                  {meta.is_first_rdv && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-300 text-blue-600">1er RDV</Badge>
                    </>
                  )}
                </div>
              )}

              {/* Genuine blockers — only techs with competence but unavailable */}
              {blockers.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="w-full rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 p-2.5 flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {blockers.length} tech{blockers.length > 1 ? "s" : ""} qualifié{blockers.length > 1 ? "s" : ""} indisponible{blockers.length > 1 ? "s" : ""}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="rounded-b-lg border border-t-0 border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/5 px-3 pb-2 pt-1 space-y-0.5">
                    {blockers.map((b: any, i: number) => (
                      <div key={i} className="text-[10px] text-muted-foreground">
                        <span className="font-medium">{b.techName}</span> — {b.reason}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Top suggestions */}
              {suggestions.map((s) => (
                <SuggestionCard key={s.rank} suggestion={s} onApply={onApply} isApplying={isApplying} />
              ))}

              {/* Alternatives toggle */}
              {alternatives.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs gap-1"
                    onClick={() => setShowAlternatives(!showAlternatives)}
                  >
                    {showAlternatives ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showAlternatives ? "Masquer" : "Voir"} {alternatives.length} alternative{alternatives.length > 1 ? "s" : ""}
                  </Button>
                  {showAlternatives && alternatives.map((s) => (
                    <SuggestionCard key={s.rank} suggestion={s} onApply={onApply} isApplying={isApplying} compact />
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Carte suggestion ───────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onApply,
  isApplying,
  compact = false,
}: {
  suggestion: Suggestion;
  onApply: (s: Suggestion) => void;
  isApplying: boolean;
  compact?: boolean;
}) {
  const s = suggestion;
  const scorePercent = Math.round(s.score);
  const isTop = s.rank === 1;

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 transition-colors ${
        isTop
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:bg-accent/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isTop && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}
          <span className="text-xs font-semibold text-foreground">#{s.rank}</span>
          <Badge
            variant={scorePercent >= 70 ? "default" : scorePercent >= 50 ? "secondary" : "outline"}
            className="text-[10px] px-1.5 h-5"
          >
            {scorePercent}%
          </Badge>
        </div>
        <Button
          size="sm"
          variant={isTop ? "default" : "outline"}
          className="h-7 text-xs gap-1"
          onClick={() => onApply(s)}
          disabled={isApplying}
        >
          {isApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Planifier
        </Button>
      </div>

      {/* Info */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" />
          {s.tech_name}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3 text-muted-foreground" />
          {s.date}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {s.hour} ({s.duration} min)
        </span>
        {(s as any).travel_km != null && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Navigation className="h-3 w-3" />
            ~{(s as any).travel_km} km
          </span>
        )}
      </div>

      {/* Score breakdown bar */}
      {!compact && s.score_breakdown && (
        <div className="space-y-1">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
            {Object.entries(s.score_breakdown).map(([key, val]) => (
              <div
                key={key}
                className={`h-full ${SCORE_COLORS[key] || "bg-muted-foreground"}`}
                style={{ width: `${val}%` }}
                title={`${SCORE_LABELS[key] || key}: ${Math.round(val as number)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(s.score_breakdown).map(([key, val]) => (
              <span key={key} className="text-[9px] text-muted-foreground flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${SCORE_COLORS[key] || "bg-muted-foreground"}`} />
                {SCORE_LABELS[key] || key} {Math.round(val as number)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reasons */}
      {!compact && s.reasons?.length > 0 && (
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          {s.reasons.map((r, i) => (
            <div key={i}>• {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}
