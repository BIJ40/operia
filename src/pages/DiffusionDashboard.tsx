import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Settings, Maximize, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiffusionSettings } from '@/hooks/use-diffusion-settings';
import { useAutoRotation } from '@/hooks/use-auto-rotation';
import { DiffusionBandeau } from '@/components/diffusion/DiffusionBandeau';
import { DiffusionKpiTiles } from '@/components/diffusion/DiffusionKpiTiles';
import { DiffusionSaviezVous } from '@/components/diffusion/DiffusionSaviezVous';
import { DiffusionSlides } from '@/components/diffusion/DiffusionSlides';
import { DiffusionSettingsPanel } from '@/components/diffusion/DiffusionSettingsPanel';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';

// Route protégée par RoleGuard dans App.tsx
export default function DiffusionDashboard() {
  const { settings, isLoading, updateSettings } = useDiffusionSettings();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Écouter les changements de mode plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const nbMonths = 12; // Mois de l'année
  const nbSlides = settings?.enabled_slides?.length || 4;

  const rotation = useAutoRotation({
    enabled: settings?.auto_rotation_enabled || false,
    rotationSpeedSeconds: settings?.rotation_speed_seconds || 15,
    nbSlides,
    nbMonths,
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleSettingsOpen = () => {
    rotation.pause();
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    rotation.resume();
    setIsSettingsOpen(false);
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 to-accent/10">
        <p className="text-2xl text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 overflow-hidden">
          {/* Header avec boutons de contrôle - masqués en plein écran */}
          {!isFullscreen && (
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                size="icon"
                className="bg-background/80 backdrop-blur"
                title="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="icon"
                className="bg-background/80 backdrop-blur"
                title="Plein écran"
              >
                <Maximize className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleSettingsOpen}
                className="bg-green-500 hover:bg-green-600 text-white"
                size="icon"
                title="Paramètres"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Bandeau motivant */}
          <DiffusionBandeau />

          {/* Conteneur principal */}
          <div className="container max-w-[1920px] mx-auto px-8 py-6 space-y-6">
            {/* Tuiles KPI - TOUJOURS le mois actuel, pas la rotation */}
            <DiffusionKpiTiles 
              currentMonthIndex={new Date().getMonth()}
              settings={settings}
            />

            {/* Le saviez-vous */}
            <DiffusionSaviezVous 
              currentMonthIndex={rotation.currentMonthIndex}
              templates={settings.saviez_vous_templates}
            />

            {/* Zone de slides */}
            <DiffusionSlides
              currentSlideIndex={rotation.currentSlideIndex}
              currentMonthIndex={rotation.currentMonthIndex}
              enabledSlides={settings.enabled_slides}
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
