import React from 'react';
import { Loader2 } from 'lucide-react';

export function SuiviLoadingState() {
  return (
    <div className="container max-w-4xl py-10">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Chargement de votre dossier...</p>
      </div>
    </div>
  );
}
