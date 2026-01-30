/**
 * DiffusionDashboard - Page Diffusion TV refondée
 * 3 pages en rotation : KPIs/Podium, Apporteurs, Univers
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Maximize, ArrowLeft, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiffusionSettings } from '@/hooks/use-diffusion-settings';
import { DiffusionKpiTiles } from '@/components/diffusion/DiffusionKpiTiles';
import { DiffusionTechPodium } from '@/components/diffusion/DiffusionTechPodium';
import { DiffusionApporteursPage } from '@/components/diffusion/DiffusionApporteursPage';
import { DiffusionUniversPage } from '@/components/diffusion/DiffusionUniversPage';
import { DiffusionSettingsPanel } from '@/components/diffusion/DiffusionSettingsPanel';
import { useDiffusionKpisStatia } from '@/components/diffusion/useDiffusionKpisStatia';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { cn } from '@/lib/utils';

type PageType = 'kpis' | 'apporteurs' | 'univers';

const PAGES: { id: PageType; label: string }[] = [
  { id: 'kpis', label: 'KPIs & Podium' },
  { id: 'apporteurs', label: 'Apporteurs' },
  { id: 'univers', label: 'Univers' },
];

export default function DiffusionDashboard() {
  const { settings, isLoading: settingsLoading, updateSettings } = useDiffusionSettings();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Mois en cours uniquement
  const currentMonthIndex = new Date().getMonth();
  
  // Données KPI pour le podium
  const { data: kpisData, isLoading: kpisLoading } = useDiffusionKpisStatia(currentMonthIndex);

  // Rotation automatique entre les pages
  useEffect(() => {
    if (!settings?.auto_rotation_enabled || isPaused) return;

    const interval = setInterval(() => {
      setCurrentPageIndex((prev) => (prev + 1) % PAGES.length);
    }, (settings.rotation_speed_seconds || 30) * 1000);

    return () => clearInterval(interval);
  }, [settings?.auto_rotation_enabled, settings?.rotation_speed_seconds, isPaused]);

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
    setIsPaused(true);
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    setIsPaused(false);
  };

  const currentPage = PAGES[currentPageIndex];

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

          {/* Indicateurs de page (dots) */}
          {settings.auto_rotation_enabled && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
              {PAGES.map((page, idx) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    idx === currentPageIndex 
                      ? 'bg-warm-blue scale-125' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  title={page.label}
                />
              ))}
            </div>
          )}

          {/* Conteneur principal */}
          <div className="container max-w-[1920px] mx-auto px-6 py-8 space-y-6">
            {/* Titre du mois + indicateur de page */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground capitalize">
                {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h1>
              {settings.auto_rotation_enabled && (
                <span className="text-sm text-muted-foreground bg-muted/20 px-3 py-1 rounded-full">
                  {currentPage.label}
                </span>
              )}
            </div>

            {/* Contenu dynamique selon la page */}
            {currentPage.id === 'kpis' && (
              <>
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
              </>
            )}

            {currentPage.id === 'apporteurs' && (
              <DiffusionApporteursPage currentMonthIndex={currentMonthIndex} />
            )}

            {currentPage.id === 'univers' && (
              <DiffusionUniversPage currentMonthIndex={currentMonthIndex} />
            )}
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
