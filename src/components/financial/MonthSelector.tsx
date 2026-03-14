import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const isCurrentMonth = year === currentYear && month === currentMonth;
  const isFutureDisabled = year > currentYear || (year === currentYear && month >= currentMonth);

  const goPrev = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };

  const goNext = () => {
    if (isFutureDisabled) return;
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  const label = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr });

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={goPrev} className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium capitalize min-w-[140px] text-center">
        {label}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={goNext}
        disabled={isFutureDisabled}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {isCurrentMonth && (
        <span className="text-xs text-muted-foreground ml-1">Mois en cours</span>
      )}
    </div>
  );
}
