/**
 * Planning V2 — Panel des interventions non planifiées
 * Panneau latéral rétractable avec filtre 1er RDV / Travaux + bouton IA
 */

import { useState, useMemo } from "react";
import {
  AlertCircle,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PlanningUnscheduled, UnscheduledReason } from "../../types";

/** Format minutes → "Xh" ou "XhYY" */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

type CategoryFilter = "all" | "premier_rdv" | "travaux";

interface UnscheduledPanelProps {
  items: PlanningUnscheduled[];
  open: boolean;
  onToggle: () => void;
  onRequestSuggest?: (item: PlanningUnscheduled) => void;
}

const REASON_LABELS: Record<UnscheduledReason, string> = {
  urgent: "Urgent",
  a_planifier: "À planifier",
  en_attente_client: "Attente client",
  en_attente_piece: "Attente pièce",
  en_attente_devis: "Attente devis",
  a_reprogrammer: "À reprogrammer",
  non_confirme: "Non confirmé",
};

const REASON_COLORS: Record<UnscheduledReason, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  a_planifier: "bg-primary/10 text-primary",
  en_attente_client: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  en_attente_piece: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  en_attente_devis: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  a_reprogrammer: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  non_confirme: "bg-muted text-muted-foreground",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-destructive",
  high: "bg-amber-500",
  normal: "bg-primary",
  low: "bg-muted-foreground",
};

function getCategory(item: PlanningUnscheduled): "premier_rdv" | "travaux" {
  const st = (item.status || "").toLowerCase();
  if (st === "to_planify_tvx") return "travaux";
  return "premier_rdv";
}

export function UnscheduledPanel({ items, open, onToggle, onRequestSuggest }: UnscheduledPanelProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const counts = useMemo(() => {
    let premier = 0, travaux = 0;
    for (const i of items) {
      if (getCategory(i) === "travaux") travaux++;
      else premier++;
    }
    return { premier, travaux };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (categoryFilter !== "all") {
      result = result.filter((i) => getCategory(i) === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.client.toLowerCase().includes(q) ||
          i.city?.toLowerCase().includes(q) ||
          i.universe?.toLowerCase().includes(q) ||
          String(i.dossierId).includes(q)
      );
    }
    return result;
  }, [items, categoryFilter, search]);

  const urgentCount = useMemo(() => items.filter(i => i.priority === "urgent").length, [items]);

  if (!open) {
    return (
      <div className="relative shrink-0">
        <button
          onClick={onToggle}
          className="h-full w-10 flex flex-col items-center justify-center gap-2 border-l border-border bg-card hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          <span
            className="text-[10px] font-medium text-muted-foreground writing-mode-vertical"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Non planifiés
          </span>
          {items.length > 0 && (
            <Badge
              variant={urgentCount > 0 ? "destructive" : "secondary"}
              className="text-[9px] px-1.5 py-0.5 min-w-[20px] justify-center"
            >
              {items.length}
            </Badge>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-[320px] shrink-0 border-l border-border bg-card flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Non planifiés</h3>
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {filtered.length}/{items.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>

        {/* Category toggle */}
        <div className="flex gap-1">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] flex-1 px-2"
            onClick={() => setCategoryFilter("all")}
          >
            Tous ({items.length})
          </Button>
          <Button
            variant={categoryFilter === "premier_rdv" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] flex-1 px-2"
            onClick={() => setCategoryFilter("premier_rdv")}
          >
            1er RDV ({counts.premier})
          </Button>
          <Button
            variant={categoryFilter === "travaux" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] flex-1 px-2"
            onClick={() => setCategoryFilter("travaux")}
          >
            Travaux ({counts.travaux})
          </Button>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {items.length === 0
                ? "Aucune intervention non planifiée"
                : "Aucun résultat pour ce filtre"}
            </div>
          ) : (
            filtered.map((item) => (
              <UnscheduledCard key={item.id} item={item} onRequestSuggest={onRequestSuggest} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {urgentCount > 0 && (
        <div className="px-3 py-2 border-t border-border shrink-0">
          <div className="flex items-center gap-1.5 text-destructive text-[10px] font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            {urgentCount} intervention{urgentCount > 1 ? "s" : ""} urgente{urgentCount > 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function UnscheduledCard({
  item,
  onRequestSuggest,
}: {
  item: PlanningUnscheduled;
  onRequestSuggest?: (item: PlanningUnscheduled) => void;
}) {
  const category = getCategory(item);
  return (
    <div className="rounded-md border border-border bg-card p-2.5 hover:shadow-sm transition-shadow group">
      {/* Top: priority dot + client */}
      <div className="flex items-start gap-2 mb-1.5">
        <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${PRIORITY_DOT[item.priority] || PRIORITY_DOT.normal}`} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-foreground truncate leading-tight">
            {item.client}
          </div>
          {item.city && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{item.city}</span>
            </div>
          )}
        </div>
        {/* Category badge */}
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 py-0 h-4 font-medium shrink-0 ${
            category === "travaux"
              ? "border-warm-green/50 text-warm-green"
              : "border-warm-blue/50 text-warm-blue"
          }`}
        >
          {category === "travaux" ? "TVX" : "1er RDV"}
        </Badge>
      </div>

      {/* Universes */}
      {item.universes && item.universes.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          {item.universes.map((u) => (
            <Badge
              key={u}
              variant="secondary"
              className="text-[9px] px-1.5 py-0 h-4 font-normal bg-muted/60 text-muted-foreground capitalize"
            >
              {u}
            </Badge>
          ))}
        </div>
      )}

      {/* Info row */}
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {formatDuration(item.estimatedDuration)}
          {item.estimatedPassages && item.estimatedPassages > 1 && (
            <span className="ml-0.5 text-[9px] font-medium text-primary">
              ({item.estimatedPassages} passages)
            </span>
          )}
        </span>
        {item.dossierId > 0 && (
          <span className="text-[10px] text-muted-foreground">
            #{item.dossierId}
          </span>
        )}
      </div>

      {/* Bottom: reason + AI button */}
      <div className="flex items-center justify-between">
        <Badge
          className={`text-[9px] px-1.5 py-0 h-4 font-medium ${REASON_COLORS[item.reason]}`}
          variant="secondary"
        >
          {REASON_LABELS[item.reason]}
        </Badge>

        {onRequestSuggest && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestSuggest(item);
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Suggestions IA</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
