/**
 * Sélecteur de prise en charge Apogée ↔ HC
 * 5 boutons toggle : APO | 75/25 | 50/50 | 25/75 | HC
 * Clic sur le bouton actif = désélection (null)
 */

import { cn } from '@/lib/utils';

interface OwnerSideSliderProps {
  value: number | null; // null = non déterminé, 0/25/50/75/100
  onChange: (value: number | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

const STEPS = [
  { value: 0, label: 'APO', labelFull: 'Apogée', apogee: 100, hc: 0, color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-100', ring: 'ring-blue-400' },
  { value: 25, label: '75/25', labelFull: '75/25', apogee: 75, hc: 25, color: 'bg-blue-400', text: 'text-indigo-700', bg: 'bg-indigo-100', ring: 'ring-indigo-400' },
  { value: 50, label: '50/50', labelFull: '50/50', apogee: 50, hc: 50, color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-100', ring: 'ring-purple-400' },
  { value: 75, label: '25/75', labelFull: '25/75', apogee: 25, hc: 75, color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-100', ring: 'ring-orange-400' },
  { value: 100, label: 'HC', labelFull: 'HC', apogee: 0, hc: 100, color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-100', ring: 'ring-orange-400' },
];

export function OwnerSideSlider({ value, onChange, disabled, compact = false }: OwnerSideSliderProps) {
  const currentStep = value !== null
    ? STEPS.reduce((prev, curr) => Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev)
    : null;

  const handleClick = (stepValue: number) => {
    if (disabled) return;
    // Toggle: clic sur le bouton actif = désélection
    onChange(currentStep?.value === stepValue ? null : stepValue);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {STEPS.map((step) => {
          const isActive = currentStep?.value === step.value;
          return (
            <button
              key={step.value}
              type="button"
              onClick={() => handleClick(step.value)}
              disabled={disabled}
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-semibold rounded transition-all leading-tight",
                "border border-transparent",
                isActive
                  ? cn(step.bg, step.text, "border-current/20 ring-1", step.ring)
                  : "text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Boutons */}
      <div className="flex items-center gap-1">
        {STEPS.map((step) => {
          const isActive = currentStep?.value === step.value;
          return (
            <button
              key={step.value}
              type="button"
              onClick={() => handleClick(step.value)}
              disabled={disabled}
              className={cn(
                "flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all",
                "border-2",
                isActive
                  ? cn(step.bg, step.text, "border-current/30 shadow-sm")
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {step.labelFull}
            </button>
          );
        })}
      </div>

      {/* Affichage sélection */}
      <div className="flex items-center justify-center gap-3 text-xs">
        {!currentStep ? (
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">
            Non déterminé
          </span>
        ) : (
          <>
            <span className={cn("px-2 py-0.5 rounded", currentStep.apogee > 0 ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground")}>
              Apogée: {currentStep.apogee}%
            </span>
            <span className={cn("px-2 py-0.5 rounded", currentStep.hc > 0 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground")}>
              HC: {currentStep.hc}%
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
      return null;
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

export function isOwnerSideIncomplete(ownerSide: string | null): boolean {
  return ownerSide === null || ownerSide === undefined || ownerSide === '';
}

export function sliderValueToRatio(value: number | null): { apogee: number; hc: number } | null {
  if (value === null) return null;
  const step = STEPS.reduce((prev, curr) => 
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  );
  return { apogee: step.apogee, hc: step.hc };
}
