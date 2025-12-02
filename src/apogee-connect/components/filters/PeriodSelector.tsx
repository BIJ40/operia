import { Button } from "@/components/ui/button";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { format, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfToday, endOfToday, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

export const PeriodSelector = () => {
  const { filters, setDateRange } = useFilters();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  
  const currentMonth = format(new Date(), "MMMM", { locale: fr });
  const currentYear = new Date().getFullYear();
  const lastMonth = format(subMonths(new Date(), 1), "MMMM", { locale: fr });
  
  // Fonction pour obtenir les 3 premiers caractères en majuscules
  const getMonthShort = (monthName: string) => {
    return monthName.slice(0, 3).toUpperCase();
  };

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      const label = `${format(customStartDate, "dd/MM")} - ${format(customEndDate, "dd/MM")}`;
      setDateRange(customStartDate, customEndDate, label);
      setShowCustomPicker(false);
    }
  };
  
  const periods = [
    {
      label: "JOUR",
      action: () => setDateRange(startOfToday(), endOfToday(), "aujourd'hui"),
      value: "aujourd'hui",
    },
    {
      label: "J-1",
      action: () => setDateRange(startOfYesterday(), endOfYesterday(), "hier"),
      value: "hier",
    },
    {
      label: "SEMAINE",
      action: () => {
        const now = new Date();
        setDateRange(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }), "cette semaine");
      },
      value: "cette semaine",
    },
    {
      label: getMonthShort(currentMonth),
      action: () => {
        const now = new Date();
        const monthLabel = `en ${currentMonth}`;
        setDateRange(startOfMonth(now), endOfMonth(now), monthLabel);
      },
      value: `en ${currentMonth}`,
    },
    {
      label: getMonthShort(lastMonth),
      action: () => {
        const lastMonthDate = subMonths(new Date(), 1);
        const monthLabel = `en ${lastMonth}`;
        setDateRange(startOfMonth(lastMonthDate), endOfMonth(lastMonthDate), monthLabel);
      },
      value: `en ${lastMonth}`,
    },
    {
      label: `${currentYear}`,
      action: () => {
        const now = new Date();
        setDateRange(startOfYear(now), endOfYear(now), `en ${currentYear}`);
      },
      value: `en ${currentYear}`,
    },
  ];
  
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {periods.map((period, idx) => {
        const isActive = filters.periodLabel === period.value;
        return (
          <Button
            key={idx}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={period.action}
            className={`text-xs font-medium px-3 py-1.5 transition-all ${
              isActive 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "hover:bg-muted"
            }`}
          >
            {period.label}
          </Button>
        );
      })}
      
      {/* Bouton CHOISIR pour sélection personnalisée */}
      <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium px-3 py-1.5 hover:bg-muted"
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            CHOISIR
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background z-50" align="end">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Date de début</p>
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={setCustomStartDate}
                locale={fr}
                className={cn("rounded-md border pointer-events-auto")}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Date de fin</p>
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={setCustomEndDate}
                locale={fr}
                disabled={(date) => customStartDate ? date < customStartDate : false}
                className={cn("rounded-md border pointer-events-auto")}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCustomRangeApply}
                disabled={!customStartDate || !customEndDate}
                className="flex-1"
              >
                Appliquer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowCustomPicker(false);
                  setCustomStartDate(undefined);
                  setCustomEndDate(undefined);
                }}
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
