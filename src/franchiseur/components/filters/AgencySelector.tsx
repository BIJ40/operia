import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useFranchiseur } from "@/franchiseur/contexts/FranchiseurContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AgencySelector() {
  const [open, setOpen] = useState(false);
  const { selectedAgencies, setSelectedAgencies, assignedAgencies, franchiseurRole } = useFranchiseur();

  const { data: allAgencies = [] } = useQuery({
    queryKey: ['apogee-agencies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('*')
        .eq('is_active', true)
        .order('label');
      
      if (error) throw error;
      return data;
    },
  });

  // Filter agencies based on role
  const availableAgencies = franchiseurRole === 'animateur' && assignedAgencies.length > 0
    ? allAgencies.filter(a => assignedAgencies.includes(a.id))
    : allAgencies;

  const handleSelectAll = () => {
    setSelectedAgencies([]);
    setOpen(false);
  };

  const handleToggleAgency = (agencyId: string) => {
    if (selectedAgencies.includes(agencyId)) {
      setSelectedAgencies(selectedAgencies.filter(id => id !== agencyId));
    } else {
      setSelectedAgencies([...selectedAgencies, agencyId]);
    }
  };

  const getDisplayText = () => {
    if (selectedAgencies.length === 0) {
      return "Toutes les agences";
    }
    if (selectedAgencies.length === 1) {
      const agency = allAgencies.find(a => a.id === selectedAgencies[0]);
      return agency?.label || "1 agence";
    }
    return `${selectedAgencies.length} agences`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between border-l-4 border-l-accent"
        >
          {getDisplayText()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher une agence..." />
          <CommandList>
            <CommandEmpty>Aucune agence trouvée.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={handleSelectAll}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedAgencies.length === 0 ? "opacity-100" : "opacity-0"
                  )}
                />
                Toutes les agences
              </CommandItem>
              {availableAgencies.map((agency) => (
                <CommandItem
                  key={agency.id}
                  value={agency.label}
                  onSelect={() => handleToggleAgency(agency.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedAgencies.includes(agency.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {agency.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
