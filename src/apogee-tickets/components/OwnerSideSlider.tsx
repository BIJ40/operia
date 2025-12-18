/**
 * Slider pour la prise en charge Apogée ↔ HC
 * Valeurs: null (non déterminé), 0 (Apogée), 25 (75/25), 50 (50/50), 75 (25/75), 100 (HC)
 */

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OwnerSideSliderProps {
  value: number | null; // null = non déterminé, 0-100 = valeur
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

const STEPS = [
  { value: 0, label: 'Apogée', apogee: 100, hc: 0 },
  { value: 25, label: '75/25', apogee: 75, hc: 25 },
  { value: 50, label: '50/50', apogee: 50, hc: 50 },
  { value: 75, label: '25/75', apogee: 25, hc: 75 },
  { value: 100, label: 'HC', apogee: 0, hc: 100 },
];

export function OwnerSideSlider({ value, onChange, disabled }: OwnerSideSliderProps) {
  const isUndetermined = value === null;
  const currentValue = value ?? 50; // Position visuelle par défaut au milieu
  const currentStep = isUndetermined ? null : STEPS.reduce((prev, curr) => 
    Math.abs(curr.value - currentValue) < Math.abs(prev.value - currentValue) ? curr : prev
  );

  const handleSliderChange = (v: number) => {
    onChange(v);
  };

  const handleReset = () => {
    onChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Header avec état et bouton reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-600">Apogée</span>
          {isUndetermined && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
              P.E.C à définir
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isUndetermined && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={disabled}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              Réinitialiser
            </Button>
          )}
          <span className="text-sm font-medium text-orange-600">HC</span>
        </div>
      </div>
      
      {/* Slider */}
      <div className="relative pt-1">
        <Slider
          value={[currentValue]}
          onValueChange={([v]) => {
            // Snap to nearest step value
            const snappedValue = STEPS.reduce((prev, curr) => 
              Math.abs(curr.value - v) < Math.abs(prev.value - v) ? curr : prev
            ).value;
            handleSliderChange(snappedValue);
          }}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          className={cn("cursor-pointer", isUndetermined && "opacity-50")}
          trackClassName="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500"
          rangeClassName="bg-transparent"
        />
        
        {/* Step markers - cliquables */}
        <div className="absolute top-1 left-0 right-0 flex justify-between">
          {STEPS.map((step) => (
            <button
              key={step.value}
              type="button"
              onClick={() => !disabled && handleSliderChange(step.value)}
              disabled={disabled}
              className={cn(
                "w-3 h-3 rounded-full border-2 transition-all cursor-pointer hover:scale-110",
                !isUndetermined && currentValue === step.value
                  ? "bg-white border-primary scale-125"
                  : "bg-white/50 border-white/70 hover:bg-white hover:border-white"
              )}
            />
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {STEPS.map((step) => (
          <button
            key={step.value}
            type="button"
            onClick={() => !disabled && handleSliderChange(step.value)}
            disabled={disabled}
            className={cn(
              "px-1.5 py-0.5 rounded transition-colors",
              !isUndetermined && currentValue === step.value
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted"
            )}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Current selection display */}
      <div className="flex items-center justify-center gap-3 text-sm">
        {isUndetermined ? (
          <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">
            Non déterminé
          </span>
        ) : (
          <>
            <span className={cn(
              "px-2 py-1 rounded",
              currentStep && currentStep.apogee > 0 ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
            )}>
              Apogée: {currentStep?.apogee ?? 0}%
            </span>
            <span className={cn(
              "px-2 py-1 rounded",
              currentStep && currentStep.hc > 0 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
            )}>
              HC: {currentStep?.hc ?? 0}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Helpers pour convertir owner_side DB ↔ slider value
export function ownerSideToSliderValue(ownerSide: string | null): number | null {
  if (!ownerSide) return null;
  const id = ownerSide.toUpperCase();
  switch (id) {
    case 'APOGEE': 
    case 'APOGÉE': 
      return 0;
    case '75_25': 
    case '75/25': 
      return 25;
    case '50_50': 
    case '50/50': 
    case 'PARTAGE': 
      return 50;
    case '25_75': 
    case '25/75': 
      return 75;
    case 'HC': 
    case 'HELPCONFORT': 
      return 100;
    default: 
      return null; // Non déterminé
  }
}

export function sliderValueToOwnerSide(value: number | null): 'APOGEE' | '75_25' | '50_50' | '25_75' | 'HC' | null {
  if (value === null) return null;
  if (value <= 12) return 'APOGEE';
  if (value <= 37) return '75_25';
  if (value <= 62) return '50_50';
  if (value <= 87) return '25_75';
  return 'HC';
}

// Vérifie si la P.E.C est incomplète
export function isOwnerSideIncomplete(ownerSide: string | null): boolean {
  return ownerSide === null || ownerSide === undefined || ownerSide === '';
}

// Stocke aussi le ratio exact pour affichage
export function sliderValueToRatio(value: number | null): { apogee: number; hc: number } | null {
  if (value === null) return null;
  const step = STEPS.reduce((prev, curr) => 
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  );
  return { apogee: step.apogee, hc: step.hc };
}
