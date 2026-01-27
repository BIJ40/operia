import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { X, Download, Share, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_DAYS = 7;

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWA();
  const [isDismissed, setIsDismissed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt));
      const now = new Date();
      const daysSinceDismiss = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceDismiss < DISMISS_DURATION_DAYS) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setIsDismissed(false);
      }
    } else {
      setIsDismissed(false);
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setIsDismissed(true);
    }
  };

  // Don't show if:
  // - Already installed
  // - Dismissed recently
  // - Not on mobile
  // - Can't install and not iOS
  const shouldShow = !isInstalled && !isDismissed && isMobile && (canInstall || isIOS);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg p-4 mx-auto max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">
                  Installer HC Services
                </h3>
                
                {isIOS ? (
                  <div className="text-sm text-muted-foreground mt-1">
                    <p className="flex items-center gap-1">
                      Appuie sur <Share className="w-4 h-4 inline" /> puis
                    </p>
                    <p className="flex items-center gap-1">
                      <Plus className="w-4 h-4 inline" /> "Sur l'écran d'accueil"
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Accède rapidement à l'app depuis ton écran d'accueil
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 -mt-1 -mr-1"
                onClick={handleDismiss}
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!isIOS && canInstall && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDismiss}
                >
                  Plus tard
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleInstall}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Installer
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
