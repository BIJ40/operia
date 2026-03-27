import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SuiviErrorStateProps {
  projectRef: string;
}

export function SuiviErrorState({ projectRef }: SuiviErrorStateProps) {
  return (
    <div className="container max-w-4xl py-10">
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-2xl font-bold">Dossier introuvable</h2>
            <p className="text-muted-foreground">
              Le dossier avec la référence <strong>{projectRef}</strong> n'a pas été trouvé.
            </p>
            <p className="text-sm text-muted-foreground">
              Veuillez vérifier la référence et réessayer.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
