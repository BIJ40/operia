import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ChevronRight } from 'lucide-react';
import { 
  CHARGE_LABELS, 
  ONBOARDING_STEPS, 
  type FinancialCharge, 
  type ChargeType,
  type ChargeCategory 
} from '@/hooks/useFinancialCharges';
import { useToast } from '@/hooks/use-toast';

interface ChargesBlockProps {
  charges: FinancialCharge[];
  isLocked: boolean;
  isLoading: boolean;
  onCreateCharge: (values: { charge_type: ChargeType; category: ChargeCategory; amount: number }) => Promise<any>;
}

const CHARGE_CATEGORY_MAP: Record<ChargeType, ChargeCategory> = {
  salaires: 'VARIABLE',
  charges_sociales: 'VARIABLE',
  loyer: 'FIXE',
  assurances: 'FIXE',
  telecom: 'FIXE',
  vehicules: 'FIXE',
  divers: 'VARIABLE',
};

export function ChargesBlock({ charges, isLocked, isLoading, onCreateCharge }: ChargesBlockProps) {
  const [step, setStep] = useState(0);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const currentStep = ONBOARDING_STEPS[step];
  const hasCharges = charges.length > 0;

  const getExistingAmount = (type: ChargeType): number => {
    const existing = charges.find(c => c.charge_type === type);
    return existing?.amount ?? 0;
  };

  const handleSaveStep = async () => {
    if (isLocked || !currentStep) return;
    setSaving(true);
    try {
      for (const type of currentStep.types) {
        const rawVal = amounts[type];
        const val = rawVal ? parseFloat(rawVal) : 0;
        const existing = charges.find(c => c.charge_type === type);
        if (!existing && val > 0) {
          await onCreateCharge({
            charge_type: type,
            category: CHARGE_CATEGORY_MAP[type],
            amount: val,
          });
        }
      }
      if (step < ONBOARDING_STEPS.length - 1) {
        setStep(s => s + 1);
      }
      toast({ title: 'Charges enregistrées' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Charges
          </CardTitle>
          {isLocked && <Badge variant="secondary">Verrouillé</Badge>}
        </div>
        {/* Step indicator */}
        {!hasCharges && (
          <div className="flex gap-1 mt-2">
            {ONBOARDING_STEPS.map((s, i) => (
              <div
                key={s.label}
                className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 animate-pulse bg-muted rounded" />
        ) : hasCharges ? (
          // Existing charges view
          <div className="space-y-2">
            {charges.map(c => (
              <div key={c.id} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{CHARGE_LABELS[c.charge_type] ?? c.charge_type}</span>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {c.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        ) : currentStep ? (
          // Onboarding stepper
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-medium">
              Étape {step + 1}/{ONBOARDING_STEPS.length} — {currentStep.label}
            </p>
            {currentStep.types.map(type => {
              const existing = getExistingAmount(type);
              return (
                <div key={type} className="flex items-center gap-3">
                  <label className="text-sm text-foreground min-w-[140px]">{CHARGE_LABELS[type]}</label>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    placeholder="0"
                    disabled={isLocked || existing > 0}
                    defaultValue={existing > 0 ? existing : undefined}
                    value={amounts[type] ?? ''}
                    onChange={e => setAmounts(prev => ({ ...prev, [type]: e.target.value }))}
                    className="max-w-[160px]"
                  />
                  <span className="text-xs text-muted-foreground">€</span>
                </div>
              );
            })}
            <Button
              size="sm"
              onClick={handleSaveStep}
              disabled={isLocked || saving}
              className="gap-1"
            >
              {step < ONBOARDING_STEPS.length - 1 ? 'Suivant' : 'Terminer'}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
