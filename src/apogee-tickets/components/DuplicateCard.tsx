import { Eye, GitMerge, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DuplicateTicketInfo } from "../hooks/useTicketDuplicates";

interface DuplicateCardProps {
  ticket: DuplicateTicketInfo;
  similarity: number;
  onView: () => void;
  onMerge: () => void;
  onReject: () => void;
  isRejecting?: boolean;
}

export function DuplicateCard({
  ticket,
  similarity,
  onView,
  onMerge,
  onReject,
  isRejecting,
}: DuplicateCardProps) {
  const similarityPercent = Math.round(similarity * 100);
  
  const getSimilarityColor = () => {
    if (similarityPercent >= 95) return "bg-destructive text-destructive-foreground";
    if (similarityPercent >= 90) return "bg-orange-500 text-white";
    if (similarityPercent >= 85) return "bg-yellow-500 text-black";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm font-medium text-primary">
            APO-{String(ticket.ticket_number).padStart(3, "0")}
          </span>
          <Badge className={cn("text-xs", getSimilarityColor())}>
            {similarityPercent}%
          </Badge>
          {ticket.module && (
            <Badge variant="outline" className="text-xs">
              {ticket.module}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {ticket.element_concerne}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Statut: {ticket.kanban_status}
        </p>
      </div>
      
      <div className="flex items-center gap-1 ml-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onView}
          title="Voir le ticket"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMerge}
          title="Fusionner"
          className="text-primary hover:text-primary"
        >
          <GitMerge className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onReject}
          disabled={isRejecting}
          title="Ignorer"
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
