/**
 * Slider pour la prise en charge Apogée ↔ HC
 * Valeurs: 0 (Apogée), 25 (75/25), 50 (50/50), 75 (25/75), 100 (HC)
 */

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface OwnerSideSliderProps {
  value: number | null; // 0-100
  onChange: (value: number) => void;
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
  const currentValue = value ?? 50;
  const currentStep = STEPS.reduce((prev, curr) => 
    Math.abs(curr.value - currentValue) < Math.abs(prev.value - currentValue) ? curr : prev
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-blue-600">Apogée</span>
        <span className="text-orange-600">HC</span>
      </div>
      
      {/* Slider */}
      <div className="relative pt-1">
        <Slider
          value={[currentValue]}
          onValueChange={([v]) => onChange(v)}
          min={0}
          max={100}
          step={25}
          disabled={disabled}
          className="cursor-pointer"
          trackClassName="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500"
          rangeClassName="bg-transparent"
        />
        
        {/* Step markers */}
        <div className="absolute top-1 left-0 right-0 flex justify-between pointer-events-none">
          {STEPS.map((step) => (
            <div
              key={step.value}
              className={cn(
                "w-3 h-3 rounded-full border-2 transition-all",
                currentValue === step.value
                  ? "bg-white border-primary scale-125"
                  : "bg-white/50 border-white/70"
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
            onClick={() => !disabled && onChange(step.value)}
            disabled={disabled}
            className={cn(
              "px-1.5 py-0.5 rounded transition-colors",
              currentValue === step.value
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
        <span className={cn(
          "px-2 py-1 rounded",
          currentStep.apogee > 0 ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
        )}>
          Apogée: {currentStep.apogee}%
        </span>
        <span className={cn(
          "px-2 py-1 rounded",
          currentStep.hc > 0 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
        )}>
          HC: {currentStep.hc}%
        </span>
      </div>
    </div>
  );
}

// Helpers pour convertir owner_side DB ↔ slider value
export function ownerSideToSliderValue(ownerSide: string | null): number {
  switch (ownerSide) {
    case 'APOGEE': return 0;
    case 'PARTAGE': return 50;
    case 'HC': return 100;
    default: return 50;
  }
}

export function sliderValueToOwnerSide(value: number): 'APOGEE' | 'HC' | 'PARTAGE' {
  if (value <= 12) return 'APOGEE';
  if (value >= 88) return 'HC';
  return 'PARTAGE';
}

// Stocke aussi le ratio exact pour affichage
export function sliderValueToRatio(value: number): { apogee: number; hc: number } {
  const step = STEPS.reduce((prev, curr) => 
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  );
  return { apogee: step.apogee, hc: step.hc };
}
