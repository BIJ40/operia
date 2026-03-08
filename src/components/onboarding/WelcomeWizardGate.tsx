/**
 * Controller component that decides if the Welcome Wizard should be shown.
 * Now also handles mustChangePassword by integrating it as the first wizard step.
 * 
 * Exception to NO_POPUP_POLICY: This is a business-critical first-login onboarding,
 * similar to ChangePasswordDialog (security requirement).
 */

import { useState, useEffect, useCallback } from 'react';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { useProfile } from '@/contexts/ProfileContext';
import { WelcomeWizard } from './WelcomeWizard';

export function WelcomeWizardGate() {
  const { mustChangePassword } = useProfile();
  const {
    state,
    isLoading,
    isMutating,
    shouldShowWizard,
    dismissOnboarding,
    completeOnboarding,
  } = useOnboardingState();
  
  const [open, setOpen] = useState(false);
  const [passwordHandled, setPasswordHandled] = useState(false);

  // Show wizard when: onboarding needed OR password change needed
  const needsWizard = shouldShowWizard || (mustChangePassword && !passwordHandled);

  useEffect(() => {
    if (!isLoading && needsWizard && state) {
      setOpen(true);
    }
  }, [isLoading, needsWizard, state]);

  const handlePasswordChanged = useCallback(() => {
    setPasswordHandled(true);
  }, []);

  if (isLoading) return null;
  if (!needsWizard || !state) return null;

  return (
    <WelcomeWizard
      open={open}
      onOpenChange={setOpen}
      onComplete={completeOnboarding}
      onDismiss={dismissOnboarding}
      isMutating={isMutating}
      initialData={state}
      mustChangePassword={mustChangePassword && !passwordHandled}
      onPasswordChanged={handlePasswordChanged}
    />
  );
}
