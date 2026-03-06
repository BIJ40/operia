/**
 * Planning V2 — Menu contextuel clic droit sur un RDV
 * Préparé pour futures fonctionnalités (déplacer, réaffecter, annuler, etc.)
 */

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Eye, ArrowRightLeft, UserPlus, Copy, Trash2, CalendarClock, MessageSquare } from "lucide-react";
import type { PlanningAppointment } from "../../types";

interface AppointmentContextMenuProps {
  appointment: PlanningAppointment;
  children: React.ReactNode;
  onViewDetails?: (a: PlanningAppointment) => void;
}

export function AppointmentContextMenu({
  appointment,
  children,
  onViewDetails,
}: AppointmentContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem
          className="text-xs gap-2"
          onClick={() => onViewDetails?.(appointment)}
        >
          <Eye className="h-3.5 w-3.5" />
          Voir le détail
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem className="text-xs gap-2" disabled>
          <CalendarClock className="h-3.5 w-3.5" />
          Replanifier
        </ContextMenuItem>

        <ContextMenuItem className="text-xs gap-2" disabled>
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Changer de technicien
        </ContextMenuItem>

        <ContextMenuItem className="text-xs gap-2" disabled>
          <UserPlus className="h-3.5 w-3.5" />
          Ajouter un binôme
        </ContextMenuItem>

        <ContextMenuItem className="text-xs gap-2" disabled>
          <Copy className="h-3.5 w-3.5" />
          Dupliquer
        </ContextMenuItem>

        <ContextMenuItem className="text-xs gap-2" disabled>
          <MessageSquare className="h-3.5 w-3.5" />
          Ajouter une note
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem className="text-xs gap-2 text-destructive" disabled>
          <Trash2 className="h-3.5 w-3.5" />
          Annuler le RDV
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
