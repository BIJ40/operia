import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRoyaltyConfig, useSaveRoyaltyConfig, useAllRoyaltyModels, useApplyRoyaltyModel } from "../hooks/useRoyaltyConfig";
import { DEFAULT_TIERS, formatCurrency } from "../utils/royaltyCalculator";

interface RoyaltyConfigSectionProps {
  agencyId: string;
}

interface TierForm {
  from_amount: number;
  to_amount: number | null;
  percentage: number;
}

export function RoyaltyConfigSection({ agencyId }: RoyaltyConfigSectionProps) {
  const { data: config, isLoading } = useRoyaltyConfig(agencyId);
  const { data: allModels = [] } = useAllRoyaltyModels();
  const saveConfig = useSaveRoyaltyConfig();
  const applyModel = useApplyRoyaltyModel();
  
  const [modelName, setModelName] = useState("Dégressif 2025");
  const [tiers, setTiers] = useState<TierForm[]>(DEFAULT_TIERS.map(t => ({
    from_amount: t.from_amount,
    to_amount: t.to_amount,
    percentage: t.percentage,
  })));
  const [selectedModel, setSelectedModel] = useState<string>("");

  // Charger la config existante
  useEffect(() => {
    if (config) {
      setModelName(config.model_name);
      if (config.tiers.length > 0) {
        setTiers(config.tiers.map(t => ({
          from_amount: t.from_amount,
          to_amount: t.to_amount,
          percentage: t.percentage,
        })));
      }
    }
  }, [config]);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    const model = allModels.find(m => m.id === modelId);
    if (model) {
      setModelName(model.model_name);
      setTiers(model.tiers.map(t => ({
        from_amount: t.from_amount,
        to_amount: t.to_amount,
        percentage: t.percentage,
      })));
    }
  };

  const handleApplyModel = async () => {
    if (!selectedModel) return;
    
    const model = allModels.find(m => m.id === selectedModel);
    if (!model) return;

    await applyModel.mutateAsync({
      agencyId,
      modelName: model.model_name,
      tiers: model.tiers.map(t => ({
        from_amount: t.from_amount,
        to_amount: t.to_amount,
        percentage: t.percentage,
      })),
    });
  };

  const resetToDefault = () => {
    setModelName("Dégressif 2025");
    setTiers(DEFAULT_TIERS.map(t => ({
      from_amount: t.from_amount,
      to_amount: t.to_amount,
      percentage: t.percentage,
    })));
    setSelectedModel("");
  };

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newFromAmount = lastTier.to_amount || lastTier.from_amount + 100000;
    
    const updatedTiers = [...tiers];
    updatedTiers[updatedTiers.length - 1] = {
      ...lastTier,
      to_amount: newFromAmount,
    };

    setTiers([
      ...updatedTiers,
      { from_amount: newFromAmount, to_amount: null, percentage: 1 },
    ]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    
    const newTiers = tiers.filter((_, i) => i !== index);
    if (newTiers.length > 0) {
      newTiers[newTiers.length - 1].to_amount = null;
    }
    
    setTiers(newTiers);
  };

  const updateTier = (index: number, field: keyof TierForm, value: number | null) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  const handleSaveAsNew = async () => {
    // Validation
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (tier.percentage <= 0 || tier.percentage > 100) {
        toast.error(`Tranche ${i + 1}: Le pourcentage doit être entre 0 et 100`);
        return;
      }
      if (tier.from_amount < 0) {
        toast.error(`Tranche ${i + 1}: Le montant de départ doit être positif`);
        return;
      }
      if (tier.to_amount !== null && tier.to_amount <= tier.from_amount) {
        toast.error(`Tranche ${i + 1}: Le montant de fin doit être supérieur au montant de départ`);
        return;
      }
    }

    await saveConfig.mutateAsync({
      agencyId,
      modelName,
      tiers,
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Chargement de la configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sélection de modèle existant */}
      <Card className="rounded-2xl border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Appliquer un modèle existant
          </CardTitle>
          <CardDescription>
            Choisissez un barème prédéfini à appliquer à cette agence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={selectedModel} onValueChange={handleSelectModel}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner un modèle..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {allModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.model_name}</span>
                      {model.model_name.includes('Standard') && (
                        <Badge variant="secondary" className="text-xs">Défaut</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleApplyModel} 
              disabled={!selectedModel || applyModel.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Appliquer
            </Button>
          </div>

          {selectedModel && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Aperçu du barème :</p>
              <div className="grid gap-1 text-sm text-muted-foreground">
                {tiers.map((tier, i) => (
                  <div key={i}>
                    {tier.to_amount === null
                      ? `Au-delà de ${formatCurrency(tier.from_amount)} : ${tier.percentage}%`
                      : `${formatCurrency(tier.from_amount)} → ${formatCurrency(tier.to_amount)} : ${tier.percentage}%`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration personnalisée */}
      <Card className="rounded-2xl border-l-4 border-l-accent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuration personnalisée</CardTitle>
              <CardDescription>
                Créez un nouveau barème qui sera sauvegardé et réutilisable
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              Réinitialiser au standard
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="modelName">Nom du modèle</Label>
            <Input
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Ex: Standard, Taux fixe 2%, Contrat spécial..."
            />
            <p className="text-xs text-muted-foreground">
              Donnez un nom unique pour retrouver ce barème facilement
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tranches de redevances</h3>
              <Button onClick={addTier} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une tranche
              </Button>
            </div>

            {tiers.map((tier, index) => (
              <Card key={index} className="p-4 bg-muted/30">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>De (€)</Label>
                    <Input
                      type="number"
                      value={tier.from_amount}
                      onChange={(e) => updateTier(index, 'from_amount', parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>À (€)</Label>
                    <Input
                      type="number"
                      value={tier.to_amount || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : null;
                        updateTier(index, 'to_amount', value);
                      }}
                      placeholder="Illimité"
                      disabled={index === tiers.length - 1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pourcentage (%)</Label>
                    <Input
                      type="number"
                      value={tier.percentage}
                      onChange={(e) => updateTier(index, 'percentage', parseFloat(e.target.value) || 0)}
                      min={0}
                      max={100}
                      step={0.1}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeTier(index)}
                      disabled={tiers.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {tier.to_amount === null
                    ? `À partir de ${tier.from_amount.toLocaleString('fr-FR')} € : ${tier.percentage}%`
                    : `De ${tier.from_amount.toLocaleString('fr-FR')} € à ${tier.to_amount.toLocaleString('fr-FR')} € : ${tier.percentage}%`}
                </p>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveAsNew} disabled={saveConfig.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveConfig.isPending ? 'Enregistrement...' : 'Enregistrer ce barème'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Config actuelle */}
      {config && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Configuration actuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{config.model_name}</Badge>
              <span className="text-sm text-muted-foreground">
                Active depuis le {new Date(config.valid_from).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
