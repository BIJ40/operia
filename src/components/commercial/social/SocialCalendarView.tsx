/**
 * SocialCalendarView — Grille calendrier mensuel avec posts colorés par topic_type.
 * 
 * Couleurs :
 * - awareness_day = teal
 * - seasonal_tip = blue
 * - realisation = orange
 * - local_branding = violet
 */

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions';

const TOPIC_COLORS: Record<string, string> = {
  awareness_day: 'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300',
  seasonal_tip: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
  realisation: 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300',
  local_branding: 'bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300',
};

const TOPIC_DOT_COLORS: Record<string, string> = {
  awareness_day: 'bg-teal-500',
  seasonal_tip: 'bg-blue-500',
  realisation: 'bg-orange-500',
  local_branding: 'bg-violet-500',
};

interface SocialCalendarViewProps {
  currentMonth: Date;
  suggestions: SocialSuggestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SocialCalendarView({ currentMonth, suggestions, selectedId, onSelect }: SocialCalendarViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: fr });
    const calEnd = endOfWeek(monthEnd, { locale: fr });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Group suggestions by date
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

          return (
            <div
              key={dateKey}
              className={cn(
                'border border-border/50 rounded-sm p-1 min-h-[80px] transition-colors',
                !inMonth && 'opacity-30',
                isToday(day) && 'bg-accent/20 border-accent',
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-0.5',
                isToday(day) ? 'text-accent-foreground' : 'text-muted-foreground',
              )}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {daySuggestions.slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className={cn(
                      'w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded border truncate transition-all',
                      TOPIC_COLORS[s.topic_type] || TOPIC_COLORS.seasonal_tip,
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

      {/* Legend */}
      <div className="flex gap-3 mt-2 pt-2 border-t border-border">
        {Object.entries({ awareness_day: 'Journées', seasonal_tip: 'Conseils', realisation: 'Réalisations', local_branding: 'Marque' }).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full', TOPIC_DOT_COLORS[type])} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
