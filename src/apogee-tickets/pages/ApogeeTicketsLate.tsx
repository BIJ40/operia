/**
 * ApogeeTicketsLate - Liste des tickets "En retard"
 * Affiche les tickets avec tag BUG ouverts depuis plus de 48h
 * Avec filtre multi-select par priorité thermique
 */

import { useMemo, useState } from 'react';
import { useApogeeTickets } from '@/apogee-tickets/hooks/useApogeeTickets';
import { AlertTriangle, Clock, Tag, Flame, Snowflake, X, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Gradient de couleurs du bleu glacé (0) au rouge foncé (12)
const getHeatColor = (priority: number): string => {
  const p = Math.max(0, Math.min(12, priority));
  if (p <= 6) {
    const hue = 200 - (p * 26.67);
    const sat = 80 + (p * 1.67);
    const light = 70 - (p * 3.33);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  } else {
    const t = p - 6;
    const hue = 40 - (t * 6.67);
    const sat = 90;
    const light = 50 - (t * 3.33);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
};

const getTextColor = (priority: number): string => {
  return priority > 4 ? 'white' : 'hsl(0, 0%, 10%)';
};

const getLabel = (priority: number): string => {
  if (priority === 0) return 'Gelé';
  if (priority <= 2) return 'Froid';
  if (priority <= 4) return 'Frais';
  if (priority <= 6) return 'Tiède';
  if (priority <= 8) return 'Chaud';
  if (priority <= 10) return 'Brûlant';
  return 'Critique';
};

// Options de priorité pour le multi-select
const PRIORITY_OPTIONS = Array.from({ length: 13 }, (_, i) => ({
  value: i,
  label: getLabel(i),
  color: getHeatColor(i),
  textColor: getTextColor(i),
}));

export default function ApogeeTicketsLate() {
  const { tickets, statuses, modules, isLoading } = useApogeeTickets();
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Calculer si on a des tickets en retard au total (sans filtre priorité)
  const totalLateTicketsCount = useMemo(() => {
    const now = new Date();
    const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    return tickets.filter(ticket => {
      const hasBugTag = ticket.impact_tags?.some(tag => tag.toUpperCase() === 'BUG');
      if (!hasBugTag) return false;
      const createdAt = new Date(ticket.created_at);
      if (createdAt > hours48Ago) return false;
      const status = statuses.find(s => s.id === ticket.kanban_status);
      return !status?.is_final;
    }).length;
  }, [tickets, statuses]);

  // Filtrer les tickets : tag BUG + ouverts depuis plus de 48h + priorité
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

      // Filtre par priorité si sélection active
      if (selectedPriorities.length > 0) {
        if (!selectedPriorities.includes(ticket.heat_priority)) return false;
      }

      return true;
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [tickets, statuses, selectedPriorities]);

  const togglePriority = (priority: number) => {
    setSelectedPriorities(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority].sort((a, b) => a - b)
    );
  };

  const clearPriorities = () => {
    setSelectedPriorities([]);
  };

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

  if (totalLateTicketsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-primary" />
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
      {/* Header avec compteur et filtre priorité */}
      <div className="flex flex-wrap items-center gap-3 px-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium text-sm">{lateTickets.length} ticket{lateTickets.length > 1 ? 's' : ''} en retard</span>
        </div>
        
        {/* Multi-select priorité */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-2 rounded-full border-border/50",
                selectedPriorities.length > 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Priorité</span>
              {selectedPriorities.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {selectedPriorities.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 bg-background z-50" align="start">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-sm font-medium">Filtrer par priorité</span>
              {selectedPriorities.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearPriorities}
                >
                  Effacer
                </Button>
              )}
            </div>
            <div className="grid gap-1 max-h-72 overflow-y-auto">
              {PRIORITY_OPTIONS.map((opt) => {
                const Icon = opt.value <= 3 ? Snowflake : Flame;
                const isSelected = selectedPriorities.includes(opt.value);
                
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => togglePriority(opt.value)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-sm transition-all",
                      isSelected && "ring-2 ring-primary ring-offset-1"
                    )}
                    style={{ 
                      backgroundColor: opt.color, 
                      color: opt.textColor,
                    }}
                  >
                    <Checkbox 
                      checked={isSelected} 
                      className="border-current data-[state=checked]:bg-current/20"
                    />
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-bold">{opt.value}</span>
                    <span className="opacity-80 text-xs">• {opt.label}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Badges des priorités sélectionnées */}
        {selectedPriorities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {selectedPriorities.map(p => {
              const opt = PRIORITY_OPTIONS[p];
              const Icon = p <= 3 ? Snowflake : Flame;
              return (
                <button
                  key={p}
                  onClick={() => togglePriority(p)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                  style={{ backgroundColor: opt.color, color: opt.textColor }}
                >
                  <Icon className="w-3 h-3" />
                  <span>{p}</span>
                  <X className="w-3 h-3 ml-0.5" />
                </button>
              );
            })}
          </div>
        )}

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
                    hoursLate > 96 ? "bg-destructive/10 text-destructive" : "bg-warm-orange/10 text-warm-orange"
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
                        <span className="text-destructive font-medium">BUG</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Ouvert {formatDistanceToNow(createdAt, { locale: fr, addSuffix: true })}
                        </span>
                      </div>
                      <span className={cn(
                        "font-medium",
                        hoursLate > 96 ? "text-destructive" : "text-warm-orange"
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
