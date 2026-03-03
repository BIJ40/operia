/**
 * DossierStepper — 6-step horizontal pipeline stepper
 * Uses V2 stepper data if available, falls back to V1 dates
 */

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { STEPPER_STEPS_ORDERED, STEPPER_LABELS, type StepperStep, type DossierV2Data } from '../../types/apporteur-dossier-v2';

interface DossierStepperProps {
  v2?: DossierV2Data;
  /** Fallback V1 dates */
  dates?: {
    dateCreation?: string | null;
    datePremierRdv?: string | null;
    dateDevisEnvoye?: string | null;
    dateDevisValide?: string | null;
    dateFacture?: string | null;
    dateReglement?: string | null;
  };
}

const V1_DATE_MAP: Record<StepperStep, string> = {
  created: 'dateCreation',
  rdv_planned: 'datePremierRdv',
  devis_sent: 'dateDevisEnvoye',
  devis_validated: 'dateDevisValide',
  invoice_sent: 'dateFacture',
  invoice_paid: 'dateReglement',
};

export function DossierStepper({ v2, dates }: DossierStepperProps) {
  const completed = new Set<StepperStep>();
  let currentStep: StepperStep = 'created';

  if (v2?.stepper) {
    v2.stepper.completed.forEach(s => completed.add(s));
    currentStep = v2.stepper.status;
  } else if (dates) {
    // Fallback: infer from V1 dates
    for (const step of STEPPER_STEPS_ORDERED) {
      const dateKey = V1_DATE_MAP[step];
      if (dates[dateKey as keyof typeof dates]) {
        completed.add(step);
        currentStep = step;
      }
    }
  }

  const currentIdx = STEPPER_STEPS_ORDERED.indexOf(currentStep);

  return (
    <div className="flex items-center w-full gap-0">
      {STEPPER_STEPS_ORDERED.map((step, i) => {
        const isDone = completed.has(step);
        const isCurrent = step === currentStep;
        const isPast = i < currentIdx;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                isDone || isPast
                  ? 'bg-primary border-primary text-primary-foreground'
                  : isCurrent
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-muted-foreground/30 text-muted-foreground/50 bg-background'
              )}>
                {isDone || isPast ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={cn(
                'text-[10px] mt-1 text-center leading-tight max-w-[60px]',
                isDone || isPast || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground/60'
              )}>
                {STEPPER_LABELS[step]}
              </span>
            </div>

            {/* Connector */}
            {i < STEPPER_STEPS_ORDERED.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-1 mt-[-16px]',
                i < currentIdx ? 'bg-primary' : 'bg-muted-foreground/20'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
