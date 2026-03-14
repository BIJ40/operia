/**
 * ResultatTabContent — Main orchestrator for financial result module
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { ActivityBlock } from './ActivityBlock';
import { CABlock } from './CABlock';
import { ChargesBlock } from './ChargesBlock';
import { ResultBlock } from './ResultBlock';
import { CompletionIndicator } from './CompletionIndicator';
import { useFinancialMonth } from '@/hooks/useFinancialMonth';
import { useFinancialCharges } from '@/hooks/useFinancialCharges';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';

export default function ResultatTabContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { isLocked, isLoading: monthLoading } = useFinancialMonth(year, month);
  const { charges, completionScore, isLoading: chargesLoading, createCharge } = useFinancialCharges(year, month);
  const { summary, isLoading: summaryLoading } = useFinancialSummary(year, month);

  const handleMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

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

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <ActivityBlock summary={summary} isLoading={summaryLoading} />
          <CABlock summary={summary} isLoading={summaryLoading} />
          <ChargesBlock
            charges={charges}
            isLocked={isLocked}
            isLoading={chargesLoading}
            onCreateCharge={async (values) => {
              await createCharge.mutateAsync(values);
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
