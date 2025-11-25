import { Button } from "@/components/ui/button";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { format, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfToday, endOfToday } from "date-fns";
import { fr } from "date-fns/locale";

export const PeriodSelector = () => {
  const { filters, setDateRange } = useFilters();
  
  const currentMonth = format(new Date(), "MMMM", { locale: fr });
  const currentYear = new Date().getFullYear();
  
  const periods = [
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
      label: "Cette semaine",
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
    <div className="flex flex-wrap gap-2 justify-center">
      {periods.map((period, idx) => {
        const isActive = filters.periodLabel === period.value;
        return (
          <Button
            key={idx}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={period.action}
            className={`text-sm font-medium px-4 py-2 transition-all ${
              isActive 
                ? "bg-green-600 hover:bg-green-700 text-white" 
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
