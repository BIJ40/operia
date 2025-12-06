import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllRoyaltyModels, useSaveRoyaltyConfig, useDeleteRoyaltyModel } from '../hooks/useRoyaltyConfig';
import { DEFAULT_TIERS, formatCurrency, formatPercentage, calculateRoyalties } from '../utils/royaltyCalculator';
import { Calculator, Plus, Trash2, Save, RotateCcw, Layers, X } from 'lucide-react';
import { toast } from 'sonner';

interface TierForm {
  from_amount: number;
  to_amount: number | null;
  percentage: number;
}

export default function FranchiseurRoyalties() {
  const { data: allModels = [], isLoading: modelsLoading } = useAllRoyaltyModels();
  const saveConfig = useSaveRoyaltyConfig();
  const deleteModel = useDeleteRoyaltyModel();

  // State for new model creation
  const [newModelName, setNewModelName] = useState('');
  const [tiers, setTiers] = useState<TierForm[]>(
    DEFAULT_TIERS.map(t => ({ ...t }))
  );

  // State for simulator
  const [caInput, setCaInput] = useState('');
  const [simulationResult, setSimulationResult] = useState<ReturnType<typeof calculateRoyalties> | null>(null);

  const resetToDefault = () => {
    setTiers(DEFAULT_TIERS.map(t => ({ ...t })));
    setNewModelName('');
  };

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newFrom = lastTier?.to_amount || 0;
    
    if (lastTier && lastTier.to_amount === null) {
      toast.error('Définissez d\'abord une limite pour la dernière tranche');
      return;
    }

    setTiers([...tiers, { from_amount: newFrom, to_amount: null, percentage: 1 }]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof TierForm, value: number | null) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  const handleSaveModel = async () => {
    if (!newModelName.trim()) {
      toast.error('Veuillez saisir un nom pour le modèle');
      return;
    }

    // Validate tiers
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (tier.percentage <= 0 || tier.percentage > 100) {
        toast.error(`Tranche ${i + 1}: le pourcentage doit être entre 0 et 100`);
        return;
      }
      if (i < tiers.length - 1 && (tier.to_amount === null || tier.to_amount <= tier.from_amount)) {
        toast.error(`Tranche ${i + 1}: la limite supérieure doit être définie et supérieure à la limite inférieure`);
        return;
      }
    }

    try {
      // Use a nil UUID for template models (not tied to a specific agency)
      const templateAgencyId = '00000000-0000-0000-0000-000000000000';
      await saveConfig.mutateAsync({
        agencyId: templateAgencyId,
        modelName: newModelName.trim(),
        tiers: tiers.map((t, i) => ({
          from_amount: t.from_amount,
          to_amount: t.to_amount,
          percentage: t.percentage,
          tier_order: i + 1
        }))
      });
      toast.success(`Modèle "${newModelName}" créé avec succès`);
      setNewModelName('');
    } catch (error) {
      toast.error('Erreur lors de la création du modèle');
    }
  };

  const handleSimulate = () => {
    const ca = parseFloat(caInput.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(ca) || ca < 0) {
      toast.error('Veuillez saisir un CA valide');
      return;
    }
    const result = calculateRoyalties(ca, tiers);
    setSimulationResult(result);
  };

  if (modelsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing Models */}
      <Card className="border-l-4 border-l-helpconfort-blue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Barèmes existants
          </CardTitle>
          <CardDescription>
            Modèles de redevances disponibles à appliquer aux agences
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allModels.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun barème créé. Utilisez le formulaire ci-dessous pour en créer un.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allModels.map((model) => (
                <Card key={model.model_name} className="bg-muted/30 relative group">
                  {model.model_name !== 'Dégressif 2025' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Supprimer le barème "${model.model_name}" ?`)) {
                          deleteModel.mutate(model.id);
                        }
                      }}
                      disabled={deleteModel.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {model.model_name}
                      {model.model_name === 'Dégressif 2025' && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Défaut
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Tranche</TableHead>
                          <TableHead className="text-xs text-right">Taux</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {model.tiers.map((tier, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs py-1">
                              {formatCurrency(tier.from_amount)} → {tier.to_amount ? formatCurrency(tier.to_amount) : '∞'}
                            </TableCell>
                            <TableCell className="text-xs text-right py-1 font-medium">
                              {formatPercentage(tier.percentage)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Model */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Créer un nouveau barème
          </CardTitle>
          <CardDescription>
            Définissez les tranches et pourcentages pour un nouveau modèle de redevances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Label htmlFor="modelName">Nom du barème</Label>
            <Input
              id="modelName"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="Ex: Ancien barème, Barème spécial..."
              className="mt-1"
            />
          </div>

          <div className="space-y-2">
            <Label>Tranches de CA</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>De (€)</TableHead>
                  <TableHead>À (€)</TableHead>
                  <TableHead>Pourcentage (%)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="number"
                        value={tier.from_amount}
                        onChange={(e) => updateTier(index, 'from_amount', Number(e.target.value))}
                        min={0}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={tier.to_amount ?? ''}
                        onChange={(e) => updateTier(index, 'to_amount', e.target.value ? Number(e.target.value) : null)}
                        placeholder="∞"
                        min={tier.from_amount + 1}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={tier.percentage}
                        onChange={(e) => updateTier(index, 'percentage', Number(e.target.value))}
                        min={0}
                        max={100}
                        step={0.1}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      {tiers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTier(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addTier}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une tranche
              </Button>
              <Button variant="ghost" size="sm" onClick={resetToDefault}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Réinitialiser au standard
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleSaveModel} 
            disabled={saveConfig.isPending || !newModelName.trim()}
            className="mt-4"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveConfig.isPending ? 'Enregistrement...' : 'Enregistrer le barème'}
          </Button>
        </CardContent>
      </Card>

      {/* Simulator */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulateur de redevances
          </CardTitle>
          <CardDescription>
            Testez le calcul des redevances avec le barème configuré ci-dessus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end max-w-md">
            <div className="flex-1">
              <Label htmlFor="caSimulation">CA annuel (€)</Label>
              <Input
                id="caSimulation"
                type="text"
                value={caInput}
                onChange={(e) => setCaInput(e.target.value)}
                placeholder="Ex: 750000"
                className="mt-1"
              />
            </div>
            <Button onClick={handleSimulate}>
              Calculer
            </Button>
          </div>

          {simulationResult && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">CA Total</p>
                  <p className="text-lg font-semibold">{formatCurrency(simulationResult.totalCA)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Redevance</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(simulationResult.totalRoyalty)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taux effectif</p>
                  <p className="text-lg font-semibold">{formatPercentage(simulationResult.effectiveRate)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tranche</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                    <TableHead className="text-right">Redevance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulationResult.details.map((detail, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">
                        {formatCurrency(detail.tier.from_amount)} → {detail.tier.to_amount ? formatCurrency(detail.tier.to_amount) : '∞'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(detail.baseAmount)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatPercentage(detail.tier.percentage)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(detail.royaltyAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
