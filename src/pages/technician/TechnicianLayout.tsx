/**
 * Technician PWA - Main Layout
 * Offline-first application for field technicians
 */
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, User, RefreshCw, Settings, Wifi, WifiOff, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';

// ============================================
// Install Prompt Hook
// ============================================
function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsIOS(isIOSDevice && !isInStandaloneMode);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (isInStandaloneMode) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  };

  return { isInstallable, isIOS, promptInstall };
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Navigation items
const NAV_ITEMS = [
  { to: '/t/planning', icon: Calendar, label: 'Planning' },
  { to: '/t/pointage', icon: Clock, label: 'Pointage' },
  { to: '/t/documents', icon: FileText, label: 'RH - Parc' },
  { to: '/t/profil', icon: User, label: 'Profil' },
];

// ============================================
// Main Layout Component
// ============================================
export default function TechnicianLayout() {
  const { user, isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { status, sync, retryErrors } = useSyncEngine();
  const { isInstallable, isIOS, promptInstall } = useInstallPrompt();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [user, isAuthLoading, navigate, location.pathname]);

  // Handle install click
  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      const installed = await promptInstall();
      if (installed) {
        toast({
          title: 'Application installée',
          description: 'OPERIA Technicien a été ajouté à votre écran d\'accueil',
        });
      }
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">OPERIA</span>
            <Badge variant="secondary" className="text-xs">
              Technicien
            </Badge>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {/* Online/Offline indicator */}
            {status.isOnline ? (
              <Wifi className="h-5 w-5 text-green-300" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-300" />
            )}

            {/* Pending sync badge */}
            {status.pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {status.pendingCount}
              </Badge>
            )}

            {/* Settings sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Paramètres</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Sync status */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Synchronisation</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {status.isOnline ? (
                        <>
                          <Wifi className="h-4 w-4 text-green-500" />
                          <span>En ligne</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-4 w-4 text-red-500" />
                          <span>Hors ligne</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">En attente:</span>
                      <Badge variant={status.pendingCount > 0 ? 'default' : 'secondary'}>
                        {status.pendingCount}
                      </Badge>
                    </div>
                    {status.errorCount > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">En erreur:</span>
                        <Badge variant="destructive">{status.errorCount}</Badge>
                      </div>
                    )}
                    {status.lastSyncAt && (
                      <p className="text-xs text-muted-foreground">
                        Dernière sync: {status.lastSyncAt.toLocaleTimeString()}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={sync}
                        disabled={status.isSyncing || !status.isOnline}
                      >
                        <RefreshCw className={cn('h-4 w-4 mr-2', status.isSyncing && 'animate-spin')} />
                        Synchroniser
                      </Button>
                      {status.errorCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={retryErrors}
                          disabled={status.isSyncing || !status.isOnline}
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Réessayer
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Install app */}
                  {(isInstallable || isIOS) && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Installation</h4>
                      <p className="text-sm text-muted-foreground">
                        Installez l'application pour un accès rapide et hors ligne.
                      </p>
                      <Button onClick={handleInstall} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Installer l'application
                      </Button>
                    </div>
                  )}

                  {/* iOS install guide */}
                  {showIOSGuide && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <h5 className="font-medium">Installation sur iOS</h5>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Appuyez sur le bouton Partager <span className="inline-block">⬆️</span></li>
                        <li>Faites défiler et appuyez sur "Sur l'écran d'accueil"</li>
                        <li>Appuyez sur "Ajouter"</li>
                      </ol>
                      <Button variant="ghost" size="sm" onClick={() => setShowIOSGuide(false)}>
                        Fermer
                      </Button>
                    </div>
                  )}

                  {/* User info */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Compte</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb z-50">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/t/planning'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  'min-w-[64px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
