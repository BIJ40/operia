/**
 * DashboardWelcomeMessage - Message d'aide pour les widgets, dismissible
 */

import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'hc-dashboard-welcome-dismissed';

export function DashboardWelcomeMessage() {
  const [isDismissed, setIsDismissed] = useState(true); // Par défaut caché pour éviter le flash

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className="relative mb-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-foreground">
            <strong>Organise ton Dashboard :</strong> clique sur modifier et ajoute/organise tes widgets disponibles
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="w-4 h-4 mr-1" />
          Ne plus afficher
        </Button>
      </div>
    </div>
  );
}
