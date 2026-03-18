import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ChevronRight, ChevronLeft, Pencil, Check, X } from 'lucide-react';
import { 
  CHARGE_LABELS, 
  ONBOARDING_STEPS, 
  type FinancialCharge, 
  type ChargeType,
  type ChargeCategory 
} from '@/hooks/useFinancialCharges';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

interface ChargesBlockProps {
  charges: FinancialCharge[];
  isLocked: boolean;
  isLoading: boolean;
  onCreateCharge: (values: { charge_type: ChargeType; category: ChargeCategory; amount: number }) => Promise<any>;
  onUpdateCharge?: (params: { charge_id: string; new_amount: number; new_start_month: string; notes?: string }) => Promise<any>;
  year: number;
  month: number;
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

export function ChargesBlock({ charges, isLocked, isLoading, onCreateCharge, onUpdateCharge, year, month }: ChargesBlockProps) {
  const [step, setStep] = useState(0);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const { toast } = useToast();

  const currentStep = ONBOARDING_STEPS[step];
  const hasCharges = charges.length > 0;

  const totalFixes = charges.filter(c => c.category === 'FIXE').reduce((s, c) => s + c.amount, 0);
  const totalVariables = charges.filter(c => c.category === 'VARIABLE').reduce((s, c) => s + c.amount, 0);

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

  const handleStartEdit = (charge: FinancialCharge) => {
    if (isLocked || !onUpdateCharge) return;
    setEditingId(charge.id);
    setEditAmount(String(charge.amount));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
  };

  const handleSaveEdit = async (charge: FinancialCharge) => {
    if (!onUpdateCharge) return;
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) return;
    if (newAmount === charge.amount) {
      handleCancelEdit();
      return;
    }
    setSaving(true);
    try {
      const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
      await onUpdateCharge({
        charge_id: charge.id,
        new_amount: newAmount,
        new_start_month: monthDate,
      });
      toast({ title: 'Charge mise à jour' });
      handleCancelEdit();
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
          <div className="space-y-2">
            {charges.map(c => (
              <div key={c.id} className="flex justify-between items-center group">
                <span className="text-sm text-muted-foreground">{CHARGE_LABELS[c.charge_type as ChargeType] ?? c.charge_type}</span>
                {editingId === c.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="w-24 h-7 text-sm"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(c);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(c)} disabled={saving}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatCurrency(c.amount)}
                    </span>
                    {!isLocked && onUpdateCharge && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleStartEdit(c)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {/* Totals */}
            <div className="border-t pt-2 mt-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Total charges fixes</span>
                <span className="text-xs font-semibold tabular-nums text-foreground">{formatCurrency(totalFixes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Total charges variables</span>
                <span className="text-xs font-semibold tabular-nums text-foreground">{formatCurrency(totalVariables)}</span>
              </div>
            </div>
          </div>
        ) : currentStep ? (
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
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStep(s => s - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Précédent
                </Button>
              )}
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
