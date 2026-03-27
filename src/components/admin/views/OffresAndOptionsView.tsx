/**
 * OffresAndOptionsView — Présentation commerciale des plans et du pack Relations
 * 
 * Bloc 1 : Plans principaux (Essentiel / Performance) — lecture seule depuis plan_tiers
 * Bloc 2 : Pack additionnel Relations — basé sur agency_features
 * 
 * Page commerciale, pas une matrice de permissions.
 */

import { usePlanTiers } from '@/hooks/access-rights/usePlanTiers';
import { useAgencySubscription } from '@/hooks/access-rights/useAgencySubscription';
import { useAgencyFeatures } from '@/hooks/access-rights/useAgencyFeature';
import { useAuth } from '@/contexts/AuthContext';
import { AGENCY_FEATURES, RELATIONS_PACK_FEATURES } from '@/config/agencyFeatures';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Crown, Star, Sparkles, Check, Rocket, 
  Mail, Loader2, ArrowRight, Plus, Package
} from 'lucide-react';

/**
 * Mapping produit : présentation marketing des modules par plan
 * On ne liste PAS les module_key bruts — on groupe en familles lisibles
 */
const PLAN_MARKETING: Record<string, {
  name: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  usersInfo?: string;
}> = {
  STARTER: {
    name: 'Essentiel',
    tagline: 'Les fondamentaux pour piloter votre agence',
    features: [
      'Pilotage & Tableau de bord',
      'Gestion commerciale',
      'Organisation & Planning',
      'Parc automobile',
      'RH de base',
      'Support & Assistance',
      'Academy & Formation',
      'Médiathèque',
    ],
  },
  PRO: {
    name: 'Performance',
    tagline: "Tous les outils pour développer votre activité",
    features: [
      'Tout le plan Essentiel',
      'Messaging avancé',
      'Gestion de projets',
      'Exports & Rapports avancés',
      'RH Administration complète',
      'Pilotage financier',
      'Statistiques avancées',
      'Ticketing interne',
    ],
    highlight: true,
    badge: 'Le plus utilisé',
    usersInfo: '10 utilisateurs inclus',
  },
};

function PlanCard({ 
  tierKey, 
  isCurrentPlan 
}: { 
  tierKey: string; 
  isCurrentPlan: boolean;
}) {
  const marketing = PLAN_MARKETING[tierKey];
  if (!marketing) return null;

  const isHighlight = marketing.highlight;

  return (
    <Card className={`relative flex flex-col h-full transition-all duration-200 ${
      isHighlight 
        ? 'border-primary/50 shadow-lg ring-1 ring-primary/20' 
        : 'border-border'
    } ${isCurrentPlan ? 'bg-primary/5' : ''}`}>
      {marketing.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 bg-primary text-primary-foreground shadow-sm px-3">
            <Star className="w-3 h-3" />
            {marketing.badge}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-foreground">
            {marketing.name}
          </CardTitle>
          {isCurrentPlan && (
            <Badge variant="outline" className="gap-1 text-primary border-primary/30">
              <Check className="w-3 h-3" />
              Plan actuel
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{marketing.tagline}</p>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <ul className="space-y-2.5">
          {marketing.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {marketing.usersInfo && (
          <div className="pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              {marketing.usersInfo}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelationsPackCard({ 
  activeFeatures 
}: { 
  activeFeatures: string[];
}) {
  const hasAnyActive = activeFeatures.length > 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold text-foreground">Pack Relations</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Additionnel
              </Badge>
              {hasAnyActive && (
                <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                  <Check className="w-3 h-3" />
                  Actif
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Développez votre réseau et gérez la relation client de bout en bout
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Features du pack */}
        <div className="grid gap-4 sm:grid-cols-3">
          {RELATIONS_PACK_FEATURES.map((key) => {
            const def = AGENCY_FEATURES[key];
            if (!def) return null;
            const isActive = activeFeatures.includes(key);
            const Icon = def.icon;

            return (
              <div
                key={key}
                className={`flex flex-col gap-2 p-4 rounded-lg border transition-colors ${
                  isActive 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium text-foreground">{def.label}</span>
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-green-600 ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{def.description}</p>
              </div>
            );
          })}
        </div>

        {/* Extensions */}
        <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Extensions disponibles</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Plus className="w-3 h-3" />
              +1 espace apporteur
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Plus className="w-3 h-3" />
              Pack 5 espaces
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Plus className="w-3 h-3" />
              Pack 10 espaces
            </Badge>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            5 espaces apporteurs inclus dans le pack de base
          </p>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href="mailto:contact@example.com">
              <Mail className="w-4 h-4" />
              Contactez-nous
              <ArrowRight className="w-3 h-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OffresAndOptionsView() {
  const { agencyId } = useAuth();
  const { data: subscription, isLoading: loadingSub } = useAgencySubscription(agencyId);
  const { data: features, isLoading: loadingFeatures } = useAgencyFeatures();

  const currentTierKey = subscription?.tier_key ?? null;
  const activeFeatureKeys = (features ?? [])
    .filter(f => f.status === 'active' || f.status === 'trial')
    .map(f => f.feature_key);

  if (loadingSub || loadingFeatures) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Crown className="w-6 h-6 text-primary" />
          Offres & Options
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Découvrez les plans disponibles et les options pour votre agence
        </p>
      </div>

      {/* Plans principaux */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Plans principaux</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {(['STARTER', 'PRO'] as const).map((tierKey) => (
            <PlanCard
              key={tierKey}
              tierKey={tierKey}
              isCurrentPlan={currentTierKey === tierKey}
            />
          ))}
        </div>
      </div>

      {/* Pack Relations */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Pack additionnel</h3>
        <RelationsPackCard activeFeatures={activeFeatureKeys} />
      </div>
    </div>
  );
}
