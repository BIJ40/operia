/**
 * DiffusionDashboard - Page Diffusion TV refondée
 * Thème Warm Pastel + KPIs mois en cours + Podium techniciens
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Maximize, ArrowLeft, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiffusionSettings } from '@/hooks/use-diffusion-settings';
import { DiffusionKpiTiles } from '@/components/diffusion/DiffusionKpiTiles';
import { DiffusionTechPodium } from '@/components/diffusion/DiffusionTechPodium';
import { DiffusionSaviezVous } from '@/components/diffusion/DiffusionSaviezVous';
import { DiffusionSlides } from '@/components/diffusion/DiffusionSlides';
import { DiffusionSettingsPanel } from '@/components/diffusion/DiffusionSettingsPanel';
import { useDiffusionKpisStatia } from '@/components/diffusion/useDiffusionKpisStatia';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';

export default function DiffusionDashboard() {
  const { settings, isLoading: settingsLoading, updateSettings } = useDiffusionSettings();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mois en cours uniquement
  const currentMonthIndex = new Date().getMonth();
  
  // Données KPI pour le podium
  const { data: kpisData, isLoading: kpisLoading } = useDiffusionKpisStatia(currentMonthIndex);

  // Écouter les changements de mode plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  if (settingsLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-warm-blue/5 to-warm-pink/5">
        <p className="text-2xl text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <div className="min-h-screen bg-gradient-to-br from-background via-warm-blue/5 to-warm-pink/5 overflow-auto">
          {/* Header avec boutons - masqués ou discrets en plein écran */}
          {!isFullscreen && (
            <div className="fixed top-4 right-4 z-50 flex gap-2">
              <Button
                onClick={() => navigate(-1)}
                variant="ghost"
                size="icon"
                className="bg-background/60 backdrop-blur-sm hover:bg-background/80 opacity-50 hover:opacity-100 transition-opacity"
                title="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="icon"
                className="bg-background/60 backdrop-blur-sm hover:bg-background/80 opacity-50 hover:opacity-100 transition-opacity"
                title="Plein écran"
              >
                <Maximize className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleSettingsOpen}
                variant="ghost"
                size="icon"
                className="bg-background/60 backdrop-blur-sm hover:bg-background/80 opacity-50 hover:opacity-100 transition-opacity"
                title="Paramètres"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Bouton exit fullscreen discret en mode plein écran */}
          {isFullscreen && (
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="icon"
              className="fixed bottom-4 right-4 z-50 bg-background/30 backdrop-blur-sm opacity-20 hover:opacity-100 transition-opacity"
              title="Quitter plein écran"
            >
              <Minimize className="h-4 w-4" />
            </Button>
          )}

          {/* Conteneur principal */}
          <div className="container max-w-[1920px] mx-auto px-6 py-8 space-y-6">
            {/* Titre du mois */}
            <h1 className="text-2xl font-bold text-foreground capitalize">
              {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h1>

            {/* Section 1: KPI Tiles (8 tiles) */}
            <DiffusionKpiTiles 
              currentMonthIndex={currentMonthIndex}
              settings={settings}
            />

            {/* Section 2: Podium Techniciens */}
            <DiffusionTechPodium 
              ranking={kpisData?.allTechRanking || []}
              isLoading={kpisLoading}
            />

            {/* Section 3: Le saviez-vous (optionnel) */}
            {settings.saviez_vous_templates && settings.saviez_vous_templates.length > 0 && (
              <DiffusionSaviezVous 
                currentMonthIndex={currentMonthIndex}
                templates={settings.saviez_vous_templates}
              />
            )}

            {/* Section 4: Graphique CA/Technicien 6 mois */}
            <DiffusionSlides
              currentSlideIndex={0}
              currentMonthIndex={currentMonthIndex}
              enabledSlides={settings.enabled_slides || []}
            />
          </div>

          {/* Panneau de paramètres */}
          <DiffusionSettingsPanel
            open={isSettingsOpen}
            onOpenChange={(open) => {
              if (!open) handleSettingsClose();
            }}
            settings={settings}
            onSave={async (s) => {
              await updateSettings(s);
            }}
          />
        </div>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
