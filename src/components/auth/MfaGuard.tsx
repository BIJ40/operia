/**
 * MfaGuard — Wraps sensitive routes/areas that require MFA.
 * 
 * Behavior depends on MFA_ENFORCEMENT_MODE:
 * - 'off': passes through unconditionally
 * - 'advisory': shows a dismissible banner if MFA not enrolled
 * - 'enforced': blocks access until MFA is verified (AAL2)
 */

import { ReactNode, useState } from 'react';
import { useMfa } from '@/hooks/useMfa';
import { MfaEnrollDialog } from './MfaEnrollDialog';
import { MfaChallengeDialog } from './MfaChallengeDialog';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MfaGuardProps {
  children: ReactNode;
  /** Override global enforcement for this specific guard */
  enforce?: boolean;
}

export function MfaGuard({ children, enforce }: MfaGuardProps) {
  const {
    isLoading,
    isMfaRequired,
    isEnrolled,
    needsEnrollment,
    needsChallenge,
    enforcementMode,
  } = useMfa();

  const [showEnroll, setShowEnroll] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Determine effective enforcement
  const isEnforced = enforce ?? enforcementMode === 'enforced';
  const isAdvisory = !isEnforced && enforcementMode === 'advisory';

  // Off mode or user's role doesn't require MFA → pass through
  if (enforcementMode === 'off' || !isMfaRequired) {
    return <>{children}</>;
  }

  // Loading MFA state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ENFORCED MODE: Block if not enrolled
  if (isEnforced && needsEnrollment) {
    return (
      <>
        <MfaEnrollmentRequired onEnroll={() => setShowEnroll(true)} />
        <MfaEnrollDialog open={showEnroll} onOpenChange={setShowEnroll} />
      </>
    );
  }

  // ENFORCED MODE: Block if enrolled but at AAL1
  if (isEnforced && needsChallenge) {
    return (
      <>
        <MfaChallengeRequired onChallenge={() => setShowChallenge(true)} />
        <MfaChallengeDialog open={showChallenge} onOpenChange={setShowChallenge} />
      </>
    );
  }

  // ADVISORY MODE: Show dismissible banner
  if (isAdvisory && needsEnrollment && !dismissed) {
    return (
      <>
        <MfaAdvisoryBanner
          onEnroll={() => setShowEnroll(true)}
          onDismiss={() => setDismissed(true)}
        />
        <MfaEnrollDialog open={showEnroll} onOpenChange={setShowEnroll} />
        {children}
      </>
    );
  }

  return <>{children}</>;
}

// ============================================================================
// Sub-components
// ============================================================================

function MfaEnrollmentRequired({ onEnroll }: { onEnroll: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
        <Shield className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">
        Authentification à deux facteurs requise
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Votre rôle nécessite l'activation de l'authentification à deux facteurs (MFA)
        pour accéder à cette zone sensible.
      </p>
      <Button onClick={onEnroll} size="lg">
        <Shield className="w-4 h-4 mr-2" />
        Configurer le MFA maintenant
      </Button>
    </div>
  );
}

function MfaChallengeRequired({ onChallenge }: { onChallenge: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
        <Shield className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">
        Vérification de sécurité requise
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Veuillez vérifier votre identité avec votre application d'authentification
        pour accéder à cette zone.
      </p>
      <Button onClick={onChallenge} size="lg">
        <Shield className="w-4 h-4 mr-2" />
        Vérifier mon identité
      </Button>
    </div>
  );
}

function MfaAdvisoryBanner({
  onEnroll,
  onDismiss,
}: {
  onEnroll: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-4 mt-4 mb-2 rounded-lg border border-accent/30 bg-accent/10 p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-accent-foreground mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          Sécurité : activez l'authentification à deux facteurs
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Votre rôle donne accès à des zones sensibles. L'activation du MFA est fortement recommandée
          et sera bientôt obligatoire.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={onEnroll}>
            Activer le MFA
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Plus tard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MfaGuard;
