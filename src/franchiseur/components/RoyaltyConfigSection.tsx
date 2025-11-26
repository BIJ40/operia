import { useState, useEffect } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoyaltyConfig, useSaveRoyaltyConfig } from "../hooks/useRoyaltyConfig";
import { Separator } from "@/components/ui/separator";

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
  const saveConfig = useSaveRoyaltyConfig();
  
  const [modelName, setModelName] = useState("Standard");
  const [tiers, setTiers] = useState<TierForm[]>([
    { from_amount: 0, to_amount: 500000, percentage: 4 },
    { from_amount: 500000, to_amount: null, percentage: 3.5 },
  ]);

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

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newFromAmount = lastTier.to_amount || lastTier.from_amount + 100000;
    
    // Update last tier to have an end
    const updatedTiers = [...tiers];
    updatedTiers[updatedTiers.length - 1] = {
      ...lastTier,
      to_amount: newFromAmount,
    };

    setTiers([
      ...updatedTiers,
      { from_amount: newFromAmount, to_amount: null, percentage: 3 },
    ]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    
    const newTiers = tiers.filter((_, i) => i !== index);
    
    // Last tier should have null to_amount
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

  const handleSave = async () => {
    // Validation
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (tier.percentage <= 0 || tier.percentage > 100) {
        alert(`Tranche ${i + 1}: Le pourcentage doit être entre 0 et 100`);
        return;
      }
      if (tier.from_amount < 0) {
        alert(`Tranche ${i + 1}: Le montant de départ doit être positif`);
        return;
      }
      if (tier.to_amount !== null && tier.to_amount <= tier.from_amount) {
        alert(`Tranche ${i + 1}: Le montant de fin doit être supérieur au montant de départ`);
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
      <Card className="rounded-2xl border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle>Configuration des Redevances</CardTitle>
          <CardDescription>
            Définissez les tranches de CA et les pourcentages de redevances applicables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="modelName">Nom du modèle</Label>
            <Input
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Standard, Modèle A, etc."
            />
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
              <Card key={index} className="p-4">
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
            <Button onClick={handleSave} disabled={saveConfig.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveConfig.isPending ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
