/**
 * NewTicketsPanel - Panel affichant les tickets modifiés depuis la dernière visite
 * Affiche les tickets modifiés par d'autres utilisateurs que l'utilisateur courant n'a pas encore consultés
 */

import { useMemo, useState } from 'react';
import { useMarkAllTicketsAsViewed } from '../hooks/useTicketViews';
import { Sparkles, Clock, Flame, Snowflake, X, Filter, Loader2, User, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { ApogeeModule, ApogeeTicket, ApogeeTicketStatus } from '../types';

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

interface NewTicketsPanelProps {
  tickets: ApogeeTicket[];
  statuses: ApogeeTicketStatus[];
  modules: ApogeeModule[];
  isLoading?: boolean;
  onTicketClick: (ticket: ApogeeTicket) => void;
}

export function NewTicketsPanel({ tickets, statuses, modules, isLoading = false, onTicketClick }: NewTicketsPanelProps) {
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { mutate: markAllAsViewed, isPending: isMarkingAll } = useMarkAllTicketsAsViewed();

  // Calculer le nombre total de tickets "nouveaux" (sans filtre priorité) ET récupérer leurs IDs
  const { totalNewTicketsCount, newTicketIds } = useMemo(() => {
    if (!user?.id) return { totalNewTicketsCount: 0, newTicketIds: [] as string[] };
    
    const filtered = tickets.filter(ticket => {
      if (!ticket.last_modified_by_user_id || !ticket.last_modified_at) {
        return false;
      }
      // Pas modifié par moi-même
      if (ticket.last_modified_by_user_id === user.id) {
        return false;
      }
      const myView = myViews.find(v => v.ticket_id === ticket.id);
      // Jamais vu = nouveau
      if (!myView) return true;
      // Modifié après ma dernière vue
      return new Date(ticket.last_modified_at).getTime() > new Date(myView.viewed_at).getTime();
    });
    
    return {
      totalNewTicketsCount: filtered.length,
      newTicketIds: filtered.map(t => t.id)
    };
  }, [tickets, myViews, user?.id]);

  // Handler pour marquer tous comme lus
  const handleMarkAllAsRead = () => {
    markAllAsViewed(newTicketIds, {
      onSuccess: () => {
        toast.success(`${newTicketIds.length} ticket(s) marqué(s) comme lu(s)`);
      },
      onError: () => {
        toast.error('Erreur lors du marquage des tickets');
      }
    });
  };

  // Filtrer les tickets : nouveaux + priorité sélectionnée
  const newTickets = useMemo(() => {
    if (!user?.id) return [];

    return tickets.filter(ticket => {
      if (!ticket.last_modified_by_user_id || !ticket.last_modified_at) {
        return false;
      }
      // Pas modifié par moi-même
      if (ticket.last_modified_by_user_id === user.id) {
        return false;
      }
      const myView = myViews.find(v => v.ticket_id === ticket.id);
      // Jamais vu = nouveau
      const isNew = !myView || new Date(ticket.last_modified_at).getTime() > new Date(myView.viewed_at).getTime();
      if (!isNew) return false;

      // Filtre priorité
      if (selectedPriorities.length > 0) {
        if (!selectedPriorities.includes(ticket.heat_priority)) return false;
      }

      return true;
    }).sort((a, b) => 
      new Date(b.last_modified_at!).getTime() - new Date(a.last_modified_at!).getTime()
    );
  }, [tickets, myViews, user?.id, selectedPriorities]);

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

  if (isLoading || isLoadingViews) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (totalNewTicketsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Tout est à jour</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Aucun ticket n'a été modifié par d'autres utilisateurs depuis votre dernière visite. 👍
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header avec compteur et filtre priorité */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/50">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium text-sm">{newTickets.length} mise{newTickets.length > 1 ? 's' : ''} à jour</span>
        </div>
        
        {/* Multi-select priorité */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-2 rounded-full border-border/50",
                selectedPriorities.length > 0 && "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20"
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
                      isSelected && "ring-2 ring-emerald-500 ring-offset-1"
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

        {/* Bouton Tout marquer comme lu */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 rounded-full border-border/50 ml-auto"
              disabled={isMarkingAll || newTicketIds.length === 0}
            >
              {isMarkingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Tout marquer comme lu</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Marquer tous les tickets comme lus ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous allez marquer {newTicketIds.length} ticket{newTicketIds.length > 1 ? 's' : ''} comme lu{newTicketIds.length > 1 ? 's' : ''}.
                Cette action ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkAllAsRead}>
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Liste des tickets cliquables */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/30">
          {newTickets.map((ticket) => {
            const modifiedAt = new Date(ticket.last_modified_at!);
            const statusColor = getStatusColor(ticket.kanban_status);

            return (
              <button
                key={ticket.id}
                onClick={() => onTicketClick(ticket)}
                className="w-full text-left p-4 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  {/* Indicateur nouveauté */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{ticket.ticket_number}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${statusColor}20`,
                          color: statusColor
                        }}
                      >
                        {getStatusLabel(ticket.kanban_status)}
                      </Badge>
                      {ticket.module && (
                        <Badge variant="outline" className="text-xs">
                          {getModuleLabel(ticket.module)}
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-medium text-sm truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {ticket.element_concerne}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Modifié</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(modifiedAt, { locale: fr, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge priorité */}
                  <div 
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ 
                      backgroundColor: getHeatColor(ticket.heat_priority),
                      color: getTextColor(ticket.heat_priority)
                    }}
                  >
                    {ticket.heat_priority}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
