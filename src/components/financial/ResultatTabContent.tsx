/**
 * ResultatTabContent — Full P&L orchestrator matching Excel "Compte de Résultats"
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, Keyboard, Calculator, Zap } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { CompletionIndicator } from './CompletionIndicator';
import { KpiRow } from './KpiRow';
import { PLSectionBlock } from './PLSectionBlock';
import { PL_SECTIONS } from '@/config/financialLineItems';
import { useFinancialMonth } from '@/hooks/useFinancialMonth';
import { useFinancialCharges } from '@/hooks/useFinancialCharges';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useCollaboratorCount } from '@/hooks/useCollaboratorCount';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function ResultatTabContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { toast } = useToast();

  const { isLocked, isLoading: monthLoading, upsertMonth, financialMonth } = useFinancialMonth(year, month);
  const { charges, completionScore, isLoading: chargesLoading, createCharge, updateChargeViaRpc } = useFinancialCharges(year, month);
  const { summary, isLoading: summaryLoading } = useFinancialSummary(year, month);
  const { count: collaboratorCount } = useCollaboratorCount();

  const isLoading = monthLoading || chargesLoading || summaryLoading;

  const handleMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  const handleSaveMonthlyField = async (field: string, value: number) => {
    try {
      await upsertMonth.mutateAsync({ [field]: value });
      toast({ title: 'Donnée enregistrée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleCreateCharge = async (values: { charge_type: string; category: 'FIXE' | 'VARIABLE'; amount: number }) => {
    try {
      await createCharge.mutateAsync(values);
      toast({ title: 'Charge enregistrée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleUpdateCharge = async (params: { charge_id: string; new_amount: number; new_start_month: string }) => {
    try {
      await updateChargeViaRpc.mutateAsync(params);
      toast({ title: 'Charge mise à jour' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const hasNoData = !summary && !isLoading;

  // Auto-populate nb_salaries from collaborators count if not yet set
  const autoValues: Record<string, number> = {};
  if (collaboratorCount > 0 && (!financialMonth || !financialMonth.nb_salaries)) {
    autoValues['nb_salaries'] = collaboratorCount;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <MonthSelector year={year} month={month} onChange={handleMonthChange} />
        <div className="flex items-center gap-3">
          {isLocked && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Verrouillé
            </Badge>
          )}
          <div className="w-48">
            <CompletionIndicator score={completionScore} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Keyboard className="h-3 w-3 text-amber-500" /> Saisie mensuelle</span>
        <span className="flex items-center gap-1"><Keyboard className="h-3 w-3 text-green-500" /> Fixe annuel</span>
        <span className="flex items-center gap-1"><Keyboard className="h-3 w-3 text-orange-500" /> Variable mensuel</span>
        <span className="flex items-center gap-1"><Calculator className="h-3 w-3 text-muted-foreground" /> Calculé</span>
      </div>

      {/* Empty state */}
      {hasNoData && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Aucune donnée pour ce mois. Saisissez les données d'activité, de masse salariale et de charges pour calculer votre résultat.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <KpiRow summary={summary} isLoading={summaryLoading} />

      {/* P&L Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left column: Activité, CA, Masse salariale, Achats/Marges */}
        <div className="space-y-3">
          {PL_SECTIONS.filter(s => ['activite', 'ca', 'masse_salariale', 'achats_marges'].includes(s.key)).map(section => (
            <PLSectionBlock
              key={section.key}
              section={section}
              summary={summary}
              charges={charges}
              isLocked={isLocked}
              isLoading={isLoading}
              onSaveMonthlyField={handleSaveMonthlyField}
              onCreateCharge={handleCreateCharge}
              onUpdateCharge={handleUpdateCharge}
              year={year}
              month={month}
              defaultCollapsed={section.key === 'ca'}
              autoValues={autoValues}
            />
          ))}
        </div>

        {/* Right column: Improductifs, Charges agence/locations/externes/autres, Résultat */}
        <div className="space-y-3">
          {PL_SECTIONS.filter(s => ['improductifs', 'charges_agence', 'locations', 'charges_externes', 'autres', 'resultat'].includes(s.key)).map(section => (
            <PLSectionBlock
              key={section.key}
              section={section}
              summary={summary}
              charges={charges}
              isLocked={isLocked}
              isLoading={isLoading}
              onSaveMonthlyField={handleSaveMonthlyField}
              onCreateCharge={handleCreateCharge}
              onUpdateCharge={handleUpdateCharge}
              year={year}
              month={month}
              defaultCollapsed={['charges_agence', 'locations', 'charges_externes', 'autres'].includes(section.key)}
              autoValues={autoValues}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
