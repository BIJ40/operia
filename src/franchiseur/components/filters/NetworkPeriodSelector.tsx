import { Button } from '@/components/ui/button';
import { NetworkPeriod, useNetworkFilters } from '@/franchiseur/contexts/NetworkFiltersContext';
import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function NetworkPeriodSelector() {
  const { period, setPeriod, dateRange, setDateRange } = useNetworkFilters();
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const periods: { value: NetworkPeriod; label: string }[] = [
    { value: 'day', label: 'Jour' },
    { value: 'day-1', label: 'J-1' },
    { value: 'week', label: 'Semaine' },
    { value: 'week-1', label: 'S-1' },
    { value: 'month', label: 'Mois' },
    { value: 'month-1', label: 'M-1' },
    { value: 'year', label: 'Année' },
  ];

  const handlePeriodChange = (newPeriod: NetworkPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setShowCustomPicker(false);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {periods.map((p) => (
        <Button
          key={p.value}
          onClick={() => handlePeriodChange(p.value)}
          variant={period === p.value ? 'default' : 'outline'}
          className={period === p.value 
            ? 'bg-helpconfort-blue text-white' 
            : 'border-helpconfort-blue/30 hover:border-helpconfort-blue/60 hover:bg-helpconfort-blue/10'
          }
          size="sm"
        >
          {p.label}
        </Button>
      ))}

      <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
        <PopoverTrigger asChild>
          <Button
            variant={period === 'custom' ? 'default' : 'outline'}
            className={period === 'custom'
              ? 'bg-helpconfort-blue text-white'
              : 'border-helpconfort-blue/30 hover:border-helpconfort-blue/60 hover:bg-helpconfort-blue/10'
            }
            size="sm"
            onClick={() => {
              setPeriod('custom');
              setShowCustomPicker(true);
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {period === 'custom' 
              ? `${format(dateRange.from, 'dd/MM', { locale: fr })} - ${format(dateRange.to, 'dd/MM', { locale: fr })}`
              : 'Personnalisé'
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
              }
            }}
            locale={fr}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
