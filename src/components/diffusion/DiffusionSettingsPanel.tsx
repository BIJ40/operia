import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiffusionSettings } from '@/hooks/use-diffusion-settings';

interface DiffusionSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DiffusionSettings;
  onSave: (settings: Partial<DiffusionSettings>) => Promise<void>;
}

export const DiffusionSettingsPanel = ({
  open,
  onOpenChange,
  settings,
  onSave,
}: DiffusionSettingsPanelProps) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localSettings);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const slideOptions = [
    { id: 'univers_apporteurs', label: 'Univers & Types Apporteurs' },
    { id: 'ca_techniciens', label: 'CA par Technicien' },
    { id: 'segmentation', label: 'Segmentation Particuliers/Apporteurs' },
    { id: 'apporteurs_sav', label: 'Apporteurs & SAV' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Paramètres de diffusion</SheetTitle>
          <SheetDescription>
            Configurez l'affichage du mode TV
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="display" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="display">Affichage</TabsTrigger>
            <TabsTrigger value="objectif">Objectif</TabsTrigger>
            <TabsTrigger value="saviez">Saviez-vous</TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-rotation">Rotation automatique</Label>
                <Switch
                  id="auto-rotation"
                  checked={localSettings.auto_rotation_enabled}
                  onCheckedChange={(checked) =>
                    setLocalSettings({ ...localSettings, auto_rotation_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-3">
                <Label>Vitesse de rotation : {localSettings.rotation_speed_seconds}s</Label>
                <Slider
                  value={[localSettings.rotation_speed_seconds]}
                  onValueChange={([value]) =>
                    setLocalSettings({ ...localSettings, rotation_speed_seconds: value })
                  }
                  min={5}
                  max={60}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <Label>Slides incluses</Label>
                <div className="space-y-2">
                  {slideOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={localSettings.enabled_slides.includes(option.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setLocalSettings({
                              ...localSettings,
                              enabled_slides: [...localSettings.enabled_slides, option.id],
                            });
                          } else {
                            setLocalSettings({
                              ...localSettings,
                              enabled_slides: localSettings.enabled_slides.filter(
                                (s) => s !== option.id
                              ),
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={option.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
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
                  placeholder="ex: OBJECTIF NOVEMBRE 2025"
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saviez" className="space-y-6 mt-6">
            <div className="space-y-4">
              <Label>Templates "Le Saviez-tu ?"</Label>
              <p className="text-sm text-muted-foreground">
                Variables disponibles : {'{moisMax}'}, {'{annee}'}, {'{nbDossiersMax}'},
                {'{moisCourant}'}, {'{nbProjetsMois}'}, {'{caMoyenDossier}'}
              </p>
              {localSettings.saviez_vous_templates.map((template, index) => (
                <Input
                  key={index}
                  value={template}
                  onChange={(e) => {
                    const newTemplates = [...localSettings.saviez_vous_templates];
                    newTemplates[index] = e.target.value;
                    setLocalSettings({ ...localSettings, saviez_vous_templates: newTemplates });
                  }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
