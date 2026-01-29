/**
 * Composant pour éditer le flag Roadmap d'un ticket
 * Permet de cocher/décocher et choisir mois/année
 */

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoadmapEditorProps {
  enabled: boolean | null;
  month: number | null;
  year: number | null;
  onChange: (enabled: boolean, month: number | null, year: number | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

function getYearOptions(): number[] {
  // Par défaut on commence à 2026
  return [2025, 2026, 2027, 2028];
}

export function RoadmapEditor({
  enabled,
  month,
  year,
  onChange,
  disabled = false,
  compact = false,
}: RoadmapEditorProps) {
  const defaultYear = 2026; // Année par défaut
  const [isEnabled, setIsEnabled] = useState(enabled ?? false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(month ?? null);
  const [selectedYear, setSelectedYear] = useState<number | null>(year ?? defaultYear);

  useEffect(() => {
    setIsEnabled(enabled ?? false);
    setSelectedMonth(month ?? null);
    setSelectedYear(year ?? defaultYear);
  }, [enabled, month, year]);

  const handleEnabledChange = (checked: boolean) => {
    setIsEnabled(checked);
    if (checked) {
      // Par défaut: 2026, pas de mois
      const newYear = selectedYear ?? defaultYear;
      setSelectedYear(newYear);
      onChange(true, selectedMonth, newYear);
    } else {
      onChange(false, null, null);
    }
  };

  const handleMonthChange = (value: string) => {
    const monthVal = value === 'none' ? null : parseInt(value, 10);
    setSelectedMonth(monthVal);
    onChange(isEnabled, monthVal, selectedYear);
  };

  const handleYearChange = (value: string) => {
    const yearVal = parseInt(value, 10);
    setSelectedYear(yearVal);
    onChange(isEnabled, selectedMonth, yearVal);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isEnabled}
          onCheckedChange={handleEnabledChange}
          disabled={disabled}
          id="roadmap-checkbox"
        />
        <label
          htmlFor="roadmap-checkbox"
          className={cn(
            'text-sm cursor-pointer flex items-center gap-1',
            isEnabled ? 'text-primary font-medium' : 'text-muted-foreground'
          )}
        >
          <MapIcon className="h-3.5 w-3.5" />
          Roadmap
        </label>
        {isEnabled && (
          <span className="text-xs text-muted-foreground">
            {selectedMonth ? MONTHS.find((m) => m.value === selectedMonth)?.label : '—'} {selectedYear}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isEnabled}
          onCheckedChange={handleEnabledChange}
          disabled={disabled}
          id="roadmap-checkbox-full"
        />
        <label
          htmlFor="roadmap-checkbox-full"
          className={cn(
            'text-sm cursor-pointer flex items-center gap-1.5',
            isEnabled ? 'text-primary font-medium' : 'text-muted-foreground'
          )}
        >
          <MapIcon className="h-4 w-4" />
          Inclure dans la Roadmap
        </label>
      </div>

      {isEnabled && (
        <div className="flex items-center gap-2 ml-6">
          <Select
            value={selectedMonth?.toString() ?? 'none'}
            onValueChange={handleMonthChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="none">— Mois</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear?.toString() ?? defaultYear.toString()}
            onValueChange={handleYearChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {getYearOptions().map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

/**
 * Badge compact pour afficher le statut roadmap
 */
export function RoadmapBadge({
  enabled,
  month,
  year,
}: {
  enabled: boolean | null;
  month: number | null;
  year: number | null;
}) {
  if (!enabled) return null;

  const monthLabel = month ? MONTHS.find((m) => m.value === month)?.label?.slice(0, 3) : null;
  const label = monthLabel ? `${monthLabel}. ${year}` : `${year}`;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
      <MapIcon className="h-3 w-3" />
      {label}
    </span>
  );
}
