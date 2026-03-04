/**
 * PlanningAugmenteAdmin - Page admin pour le module Planification Augmentée
 * Affiche: config pondérations, logs récents, KPIs usage
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Settings, History, BarChart3, Loader2 } from 'lucide-react';
import { useRecentSuggestions, useRecentMoves, useOptimizerConfig } from '@/hooks/usePlanningAugmente';
import { useAuth } from '@/contexts/AuthContext';

const WEIGHT_LABELS: Record<string, string> = {
  sla: 'SLA / Urgence',
  ca: 'CA / Marge',
  route: 'Temps de route',
  coherence: 'Cohérence technique',
  equity: 'Équité charge',
  continuity: 'Continuité technicien',
};

export default function PlanningAugmenteAdmin() {
  const { agencyId } = useAuth();

  const { data: config, isLoading: configLoading } = useOptimizerConfig(agencyId ?? undefined);
  const { data: suggestions, isLoading: suggestionsLoading } = useRecentSuggestions(agencyId ?? undefined);
  const { data: moves, isLoading: movesLoading } = useRecentMoves(agencyId ?? undefined);

  const weights = (config as any)?.weights as Record<string, number> ?? {
    sla: 0.3, ca: 0.2, route: 0.2, coherence: 0.15, equity: 0.1, continuity: 0.05,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Planification Augmentée</h2>
          <p className="text-sm text-muted-foreground">
            Moteur V1 — Scoring heuristique multi-critères
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          V1 Heuristique
        </Badge>
      </div>

      {/* Weights config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Pondérations du moteur
          </CardTitle>
          <CardDescription className="text-xs">
            Poids relatifs des critères d'optimisation (somme = 1.0)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-xs text-muted-foreground">{WEIGHT_LABELS[key] ?? key}</span>
                  <span className="text-sm font-mono font-medium text-foreground">
                    {((value as number) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-foreground">
              {suggestionsLoading ? '…' : (suggestions?.length ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">Suggestions générées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-2 text-accent-foreground" />
            <div className="text-2xl font-bold text-foreground">
              {movesLoading ? '…' : (moves?.length ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">Optimisations semaine</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-foreground">
              {suggestionsLoading ? '…' : (suggestions?.filter((s: any) => s.status === 'applied').length ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">Suggestions appliquées</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestionsLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : !suggestions?.length ? (
            <p className="text-sm text-muted-foreground">Aucune suggestion générée pour le moment.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {suggestions.slice(0, 10).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">
                    Dossier #{s.dossier_id}
                  </span>
                  <Badge variant={s.status === 'applied' ? 'default' : 'secondary'} className="text-xs">
                    {s.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
