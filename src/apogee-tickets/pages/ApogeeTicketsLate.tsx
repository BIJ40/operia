/**
 * ApogeeTicketsLate - Liste des tickets "En retard"
 * Affiche les tickets avec tag BUG ouverts depuis plus de 48h
 */

import { useMemo } from 'react';
import { useApogeeTickets } from '@/apogee-tickets/hooks/useApogeeTickets';
import { AlertTriangle, Clock, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ApogeeTicketsLate() {
  const { tickets, statuses, modules, isLoading } = useApogeeTickets();

  // Filtrer les tickets : tag BUG + ouverts depuis plus de 48h
  const lateTickets = useMemo(() => {
    const now = new Date();
    const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    return tickets.filter(ticket => {
      // Vérifier si le ticket a le tag BUG
      const hasBugTag = ticket.impact_tags?.some(
        tag => tag.toUpperCase() === 'BUG'
      );
      if (!hasBugTag) return false;

      // Vérifier si le ticket est ouvert depuis plus de 48h
      const createdAt = new Date(ticket.created_at);
      if (createdAt > hours48Ago) return false;

      // Exclure les tickets dans un statut final (clos, terminé, etc.)
      const status = statuses.find(s => s.id === ticket.kanban_status);
      if (status?.is_final) return false;

      return true;
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [tickets, statuses]);

  const getModuleLabel = (moduleId: string | null) => {
    if (!moduleId) return null;
    const module = modules.find(m => m.id === moduleId);
    return module?.label || moduleId;
  };

  const getStatusLabel = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    return status?.label || statusId;
  };

  const getStatusColor = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    return status?.color || 'gray';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-orange"></div>
      </div>
    );
  }

  if (lateTickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Aucun ticket en retard</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Tous les tickets avec le tag BUG ont été traités dans les 48h. Bravo ! 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec compteur */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium text-sm">{lateTickets.length} ticket{lateTickets.length > 1 ? 's' : ''} en retard</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Tickets avec tag BUG ouverts depuis plus de 48h
        </span>
      </div>

      {/* Liste des tickets */}
      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="divide-y divide-border/30">
          {lateTickets.map((ticket) => {
            const createdAt = new Date(ticket.created_at);
            const hoursLate = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
            
            return (
              <div 
                key={ticket.id}
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Indicateur de retard */}
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                    hoursLate > 96 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  )}>
                    <Clock className="w-5 h-5" />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{ticket.ticket_number}
                      </span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${getStatusColor(ticket.kanban_status)}20`,
                          borderColor: getStatusColor(ticket.kanban_status),
                          color: getStatusColor(ticket.kanban_status)
                        }}
                      >
                        {getStatusLabel(ticket.kanban_status)}
                      </Badge>
                      {ticket.module && (
                        <Badge variant="secondary" className="text-xs">
                          {getModuleLabel(ticket.module)}
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-medium text-foreground line-clamp-1 mb-1">
                      {ticket.element_concerne}
                    </h4>

                    {ticket.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {ticket.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span className="text-red-600 font-medium">BUG</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Ouvert {formatDistanceToNow(createdAt, { locale: fr, addSuffix: true })}
                        </span>
                      </div>
                      <span className={cn(
                        "font-medium",
                        hoursLate > 96 ? "text-red-600" : "text-amber-600"
                      )}>
                        ({hoursLate}h de retard)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
