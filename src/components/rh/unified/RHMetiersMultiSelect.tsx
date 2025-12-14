import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompetencesCatalogue, useAddCompetenceCatalogue } from '@/hooks/useRHCompetencesCatalogue';
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
  const [newMetier, setNewMetier] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  
  const { data: catalogue = [], isLoading: loadingCatalogue } = useCompetencesCatalogue();
  const addCompetence = useAddCompetenceCatalogue();
  const updateCompetencies = useUpdateCompetencies();

  // Sync local state when props change
  React.useEffect(() => {
    setLocalSelected(selectedMetiers);
  }, [selectedMetiers]);

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
      toast.success("Métiers sauvegardés");
      setOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleAddMetier = async () => {
    if (!newMetier.trim()) return;
    
    const normalizedLabel = newMetier.trim();
    const exists = catalogue.some(c => c.label.toLowerCase() === normalizedLabel.toLowerCase());
    
    if (exists) {
      toast.error("Ce métier existe déjà");
      return;
    }

    try {
      await addCompetence.mutateAsync(normalizedLabel);
      // Auto-select the new metier
      setLocalSelected([...localSelected, normalizedLabel]);
      setNewMetier('');
      setShowAddInput(false);
      toast.success("Métier ajouté");
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && JSON.stringify(localSelected.sort()) !== JSON.stringify(selectedMetiers.sort())) {
      // Save on close if changes
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
      <PopoverContent className="w-56 p-2" align="start">
        <ScrollArea className="max-h-[250px]">
          {loadingCatalogue ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {catalogue.map((comp) => (
                <label
                  key={comp.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={localSelected.includes(comp.label)}
                    onCheckedChange={() => handleToggle(comp.label)}
                  />
                  <span className="text-sm">{comp.label}</span>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="border-t mt-2 pt-2">
          {showAddInput ? (
            <div className="flex gap-1">
              <Input
                value={newMetier}
                onChange={(e) => setNewMetier(e.target.value)}
                placeholder="Nouveau métier..."
                className="h-7 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddMetier();
                  if (e.key === 'Escape') {
                    setShowAddInput(false);
                    setNewMetier('');
                  }
                }}
                autoFocus
              />
              <Button 
                size="sm" 
                className="h-7 px-2"
                onClick={handleAddMetier}
                disabled={addCompetence.isPending || !newMetier.trim()}
              >
                {addCompetence.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs justify-start gap-1"
              onClick={() => setShowAddInput(true)}
            >
              <Plus className="h-3 w-3" />
              Ajouter un métier
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
