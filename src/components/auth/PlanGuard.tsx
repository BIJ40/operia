/**
 * PlanGuard - Protection de routes basée sur le plan agence
 * Phase 6 du Plan de Simplification V3.0
 * 
 * Vérifie que l'agence de l'utilisateur a souscrit au plan minimum requis.
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePlanAccess } from '@/hooks/access-rights/usePlanAccess';
import { PlanKey, PLAN_LABELS } from '@/config/planTiers';
import { Loader2, Crown, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlanGuardProps {
  /** Plan minimum requis pour accéder */
  requiredPlan: PlanKey;
  /** Contenu à afficher si autorisé */
  children: ReactNode;
  /** Redirection si non autorisé (défaut: /) */
  redirectTo?: string;
  /** Afficher une page d'upgrade au lieu de rediriger */
  showUpgradePrompt?: boolean;
  /** Message personnalisé pour l'upgrade */
  upgradeMessage?: string;
}

/**
 * Guard de route basé sur le plan agence
 * 
 * Autorise l'accès si:
 * - L'utilisateur est N5+ (bypass)
 * - L'agence a un plan >= requiredPlan
 */
export function PlanGuard({ 
  requiredPlan,
  children, 
  redirectTo = '/',
  showUpgradePrompt = true,
  upgradeMessage,
}: PlanGuardProps) {
  const { hasRequiredPlan, currentPlanLabel, requiredPlanLabel, isLoading, isBypass } = usePlanAccess(requiredPlan);

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Vérification du plan...</span>
      </div>
    );
  }

  // Accès autorisé
  if (hasRequiredPlan || isBypass) {
    return <>{children}</>;
  }

  // Afficher le prompt d'upgrade
  if (showUpgradePrompt) {
    return (
      <PlanUpgradePrompt 
        currentPlan={currentPlanLabel}
        requiredPlan={requiredPlanLabel}
        message={upgradeMessage}
      />
    );
  }

  // Redirection silencieuse
  return <Navigate to={redirectTo} replace />;
}

/**
 * Composant d'invitation à passer au plan supérieur
 */
function PlanUpgradePrompt({ 
  currentPlan, 
  requiredPlan,
  message,
}: { 
  currentPlan: string;
  requiredPlan: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <Card className="max-w-lg w-full text-center">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary">
              <Crown className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">Fonctionnalité Premium</CardTitle>
          <CardDescription className="text-base">
            {message || "Cette fonctionnalité nécessite un plan supérieur."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Plan actuel</p>
              <span className="inline-block px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                {currentPlan}
              </span>
            </div>
            <ArrowUpCircle className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Plan requis</p>
              <span className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground font-medium">
                {requiredPlan}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Contactez votre administrateur ou le réseau HelpConfort pour passer au plan {requiredPlan}.
          </p>
          
          <Button variant="outline" onClick={() => window.history.back()}>
            Retour
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PlanGuard;
