/**
 * FeatureGuard — Guard contextuel pour les features agence (couche SaaS)
 * Affiche un bloc d'upsell compact si la feature est inactive.
 * NE remplace PAS PlanGuard — usage exclusif pour les features Relations.
 */

import { ReactNode } from 'react';
import { useAgencyFeature } from '@/hooks/access-rights/useAgencyFeature';
import { AGENCY_FEATURES, type AgencyFeatureKey } from '@/config/agencyFeatures';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGuardProps {
  featureKey: AgencyFeatureKey;
  children: ReactNode;
  /** Message personnalisé pour le bloc d'upsell */
  upsellMessage?: string;
}

export function FeatureGuard({ featureKey, children, upsellMessage }: FeatureGuardProps) {
  const { isActive, isLoading } = useAgencyFeature(featureKey);
  const navigate = useNavigate();
  const featureDef = AGENCY_FEATURES[featureKey];

  if (isLoading) return null;
  if (isActive) return <>{children}</>;

  const Icon = featureDef?.icon ?? Lock;

  return (
    <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
          <Icon className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">
              {featureDef?.label ?? featureKey}
            </h3>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Pack Relations
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            {upsellMessage ?? featureDef?.description ?? "Cette fonctionnalité nécessite une option supplémentaire."}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/?tab=admin&adminTab=offres')}
          className="mt-2 gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Découvrir l'offre
        </Button>
      </CardContent>
    </Card>
  );
}
