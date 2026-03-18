/**
 * ResultatTabContent — Main orchestrator for financial result module
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { ActivityBlock } from './ActivityBlock';
import { CABlock } from './CABlock';
import { ChargesBlock } from './ChargesBlock';
import { ResultBlock } from './ResultBlock';
import { CompletionIndicator } from './CompletionIndicator';
import { KpiRow } from './KpiRow';
import { useFinancialMonth } from '@/hooks/useFinancialMonth';
import { useFinancialCharges } from '@/hooks/useFinancialCharges';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResultatTabContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { isLocked, isLoading: monthLoading, isError: monthError } = useFinancialMonth(year, month);
  const { charges, completionScore, isLoading: chargesLoading, isError: chargesError, createCharge, updateChargeViaRpc } = useFinancialCharges(year, month);
  const { summary, isLoading: summaryLoading, isError: summaryError } = useFinancialSummary(year, month);

  const handleMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  const hasNoData = !summary && !summaryLoading && !chargesLoading && !monthLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <MonthSelector year={year} month={month} onChange={handleMonthChange} />
        <div className="flex items-center gap-3">
          {isLocked && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Mois verrouillé
            </Badge>
          )}
          <div className="w-48">
            <CompletionIndicator score={completionScore} />
          </div>
        </div>
      </div>

      {/* Empty state info */}
      {hasNoData && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Aucune donnée financière pour ce mois. Commencez par renseigner vos charges ci-dessous, puis saisissez vos données d'activité pour voir le résultat s'afficher.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <KpiRow summary={summary} isLoading={summaryLoading} />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <ActivityBlock summary={summary} isLoading={summaryLoading} />
          <CABlock summary={summary} isLoading={summaryLoading} />
          <ChargesBlock
            charges={charges}
            isLocked={isLocked}
            isLoading={chargesLoading}
            year={year}
            month={month}
            onCreateCharge={async (values) => {
              await createCharge.mutateAsync(values);
            }}
            onUpdateCharge={async (params) => {
              await updateChargeViaRpc.mutateAsync(params);
            }}
          />
        </div>
        <div>
          <ResultBlock summary={summary} isLoading={summaryLoading} />
        </div>
      </div>
    </div>
  );
}
