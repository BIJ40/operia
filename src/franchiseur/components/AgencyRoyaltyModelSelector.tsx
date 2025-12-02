import { useState } from "react";
import { Check, ChevronsUpDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { useRoyaltyConfig, useAllRoyaltyModels, useApplyRoyaltyModel } from "../hooks/useRoyaltyConfig";
import { formatCurrency, formatPercentage } from "../utils/royaltyCalculator";

interface AgencyRoyaltyModelSelectorProps {
  agencyId: string;
  canManage?: boolean;
}

export function AgencyRoyaltyModelSelector({ agencyId, canManage = false }: AgencyRoyaltyModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: currentConfig, isLoading: configLoading } = useRoyaltyConfig(agencyId);
  const { data: allModels, isLoading: modelsLoading } = useAllRoyaltyModels();
  const applyModel = useApplyRoyaltyModel();

  const currentModelName = currentConfig?.model_name || "Dégressif 2025";
  const currentTiers = currentConfig?.tiers || [];

  const handleSelectModel = (modelName: string) => {
    const selectedModel = allModels?.find(m => m.model_name === modelName);
    if (!selectedModel || modelName === currentModelName) {
      setOpen(false);
      return;
    }

    applyModel.mutate({
      agencyId,
      modelName: selectedModel.model_name,
      tiers: selectedModel.tiers.map(t => ({
        from_amount: t.from_amount,
        to_amount: t.to_amount,
        percentage: t.percentage,
      })),
    }, {
      onSuccess: () => setOpen(false),
    });
  };

  const isLoading = configLoading || modelsLoading;

  return (
    <Card className="rounded-2xl border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Barème de redevances
            </CardTitle>
            <CardDescription>
              Modèle de calcul des redevances appliqué à cette agence
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {currentModelName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current tiers display */}
        <div className="rounded-lg border p-4 bg-muted/30">
          <h4 className="font-medium mb-3">Tranches actuelles</h4>
          {currentTiers.length > 0 ? (
            <div className="space-y-2">
              {currentTiers.map((tier, index) => (
                <div
                  key={tier.id || index}
                  className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background"
                >
                  <span className="text-muted-foreground">
                    {formatCurrency(tier.from_amount)} → {tier.to_amount ? formatCurrency(tier.to_amount) : "∞"}
                  </span>
                  <Badge variant="secondary">{formatPercentage(tier.percentage)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Barème standard appliqué (0-500k: 4%, 500k-650k: 3%, 650k-800k: 2.5%, 800k-1M: 1.5%, +1M: 1%)
            </p>
          )}
        </div>

        {/* Model selector */}
        {canManage && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Changer de barème</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={isLoading || applyModel.isPending}
                >
                  {applyModel.isPending ? "Application en cours..." : currentModelName}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background z-50" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un barème..." />
                  <CommandList>
                    <CommandEmpty>Aucun barème trouvé</CommandEmpty>
                    <CommandGroup>
                      {allModels?.map((model) => (
                        <CommandItem
                          key={model.model_name}
                          value={model.model_name}
                          onSelect={() => handleSelectModel(model.model_name)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              currentModelName === model.model_name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <span>{model.model_name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({model.tiers.length} tranches)
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Sélectionnez un barème configuré pour l'appliquer à cette agence
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
