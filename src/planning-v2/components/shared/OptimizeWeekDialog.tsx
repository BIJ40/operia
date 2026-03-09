/**
 * Planning V2 — Dialog d'optimisation de la semaine
 */
import {
  Zap,
  ArrowRightLeft,
  ArrowRight,
  UserSwitch,
  Loader2,
  Check,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { OptimizeWeekResponse, Move } from "@/hooks/usePlanningAugmente";

interface OptimizeWeekDialogProps {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  data: OptimizeWeekResponse | null;
  onApplyMove: (move: Move, index: number) => void;
  isApplying: boolean;
}

const RISK_STYLES: Record<string, { badge: string; label: string }> = {
  low: { badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", label: "Faible" },
  medium: { badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", label: "Moyen" },
  high: { badge: "bg-destructive/10 text-destructive", label: "Élevé" },
};

const MOVE_ICONS: Record<string, typeof ArrowRightLeft> = {
  swap: ArrowRightLeft,
  move: ArrowRight,
  reassign: ArrowRight,
};

export function OptimizeWeekDialog({
  open,
  onClose,
  isLoading,
  data,
  onApplyMove,
  isApplying,
}: OptimizeWeekDialogProps) {
  const moves = data?.moves || [];
  const summary = data?.summary;
  const meta = data?.meta;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Optimisation de la semaine</DialogTitle>
              <DialogDescription className="text-xs">
                {meta?.range || "Analyse en cours…"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Analyse des plannings…</span>
              {meta && (
                <span className="text-[10px] text-muted-foreground">
                  {meta.technicians_count} techs • {meta.tech_days_analyzed} jours analysés
                </span>
              )}
            </div>
          ) : moves.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Check className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium text-foreground">Planning déjà optimisé</p>
              <p className="text-xs text-muted-foreground">
                Aucun rééquilibrage nécessaire pour cette période
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* Summary banner */}
              {summary && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      {summary.moves_count} optimisation{summary.moves_count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-5" />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Gain : {summary.total_gain_minutes} min
                  </div>
                  {summary.low_risk_count > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-5" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {summary.low_risk_count} à faible risque
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Moves */}
              {moves.map((move, idx) => (
                <MoveCard key={idx} move={move} index={idx} onApply={onApplyMove} isApplying={isApplying} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MoveCard({
  move,
  index,
  onApply,
  isApplying,
}: {
  move: Move;
  index: number;
  onApply: (m: Move, i: number) => void;
  isApplying: boolean;
}) {
  const Icon = MOVE_ICONS[move.type] || ArrowRight;
  const risk = RISK_STYLES[move.risk] || RISK_STYLES.medium;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">
            {move.description}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-[10px] px-1.5 h-5 ${risk.badge}`} variant="secondary">
            {risk.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 h-5">
            +{move.gain_minutes} min
          </Badge>
        </div>
      </div>

      {/* From → To */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="bg-muted px-2 py-0.5 rounded text-[10px]">{move.from}</span>
        <ArrowRight className="h-3 w-3 shrink-0" />
        <span className="bg-muted px-2 py-0.5 rounded text-[10px]">{move.to}</span>
      </div>

      {/* Explanation */}
      <p className="text-[10px] text-muted-foreground">{move.explanation}</p>

      {/* Why */}
      {move.why && move.why.length > 0 && (
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          {move.why.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}

      {/* Action */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={move.risk === "low" ? "default" : "outline"}
          className="h-7 text-xs gap-1"
          onClick={() => onApply(move, index)}
          disabled={isApplying}
        >
          {isApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Appliquer
        </Button>
      </div>
    </div>
  );
}
