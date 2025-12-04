import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Check, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LeaveType, EventSubtype, LEAVE_TYPE_LABELS, EVENT_SUBTYPE_LABELS } from '@/types/leaveRequest';
import { useCreateLeaveRequest, useFrenchHolidays, calculateLeaveDays } from '@/hooks/useLeaveRequests';

interface LeaveRequestWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 
  | 'type' 
  | 'event_subtype' 
  | 'start_date' 
  | 'end_date' 
  | 'justification'
  | 'summary';

interface WizardState {
  type: LeaveType | null;
  eventSubtype: EventSubtype | null;
  startDate: Date | null;
  endDate: Date | null;
  hasJustification: boolean;
}

export function LeaveRequestWizard({ open, onOpenChange }: LeaveRequestWizardProps) {
  const [step, setStep] = useState<WizardStep>('type');
  const [state, setState] = useState<WizardState>({
    type: null,
    eventSubtype: null,
    startDate: null,
    endDate: null,
    hasJustification: false,
  });

  const currentYear = new Date().getFullYear();
  const { data: holidays = [] } = useFrenchHolidays(currentYear);
  const { data: holidaysNextYear = [] } = useFrenchHolidays(currentYear + 1);
  const allHolidays = [...holidays, ...holidaysNextYear];

  const createMutation = useCreateLeaveRequest();

  const resetWizard = () => {
    setStep('type');
    setState({
      type: null,
      eventSubtype: null,
      startDate: null,
      endDate: null,
      hasJustification: false,
    });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const getNextStep = (): WizardStep | null => {
    switch (step) {
      case 'type':
        if (state.type === 'EVENT') return 'event_subtype';
        return 'start_date';
      case 'event_subtype':
        return 'justification';
      case 'justification':
        return 'start_date';
      case 'start_date':
        if (state.type === 'MALADIE') return 'summary';
        return 'end_date';
      case 'end_date':
        return 'summary';
      default:
        return null;
    }
  };

  const getPrevStep = (): WizardStep | null => {
    switch (step) {
      case 'event_subtype':
        return 'type';
      case 'justification':
        return 'event_subtype';
      case 'start_date':
        if (state.type === 'EVENT') return 'justification';
        return 'type';
      case 'end_date':
        return 'start_date';
      case 'summary':
        if (state.type === 'MALADIE') return 'start_date';
        return 'end_date';
      default:
        return null;
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'type':
        return !!state.type;
      case 'event_subtype':
        return !!state.eventSubtype;
      case 'start_date':
        return !!state.startDate;
      case 'end_date':
        return !!state.endDate;
      case 'justification':
        return true; // Optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    const next = getNextStep();
    if (next) setStep(next);
  };

  const handlePrev = () => {
    const prev = getPrevStep();
    if (prev) setStep(prev);
  };

  const calculateDays = (): number => {
    if (!state.startDate || !state.endDate || !state.type) return 0;
    return calculateLeaveDays(state.startDate, state.endDate, state.type, allHolidays);
  };

  const handleSubmit = async () => {
    if (!state.type || !state.startDate) return;

    const daysCount = state.type !== 'MALADIE' && state.endDate 
      ? calculateDays() 
      : null;

    await createMutation.mutateAsync({
      type: state.type,
      event_subtype: state.eventSubtype,
      start_date: format(state.startDate, 'yyyy-MM-dd'),
      end_date: state.endDate ? format(state.endDate, 'yyyy-MM-dd') : null,
      days_count: daysCount,
      requires_justification: state.type === 'MALADIE' || state.type === 'EVENT',
    });

    handleClose();
  };

  const getStepTitle = (): string => {
    switch (step) {
      case 'type':
        return 'Type d\'absence';
      case 'event_subtype':
        return 'Type d\'événement';
      case 'start_date':
        return 'Date de début';
      case 'end_date':
        return 'Date de fin';
      case 'justification':
        return 'Justificatif';
      case 'summary':
        return 'Récapitulatif';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-helpconfort-blue" />
            {getStepTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Step: Type selection */}
          {step === 'type' && (
            <RadioGroup
              value={state.type || ''}
              onValueChange={(value) => setState({ ...state, type: value as LeaveType })}
              className="space-y-3"
            >
              {(['CP', 'SANS_SOLDE', 'EVENT', 'MALADIE'] as LeaveType[]).map((type) => (
                <div
                  key={type}
                  className={cn(
                    'flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors',
                    state.type === type 
                      ? 'border-helpconfort-blue bg-helpconfort-blue/5' 
                      : 'border-border hover:border-helpconfort-blue/50'
                  )}
                  onClick={() => setState({ ...state, type })}
                >
                  <RadioGroupItem value={type} id={type} />
                  <Label htmlFor={type} className="cursor-pointer font-medium">
                    {LEAVE_TYPE_LABELS[type]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Step: Event subtype */}
          {step === 'event_subtype' && (
            <RadioGroup
              value={state.eventSubtype || ''}
              onValueChange={(value) => setState({ ...state, eventSubtype: value as EventSubtype })}
              className="space-y-3"
            >
              {(['MARIAGE', 'NAISSANCE', 'DECES'] as EventSubtype[]).map((subtype) => (
                <div
                  key={subtype}
                  className={cn(
                    'flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors',
                    state.eventSubtype === subtype 
                      ? 'border-helpconfort-blue bg-helpconfort-blue/5' 
                      : 'border-border hover:border-helpconfort-blue/50'
                  )}
                  onClick={() => setState({ ...state, eventSubtype: subtype })}
                >
                  <RadioGroupItem value={subtype} id={subtype} />
                  <Label htmlFor={subtype} className="cursor-pointer font-medium">
                    {EVENT_SUBTYPE_LABELS[subtype]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Step: Justification notice */}
          {step === 'justification' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Upload className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      Justificatif requis
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      Un justificatif vous sera demandé pour finaliser cette demande 
                      (acte de mariage, acte de naissance, certificat de décès).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Start date */}
          {step === 'start_date' && (
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={state.startDate || undefined}
                onSelect={(date) => setState({ ...state, startDate: date || null })}
                locale={fr}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
          )}

          {/* Step: End date */}
          {step === 'end_date' && (
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={state.endDate || undefined}
                onSelect={(date) => setState({ ...state, endDate: date || null })}
                locale={fr}
                disabled={(date) => !state.startDate || date < state.startDate}
                className="rounded-md border"
              />
            </div>
          )}

          {/* Step: Summary */}
          {step === 'summary' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">
                    {state.type && LEAVE_TYPE_LABELS[state.type]}
                    {state.eventSubtype && ` - ${EVENT_SUBTYPE_LABELS[state.eventSubtype]}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date de début</span>
                  <span className="font-medium">
                    {state.startDate && format(state.startDate, 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                {state.type !== 'MALADIE' && state.endDate && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date de fin</span>
                      <span className="font-medium">
                        {format(state.endDate, 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-muted-foreground">Nombre de jours</span>
                      <span className="font-bold text-helpconfort-blue text-lg">
                        {calculateDays()} jour{calculateDays() > 1 ? 's' : ''}
                      </span>
                    </div>
                  </>
                )}
                {state.type === 'MALADIE' && (
                  <div className="text-sm text-muted-foreground italic">
                    La date de fin sera renseignée par votre responsable.
                  </div>
                )}
              </div>

              {(state.type === 'MALADIE' || state.type === 'EVENT') && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  Un justificatif vous sera demandé pour finaliser cette demande.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 'type'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          {step === 'summary' ? (
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
            >
              <Check className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Envoi...' : 'Valider la demande'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
