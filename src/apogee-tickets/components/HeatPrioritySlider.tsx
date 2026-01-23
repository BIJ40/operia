/**
 * Slider compact pour filtrer par priorité heat (0-12)
 * Version inline pour la barre d'actions
 */

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Snowflake, Flame, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TicketFilters } from '../types';

// Couleurs pour le gradient du slider (bleu glacé -> rouge feu)
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

interface HeatPrioritySliderProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
}

export function HeatPrioritySlider({ filters, onFiltersChange }: HeatPrioritySliderProps) {
  const heatMin = filters.heat_priority_min ?? 0;
  const heatMax = filters.heat_priority_max ?? 12;
  const exactPriority = filters.heat_priority_exact;
  
  const hasPriorityFilter = exactPriority !== undefined || heatMin > 0 || heatMax < 12;

  const handleRangeChange = (values: number[]) => {
    const [min, max] = values;
    onFiltersChange({
      ...filters,
      heat_priority_min: min,
      heat_priority_max: max,
      heat_priority_exact: undefined,
    });
  };

  const handleDotClick = (level: number) => {
    if (exactPriority === level) {
      onFiltersChange({
        ...filters,
        heat_priority_exact: undefined,
      });
    } else {
      onFiltersChange({
        ...filters,
        heat_priority_exact: level,
        heat_priority_min: 0,
        heat_priority_max: 12,
      });
    }
  };

  const clearPriorityFilter = () => {
    onFiltersChange({
      ...filters,
      heat_priority_min: undefined,
      heat_priority_max: undefined,
      heat_priority_exact: undefined,
    });
  };

  const getFilterLabel = () => {
    if (exactPriority !== undefined) return `=${exactPriority}`;
    if (heatMin > 0 || heatMax < 12) return `${heatMin}-${heatMax}`;
    return null;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-8 gap-1.5",
            hasPriorityFilter && "border-orange-400 text-orange-600"
          )}
        >
          <Snowflake className="h-3 w-3" style={{ color: getHeatColor(0) }} />
          <span className="text-xs">Priorité</span>
          <Flame className="h-3 w-3" style={{ color: getHeatColor(12) }} />
          {hasPriorityFilter && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-orange-100 text-orange-700">
              {getFilterLabel()}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-background z-50" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filtre priorité</span>
            {hasPriorityFilter && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearPriorityFilter}>
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
          
          {/* Slider */}
          <div className="flex items-center gap-3">
            <Snowflake className="h-4 w-4 shrink-0" style={{ color: getHeatColor(0) }} />
            
            <div className="flex-1 px-1">
              <Slider
                min={0}
                max={12}
                step={1}
                value={exactPriority !== undefined ? [exactPriority, exactPriority] : [heatMin, heatMax]}
                onValueChange={handleRangeChange}
                className="w-full"
                trackClassName="bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500"
                rangeClassName="bg-white/30"
              />
            </div>
            
            <Flame 
              className={cn(
                "h-4 w-4 shrink-0 transition-all",
                (heatMax >= 10 || (exactPriority !== undefined && exactPriority >= 10)) && 'animate-pulse'
              )} 
              style={{ color: getHeatColor(12) }} 
            />
          </div>

          {/* Pastilles */}
          <div className="flex items-center justify-between px-4">
            {Array.from({ length: 13 }, (_, i) => {
              const isSelected = exactPriority === i;
              const isInRange = exactPriority === undefined && i >= heatMin && i <= heatMax;
              
              return (
                <button
                  key={i}
                  onClick={() => handleDotClick(i)}
                  className={cn(
                    "w-4 h-4 rounded-full transition-all duration-200 border",
                    "hover:scale-125 hover:shadow-lg cursor-pointer",
                    isSelected && "ring-1 ring-offset-1 ring-foreground scale-110",
                    !isSelected && !isInRange && "opacity-30"
                  )}
                  style={{
                    backgroundColor: getHeatColor(i),
                    borderColor: isSelected ? 'hsl(var(--foreground))' : 'transparent',
                  }}
                  title={`Priorité ${i}`}
                />
              );
            })}
          </div>
          
          {/* Indicateur */}
          {hasPriorityFilter && (
            <div className="text-center text-xs text-muted-foreground">
              {exactPriority !== undefined 
                ? `Priorité exacte: ${exactPriority}`
                : `Plage: ${heatMin} - ${heatMax}`
              }
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
