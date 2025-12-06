/**
 * Playground pour tester et sélectionner les animations de la barre de recherche unifiée
 * Accessible uniquement aux admins (N5/N6)
 */

import { useState, useEffect } from 'react';
import { Check, Save, RotateCcw, Play, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  UNIFIED_SEARCH_ANIMATIONS, 
  UnifiedSearchAnimationId,
  UnifiedSearchAnimationPreset 
} from '@/components/unified-search/unifiedSearchAnimations';
import { 
  loadUnifiedSearchAnimationSettings, 
  saveUnifiedSearchAnimationSettings,
  resetUnifiedSearchAnimationSettings 
} from '@/components/unified-search/unifiedSearchAnimationSettings';
import { AnimationPreviewButton } from '@/components/unified-search/AnimationPreviewButton';
import { UnifiedSearchFloatingBar } from '@/components/unified-search/UnifiedSearchFloatingBar';
import { UnifiedSearchProvider } from '@/components/unified-search/UnifiedSearchContext';
import { MainLayout } from '@/components/layout/MainLayout';

export default function UnifiedSearchAnimationPlayground() {
  const { toast } = useToast();
  const [activeIds, setActiveIds] = useState<UnifiedSearchAnimationId[]>([]);
  const [showLiveTest, setShowLiveTest] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [testKey, setTestKey] = useState(0);

  // Charger les settings au mount
  useEffect(() => {
    const settings = loadUnifiedSearchAnimationSettings();
    setActiveIds(settings.activeAnimationIds);
  }, []);

  const handleLaunchTest = () => {
    // Sauvegarde temporaire si changements, puis relance le test
    if (hasChanges && activeIds.length > 0) {
      saveUnifiedSearchAnimationSettings({ activeAnimationIds: activeIds });
      setHasChanges(false);
    }
    setTestKey(prev => prev + 1);
    setShowLiveTest(true);
  };

  const handleToggle = (id: UnifiedSearchAnimationId) => {
    setActiveIds(prev => {
      const isActive = prev.includes(id);
      const newIds = isActive 
        ? prev.filter(i => i !== id)
        : [...prev, id];
      setHasChanges(true);
      return newIds;
    });
  };

  const handleSave = () => {
    if (activeIds.length === 0) {
      toast({
        title: "Erreur",
        description: "Au moins une animation doit être active.",
        variant: "destructive"
      });
      return;
    }

    saveUnifiedSearchAnimationSettings({ activeAnimationIds: activeIds });
    setHasChanges(false);
    toast({
      title: "Préférences enregistrées",
      description: `${activeIds.length} animation(s) active(s). Une sera choisie aléatoirement à chaque chargement.`,
    });
  };

  const handleReset = () => {
    resetUnifiedSearchAnimationSettings();
    const settings = loadUnifiedSearchAnimationSettings();
    setActiveIds(settings.activeAnimationIds);
    setHasChanges(false);
    toast({
      title: "Réinitialisé",
      description: "Animation par défaut restaurée.",
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Playground Animations IA
          </h1>
          <p className="text-muted-foreground">
            Prévisualisez et sélectionnez les animations pour la barre de recherche intelligente.
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>Mode multi-animations :</strong> Si plusieurs animations sont activées, 
            une sera choisie aléatoirement à chaque chargement de page pour varier l'expérience.
          </AlertDescription>
        </Alert>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || activeIds.length === 0}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Enregistrer mes préférences
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </Button>
          
          <Button 
            variant="default"
            onClick={handleLaunchTest}
            disabled={activeIds.length === 0}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4" />
            Lancer le test
          </Button>

          {showLiveTest && (
            <Button 
              variant="ghost"
              onClick={() => setShowLiveTest(false)}
              className="gap-2"
            >
              Masquer
            </Button>
          )}

          <div className="ml-auto">
            <Badge variant={activeIds.length > 0 ? 'default' : 'destructive'}>
              {activeIds.length} animation(s) active(s)
            </Badge>
          </div>
        </div>

        {/* Live test zone */}
        {showLiveTest && (
          <Card className="mb-6 border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Test en situation réelle</CardTitle>
              <CardDescription>
                Cliquez sur "Lancer le test" pour tester avec votre configuration actuelle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-lg p-4 border min-h-[100px] flex items-center justify-center">
                <UnifiedSearchProvider key={testKey}>
                  <UnifiedSearchFloatingBar />
                </UnifiedSearchProvider>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Animation cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {UNIFIED_SEARCH_ANIMATIONS.map((preset) => (
            <AnimationCard
              key={preset.id}
              preset={preset}
              isActive={activeIds.includes(preset.id)}
              onToggle={() => handleToggle(preset.id)}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

interface AnimationCardProps {
  preset: UnifiedSearchAnimationPreset;
  isActive: boolean;
  onToggle: () => void;
}

function AnimationCard({ preset, isActive, onToggle }: AnimationCardProps) {
  return (
    <Card 
      className={`relative transition-all duration-200 cursor-pointer hover:shadow-md ${
        isActive 
          ? 'ring-2 ring-primary border-primary/50 bg-primary/5' 
          : 'hover:border-primary/30'
      }`}
      onClick={onToggle}
    >
      {/* Selection indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Checkbox 
            checked={isActive}
            onCheckedChange={() => onToggle()}
            onClick={(e) => e.stopPropagation()}
          />
          <div>
            <CardTitle className="text-base">{preset.label}</CardTitle>
            <Badge variant="outline" className="text-xs mt-1">
              {preset.id}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {preset.description}
        </p>

        {/* Preview zone */}
        <div className="h-24 bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/20">
          <AnimationPreviewButton preset={preset} />
        </div>

        {/* Decorators info */}
        {preset.decorators && (
          <div className="flex flex-wrap gap-1 mt-3">
            {preset.decorators.showGlow && (
              <Badge variant="secondary" className="text-xs">Glow</Badge>
            )}
            {preset.decorators.showOrbit && (
              <Badge variant="secondary" className="text-xs">Orbit</Badge>
            )}
            {preset.decorators.showWaveDots && (
              <Badge variant="secondary" className="text-xs">Wave Dots</Badge>
            )}
            {preset.decorators.showNeonRing && (
              <Badge variant="secondary" className="text-xs">Neon Ring</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
