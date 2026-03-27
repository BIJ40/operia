import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Info } from 'lucide-react';
import { DiffusionSettings } from '@/hooks/use-diffusion-settings';

interface DiffusionSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DiffusionSettings;
  onSave: (settings: Partial<DiffusionSettings>) => Promise<void>;
}

const AVAILABLE_VARIABLES = [
  { name: '{moisCourant}', desc: 'Nom du mois en cours (janvier, février...)' },
  { name: '{annee}', desc: 'Année en cours (2025, 2026...)' },
  { name: '{nbDossiersMax}', desc: 'Nombre de dossiers du mois record' },
  { name: '{moisMax}', desc: 'Mois du record de dossiers' },
  { name: '{nbProjetsMois}', desc: 'Nombre de projets ce mois' },
  { name: '{caMoyenDossier}', desc: 'CA moyen par dossier' },
  { name: '{caTotal}', desc: 'CA total du mois' },
  { name: '{objectif}', desc: 'Objectif mensuel paramétré' },
  { name: '{topTechnicien}', desc: 'Nom du meilleur technicien' },
  { name: '{topApporteur}', desc: 'Nom du meilleur apporteur' },
  { name: '{topUnivers}', desc: 'Univers le plus actif' },
  { name: '{tauxSAV}', desc: 'Taux SAV en %' },
  { name: '{nbTechsActifs}', desc: 'Nombre de techniciens actifs' },
];

export const DiffusionSettingsPanel = ({
  open,
  onOpenChange,
  settings,
  onSave,
}: DiffusionSettingsPanelProps) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when settings prop changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localSettings);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const addTemplate = () => {
    setLocalSettings({
      ...localSettings,
      saviez_vous_templates: [
        ...localSettings.saviez_vous_templates,
        '',
      ],
    });
  };

  const removeTemplate = (index: number) => {
    const newTemplates = localSettings.saviez_vous_templates.filter((_, i) => i !== index);
    setLocalSettings({
      ...localSettings,
      saviez_vous_templates: newTemplates,
    });
  };

  const updateTemplate = (index: number, value: string) => {
    const newTemplates = [...localSettings.saviez_vous_templates];
    newTemplates[index] = value;
    setLocalSettings({
      ...localSettings,
      saviez_vous_templates: newTemplates,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paramètres de diffusion</DialogTitle>
          <DialogDescription>
            Configurez l'affichage du mode TV avec rotation automatique
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="display" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="display">Affichage</TabsTrigger>
            <TabsTrigger value="objectif">Objectif</TabsTrigger>
            <TabsTrigger value="saviez">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-6 mt-6">
            <div className="space-y-6">
              {/* Rotation automatique */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-rotation">Rotation automatique</Label>
                  <p className="text-xs text-muted-foreground">
                    Alterne entre les pages KPIs, Apporteurs et Univers
                  </p>
                </div>
                <Switch
                  id="auto-rotation"
                  checked={localSettings.auto_rotation_enabled}
                  onCheckedChange={(checked) =>
                    setLocalSettings({ ...localSettings, auto_rotation_enabled: checked })
                  }
                />
              </div>

              {/* Vitesse de rotation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Vitesse de rotation</Label>
                  <span className="text-sm font-medium text-muted-foreground">
                    {localSettings.rotation_speed_seconds} secondes
                  </span>
                </div>
                <Slider
                  value={[localSettings.rotation_speed_seconds]}
                  onValueChange={([value]) =>
                    setLocalSettings({ ...localSettings, rotation_speed_seconds: value })
                  }
                  min={10}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Chaque page s'affiche pendant {localSettings.rotation_speed_seconds} secondes avant de passer à la suivante
                </p>
              </div>

              {/* Pages affichées */}
              <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
                <Label className="text-sm font-medium">Pages en rotation</Label>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-warm-blue rounded-full" />
                    <span><strong>KPIs & Podium</strong> — CA, objectif, tiles, classement techniciens</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-warm-orange rounded-full" />
                    <span><strong>Apporteurs</strong> — Stats par type, segmentation, évolution</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-warm-purple rounded-full" />
                    <span><strong>Univers</strong> — CA par domaine, répartition</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="objectif" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objectif-title">Titre de l'objectif</Label>
                <Input
                  id="objectif-title"
                  value={localSettings.objectif_title}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, objectif_title: e.target.value })
                  }
                  placeholder="ex: OBJECTIF JANVIER 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectif-amount">Montant de l'objectif (€)</Label>
                <Input
                  id="objectif-amount"
                  type="number"
                  value={localSettings.objectif_amount}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      objectif_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="ex: 117000"
                />
                <p className="text-xs text-muted-foreground">
                  La tile "Objectif restant" affichera la différence entre cet objectif et le CA réalisé
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saviez" className="space-y-6 mt-6">
            <div className="space-y-4">
              {/* Variables disponibles */}
              <div className="p-4 bg-muted/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Variables disponibles
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <div key={v.name} className="flex flex-col">
                      <code className="text-warm-blue font-mono">{v.name}</code>
                      <span className="text-muted-foreground">{v.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Messages "Le Saviez-tu ?"</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTemplate}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                
                {localSettings.saviez_vous_templates.map((template, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      value={template}
                      onChange={(e) => updateTemplate(index, e.target.value)}
                      placeholder={`Ex: En {moisMax}, on a battu notre record avec {nbDossiersMax} dossiers !`}
                      className="flex-1 min-h-[80px] text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTemplate(index)}
                      className="text-destructive hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {localSettings.saviez_vous_templates.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun message configuré. Cliquez sur "Ajouter" pour en créer un.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
