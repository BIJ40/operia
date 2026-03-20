/**
 * SocialCalendarView — Grille calendrier mensuel avec jours sélectionnables.
 * Multi-select des jours pour régénération ciblée.
 */

import { useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions';

const TOPIC_COLORS: Record<string, string> = {
  urgence: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300',
  prevention: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
  amelioration: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300',
  conseil: 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-300',
  preuve: 'bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300',
  saisonnier: 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300',
  contre_exemple: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300',
  pedagogique: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300',
  prospection: 'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300',
  calendar: 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-300',
};

const TOPIC_DOT_COLORS: Record<string, string> = {
  urgence: 'bg-red-500',
  prevention: 'bg-blue-500',
  amelioration: 'bg-emerald-500',
  conseil: 'bg-sky-500',
  preuve: 'bg-violet-500',
  saisonnier: 'bg-orange-500',
  contre_exemple: 'bg-rose-500',
  pedagogique: 'bg-amber-500',
  prospection: 'bg-teal-500',
};

interface SocialCalendarViewProps {
  currentMonth: Date;
  suggestions: SocialSuggestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedDays: Set<string>;
  onToggleDay: (dateKey: string) => void;
  onRegenerateSelected: () => void;
  isRegenerating?: boolean;
}

export function SocialCalendarView({
  currentMonth, suggestions, selectedId, onSelect,
  selectedDays, onToggleDay, onRegenerateSelected, isRegenerating,
}: SocialCalendarViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: fr });
    const calEnd = endOfWeek(monthEnd, { locale: fr });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const suggestionsByDate = useMemo(() => {
    const map = new Map<string, SocialSuggestion[]>();
    for (const s of suggestions) {
      const key = s.suggestion_date;
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [suggestions]);

  const handleDayClick = useCallback((e: React.MouseEvent, dateKey: string) => {
    // Only toggle day selection if clicking on the day cell background, not on a post button
    e.stopPropagation();
    onToggleDay(dateKey);
  }, [onToggleDay]);

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySuggestions = suggestionsByDate.get(dateKey) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const isDaySelected = selectedDays.has(dateKey);

          return (
            <div
              key={dateKey}
              onClick={(e) => inMonth ? handleDayClick(e, dateKey) : undefined}
              className={cn(
                'border rounded-sm p-0.5 min-h-[60px] transition-colors cursor-pointer select-none',
                !inMonth && 'opacity-30 cursor-default',
                isToday(day) && 'bg-accent/20',
                isDaySelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border/50 hover:border-border',
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-0.5 flex items-center gap-1',
                isDaySelected ? 'text-primary' : isToday(day) ? 'text-accent-foreground' : 'text-muted-foreground',
              )}>
                {format(day, 'd')}
                {isDaySelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>

              <div className="space-y-0.5">
                {daySuggestions.slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(s.id);
                    }}
                    className={cn(
                      'w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded border truncate transition-all',
                      TOPIC_COLORS[s.topic_type] || TOPIC_COLORS.conseil,
                      selectedId === s.id && 'ring-1 ring-primary ring-offset-1',
                    )}
                    title={s.title}
                  >
                    {s.title}
                  </button>
                ))}
                {daySuggestions.length > 3 && (
                  <div className="text-[9px] text-muted-foreground text-center">
                    +{daySuggestions.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: regenerate button (prominent) + legend */}
      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
        {selectedDays.size > 0 && (
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs gap-1.5 w-full"
            onClick={onRegenerateSelected}
            disabled={isRegenerating}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin')} />
            Suggérer à nouveau ({selectedDays.size} jour{selectedDays.size > 1 ? 's' : ''})
          </Button>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries({ urgence: 'Urgence', prevention: 'Prévent.', amelioration: 'Amélio.', conseil: 'Conseil', preuve: 'Preuve', saisonnier: 'Saison', contre_exemple: 'Contre-ex.', pedagogique: 'Pédago.', prospection: 'Prospect.' }).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', TOPIC_DOT_COLORS[type])} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
