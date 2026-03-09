/**
 * Planning V2 — Panel des interventions non planifiées
 * Panneau latéral rétractable affichant les RDV à planifier
 */

import { useState, useMemo } from "react";
import {
  AlertCircle,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PlanningUnscheduled, UnscheduledReason } from "../../types";
import type { PlanningUnscheduled, UnscheduledReason } from "../../types";

interface UnscheduledPanelProps {
  items: PlanningUnscheduled[];
  open: boolean;
  onToggle: () => void;
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

export function UnscheduledPanel({ items, open, onToggle }: UnscheduledPanelProps) {
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = items;
    if (reasonFilter !== "all") {
      result = result.filter((i) => i.reason === reasonFilter);
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
  }, [items, reasonFilter, search]);

  // Count by reason for badges
  const countByReason = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) {
      map.set(i.reason, (map.get(i.reason) || 0) + 1);
    }
    return map;
  }, [items]);

  const urgentCount = countByReason.get("urgent") || 0;

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
    <div className="w-[320px] shrink-0 border-l border-border bg-card flex flex-col h-full">
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

        {/* Filter by reason */}
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="h-7 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Tous les motifs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les motifs</SelectItem>
            {Object.entries(REASON_LABELS).map(([key, label]) => {
              const count = countByReason.get(key) || 0;
              if (count === 0) return null;
              return (
                <SelectItem key={key} value={key}>
                  {label} ({count})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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
              <UnscheduledCard key={item.id} item={item} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer summary */}
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

function UnscheduledCard({ item }: { item: PlanningUnscheduled }) {
  return (
    <div className="rounded-md border border-border bg-card p-2.5 hover:shadow-sm transition-shadow cursor-pointer group">
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
      </div>

      {/* Info row */}
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {item.estimatedDuration} min
        </span>
        {item.universe && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            {item.universe}
          </span>
        )}
        {item.dossierId > 0 && (
          <span className="text-[10px] text-muted-foreground">
            #{item.dossierId}
          </span>
        )}
      </div>

      {/* Reason badge */}
      <Badge
        className={`text-[9px] px-1.5 py-0 h-4 font-medium ${REASON_COLORS[item.reason]}`}
        variant="secondary"
      >
        {REASON_LABELS[item.reason]}
      </Badge>
    </div>
  );
}
