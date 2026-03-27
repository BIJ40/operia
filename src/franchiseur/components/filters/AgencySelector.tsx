import { ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useFranchiseur } from "@/franchiseur/contexts/FranchiseurContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export function AgencySelector() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { selectedAgencies, setSelectedAgencies } = useFranchiseur();
  
  const [localSelection, setLocalSelection] = useState<string[]>(selectedAgencies);
  
  useEffect(() => {
    if (open) {
      setLocalSelection(selectedAgencies);
    }
  }, [open, selectedAgencies]);
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && open) {
      setSelectedAgencies(localSelection);
    }
    setOpen(newOpen);
  };

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

  const filteredAgencies = allAgencies.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLocalSelection([]);
  };

  const handleToggleAgency = (agencyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (localSelection.includes(agencyId)) {
      setLocalSelection(localSelection.filter(id => id !== agencyId));
    } else {
      setLocalSelection([...localSelection, agencyId]);
    }
  };

  const getDisplayText = () => {
    if (selectedAgencies.length === 0) {
      return `Toutes les agences (${allAgencies.length})`;
    }
    if (selectedAgencies.length === 1) {
      const agency = allAgencies.find(a => a.id === selectedAgencies[0]);
      return agency?.label || "1 agence";
    }
    return `${selectedAgencies.length} agences`;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between border-l-4 border-l-helpconfort-blue bg-background hover:bg-muted"
        >
          {getDisplayText()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-popover border border-border shadow-lg z-50" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une agence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-background"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          <div
            onClick={handleSelectAll}
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
              localSelection.length === 0 
                ? "bg-helpconfort-blue/10 text-helpconfort-blue" 
                : "hover:bg-muted"
            )}
          >
            <Checkbox 
              checked={localSelection.length === 0}
              className="pointer-events-none border-helpconfort-blue data-[state=checked]:bg-helpconfort-blue data-[state=checked]:text-white"
            />
            <span className="text-sm font-medium">Toutes les agences ({allAgencies.length})</span>
          </div>

          {filteredAgencies.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2 text-center">Aucune agence trouvée</p>
          ) : (
            filteredAgencies.map((agency) => (
              <div
                key={agency.id}
                onClick={(e) => handleToggleAgency(agency.id, e)}
                className={cn(
                  "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
                  localSelection.includes(agency.id) 
                    ? "bg-helpconfort-blue/10 text-helpconfort-blue" 
                    : "hover:bg-muted"
                )}
              >
                <Checkbox 
                  checked={localSelection.includes(agency.id)}
                  className="pointer-events-none border-helpconfort-blue data-[state=checked]:bg-helpconfort-blue data-[state=checked]:text-white"
                />
                <span className="text-sm">{agency.label}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
