/**
 * Page Admin - Fonctionnalités masquées
 * Récapitule toutes les fonctionnalités temporairement désactivées
 */

import { EyeOff, Clock, AlertTriangle, Info, Calendar, FileText, Fingerprint, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Separator } from '@/components/ui/separator';

interface HiddenFeature {
  id: string;
  name: string;
  description: string;
  module: string;
  hiddenRoutes: string[];
  reason: string;
  hiddenSince?: string;
  plannedReturn?: string;
  priority: 'low' | 'medium' | 'high';
}

// Liste centralisée des fonctionnalités masquées
const HIDDEN_FEATURES: HiddenFeature[] = [
  {
    id: 'veille-apporteurs',
    name: 'Veille Apporteurs',
    description: 'Radar de surveillance des apporteurs d\'affaires : dormants, en déclin, sous-seuil CA.',
    module: 'Pilotage Agence',
    hiddenRoutes: ['/agency/veille-apporteurs'],
    reason: 'Fonctionnalité en cours de finalisation - engine StatIA opérationnel mais UI non stabilisée.',
    priority: 'medium',
  },
  // Legacy N1 (pointage-technicien, gestion-heures, validation-pointages) supprimés v0.8.3
];

function getPriorityColor(priority: HiddenFeature['priority']) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getPriorityLabel(priority: HiddenFeature['priority']) {
  switch (priority) {
    case 'high':
      return 'Haute';
    case 'medium':
      return 'Moyenne';
    case 'low':
      return 'Basse';
  }
}

export default function HiddenFeaturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fonctionnalités Masquées</h1>
        <p className="text-muted-foreground">Récapitulatif des fonctionnalités temporairement désactivées</p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20">
              <EyeOff className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{HIDDEN_FEATURES.length}</p>
              <p className="text-xs text-muted-foreground">Fonctionnalités masquées</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{HIDDEN_FEATURES.filter(f => f.priority === 'high').length}</p>
              <p className="text-xs text-muted-foreground">Priorité haute</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{HIDDEN_FEATURES.filter(f => f.priority === 'medium').length}</p>
              <p className="text-xs text-muted-foreground">Priorité moyenne</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">À propos de cette page</p>
            <p className="text-blue-700 mt-1">
              Cette page recense toutes les fonctionnalités temporairement masquées de l'application. 
              Ces fonctionnalités sont en cours de développement ou en attente de validation. 
              Les routes restent fonctionnelles mais les accès UI sont désactivés.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Liste des fonctionnalités masquées */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-muted-foreground" />
          Détail des fonctionnalités
        </h2>

        {HIDDEN_FEATURES.map((feature) => (
          <Card key={feature.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                    {feature.name}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </div>
                <Badge variant="outline" className={getPriorityColor(feature.priority)}>
                  Priorité {getPriorityLabel(feature.priority)}
                </Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
              {/* Module */}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="font-normal">
                  {feature.module}
                </Badge>
              </div>

              {/* Routes masquées */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Routes / Éléments masqués
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {feature.hiddenRoutes.map((route) => (
                    <code 
                      key={route} 
                      className="text-xs bg-muted px-2 py-0.5 rounded font-mono"
                    >
                      {route}
                    </code>
                  ))}
                </div>
              </div>

              {/* Raison */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Raison du masquage
                </p>
                <p className="text-sm text-foreground">{feature.reason}</p>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {feature.hiddenSince && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Masqué depuis: {feature.hiddenSince}
                  </span>
                )}
                {feature.plannedReturn && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Retour prévu: {feature.plannedReturn}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message si aucune fonctionnalité masquée */}
      {HIDDEN_FEATURES.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium">Aucune fonctionnalité masquée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Toutes les fonctionnalités de l'application sont actuellement actives.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
