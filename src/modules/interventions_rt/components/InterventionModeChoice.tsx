// Écran B1 - Choix du mode d'intervention

import { ArrowLeft, ClipboardList, Wrench, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TechIntervention, InterventionMode } from '../types';

interface InterventionModeChoiceProps {
  intervention: TechIntervention;
  onBack: () => void;
  onSelectMode: (mode: InterventionMode) => void;
}

export function InterventionModeChoice({ intervention, onBack, onSelectMode }: InterventionModeChoiceProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Démarrer l'intervention</h1>
            <p className="text-xs text-muted-foreground">{intervention.clientName}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Title */}
          <div className="text-center pt-4 pb-2">
            <h2 className="text-xl font-semibold mb-2">Que fais-tu sur ce rendez-vous ?</h2>
            <p className="text-sm text-muted-foreground">
              Choisis le type d'intervention pour commencer
            </p>
          </div>

          {/* Mode Cards */}
          <div className="space-y-4">
            {/* Relevé technique complet */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary active:scale-[0.98]"
              onClick={() => onSelectMode('rt')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Relevé technique complet</CardTitle>
                    <CardDescription className="mt-1">
                      Questionnaire guidé étape par étape, avec photos et génération automatique d'un PDF pour le bureau.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Durée estimée : 5-15 min selon le problème</span>
                </div>
              </CardContent>
            </Card>

            {/* Dépannage direct (placeholder) */}
            <Card className="opacity-60 border-dashed">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Wrench className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg text-muted-foreground">
                        Dépannage direct
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        Bientôt
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      Intervention directe sans relevé technique complet. Idéal pour les petits dépannages rapides.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground italic">
                  Ce mode sera disponible dans une prochaine version.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterventionModeChoice;
