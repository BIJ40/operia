/**
 * Sélecteur de priorité heat (0-12)
 * Utilisé dans formulaires Support et Apogée-Tickets
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HEAT_PRIORITY_OPTIONS } from '@/utils/heatPriority';

interface HeatPrioritySelectorProps {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
}

export function HeatPrioritySelector({ 
  value, 
  onValueChange,
  disabled = false 
}: HeatPrioritySelectorProps) {
  return (
    <Select 
      value={value.toString()} 
      onValueChange={(v) => onValueChange(parseInt(v))}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Sélectionner priorité..." />
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        {HEAT_PRIORITY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value.toString()}>
            <span className="flex items-center gap-2">
              <span>{option.emoji}</span>
              <span>{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
