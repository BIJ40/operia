import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUniversCatalog } from '@/hooks/useUniversCatalog';
import { useUpdateCompetencies } from '@/hooks/useRHSuivi';
import { toast } from 'sonner';

interface RHMetiersMultiSelectProps {
  collaboratorId: string;
  selectedMetiers: string[];
  className?: string;
}

export function RHMetiersMultiSelect({ 
  collaboratorId, 
  selectedMetiers = [],
  className 
}: RHMetiersMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<string[]>(selectedMetiers);
  
  const { data: universCatalog = [], isLoading: loadingCatalogue } = useUniversCatalog();
  const updateCompetencies = useUpdateCompetencies();

  // Source unique : univers Apogée
  const allMetiers = React.useMemo(() => {
    return universCatalog.map(u => u.label);
  }, [universCatalog]);

  // On initialise à partir des props mais on ne resynchronise pas ensuite
  // pour éviter d'effacer la sélection locale quand la requête de rafraîchissement
  // renvoie encore des données vides.


  const handleToggle = (metier: string) => {
    const updated = localSelected.includes(metier)
      ? localSelected.filter(m => m !== metier)
      : [...localSelected, metier];
    setLocalSelected(updated);
  };

  const handleSave = async () => {
    try {
      await updateCompetencies.mutateAsync({
        collaboratorId,
        data: { competences_techniques: localSelected }
      });
      setOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Sauvegarde systématique à la fermeture pour ne pas perdre la saisie
      handleSave();
    }
    setOpen(isOpen);
  };

  // Display: max 2 badges + count
  const displayBadges = localSelected.slice(0, 2);
  const remaining = localSelected.length - 2;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs font-normal w-full justify-between gap-1",
            className
          )}
        >
          <div className="flex items-center gap-1 overflow-hidden flex-1">
            {localSelected.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <>
                {displayBadges.map((m) => (
                  <Badge 
                    key={m} 
                    variant="secondary" 
                    className="text-[10px] px-1.5 py-0 h-5 truncate max-w-[60px]"
                  >
                    {m}
                  </Badge>
                ))}
                {remaining > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                    +{remaining}
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <ScrollArea className="h-64 pr-1">
          {loadingCatalogue ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {allMetiers.map((label) => (
                <div
                  key={label}
                  className="group flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <Checkbox
                      checked={localSelected.includes(label)}
                      onCheckedChange={() => handleToggle(label)}
                    />
                    <span className="text-xs truncate" title={label}>{label}</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t italic">
          Les univers sont synchronisés depuis Apogée
        </p>
      </PopoverContent>
    </Popover>
  );
}
