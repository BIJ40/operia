import { Button } from "@/components/ui/button";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { format, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfToday, endOfToday } from "date-fns";
import { fr } from "date-fns/locale";

export const SecondaryPeriodSelector = () => {
  const { filters, setDateRange } = useSecondaryFilters();
  
  const currentMonth = format(new Date(), "MMMM", { locale: fr });
  const currentYear = new Date().getFullYear();
  
  const periods = [
    {
      label: "Toutes",
      action: () => setDateRange(new Date(2020, 0, 1), new Date(2030, 11, 31), "toutes périodes"),
      value: "toutes périodes",
    },
    {
      label: "Aujourd'hui",
      action: () => setDateRange(startOfToday(), endOfToday(), "aujourd'hui"),
      value: "aujourd'hui",
    },
    {
      label: "Hier",
      action: () => setDateRange(startOfYesterday(), endOfYesterday(), "hier"),
      value: "hier",
    },
    {
      label: "Semaine",
      action: () => {
        const now = new Date();
        setDateRange(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }), "cette semaine");
      },
      value: "cette semaine",
    },
    {
      label: currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1),
      action: () => {
        const now = new Date();
        const monthLabel = `en ${currentMonth}`;
        setDateRange(startOfMonth(now), endOfMonth(now), monthLabel);
      },
      value: `en ${currentMonth}`,
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
    <div className="flex flex-wrap gap-2 justify-center items-center">
      <span className="text-sm text-muted-foreground mr-2">Période:</span>
      {periods.map((period, idx) => {
        const isActive = filters.periodLabel === period.value;
        return (
          <Button
            key={idx}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={period.action}
            className={`text-xs font-medium px-3 py-1 transition-all ${
              isActive 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "hover:bg-muted"
            }`}
          >
            {period.label}
          </Button>
        );
      })}
    </div>
  );
};
