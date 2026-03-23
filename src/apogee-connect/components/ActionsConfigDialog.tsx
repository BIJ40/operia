import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings, RotateCcw } from 'lucide-react';
import { useActionsConfig } from '../hooks/useActionsConfig';

export function ActionsConfigDialog() {
  const { config, saveConfig, resetConfig, isSaving } = useActionsConfig();
  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  // Synchroniser localConfig quand la dialog s'ouvre
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalConfig(config);
    }
    setOpen(newOpen);
  };

  const handleSave = () => {
    saveConfig(localConfig);
    setOpen(false);
  };

  const handleReset = () => {
    resetConfig();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
          <Settings className="w-3.5 h-3.5 mr-1" />
          Délais
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configuration des délais de relance</DialogTitle>
          <DialogDescription>
            Définissez vos propres délais en jours avant qu'une action soit considérée comme en retard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="devis-a-faire" className="text-right text-sm">
              Devis à faire
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="devis-a-faire"
                type="number"
                min="1"
                value={localConfig.delai_devis_a_faire}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  delai_devis_a_faire: parseInt(e.target.value) || 1
                })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="a-facturer" className="text-right text-sm">
              À facturer
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="a-facturer"
                type="number"
                min="1"
                value={localConfig.delai_a_facturer}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  delai_a_facturer: parseInt(e.target.value) || 1
                })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="relance-technicien" className="text-right text-sm">
              Relance technicien
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="relance-technicien"
                type="number"
                min="1"
                value={localConfig.delai_relance_technicien}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  delai_relance_technicien: parseInt(e.target.value) || 1
                })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="a-planifier-tvx" className="text-right text-sm">
              À planifier travaux
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="a-planifier-tvx"
                type="number"
                min="1"
                value={localConfig.delai_a_planifier_tvx}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  delai_a_planifier_tvx: parseInt(e.target.value) || 1
                })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="a-commander" className="text-right text-sm">
              À commander
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="a-commander"
                type="number"
                min="1"
                value={localConfig.delai_a_commander}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  delai_a_commander: parseInt(e.target.value) || 1
                })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
