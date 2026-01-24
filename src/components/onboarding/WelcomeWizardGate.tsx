/**
 * Controller component that decides if the Welcome Wizard should be shown
 * Based on onboarding_completed_at and onboarding_dismissed_until
 * 
 * Exception to NO_POPUP_POLICY: This is a business-critical first-login onboarding,
 * similar to ChangePasswordDialog (security requirement).
 */

import { useState, useEffect } from 'react';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { WelcomeWizard } from './WelcomeWizard';
import { Loader2 } from 'lucide-react';

export function WelcomeWizardGate() {
  const {
    state,
    isLoading,
    isMutating,
    shouldShowWizard,
    dismissOnboarding,
    completeOnboarding,
  } = useOnboardingState();
  
  const [open, setOpen] = useState(false);

  // Open wizard when conditions are met (after loading)
  useEffect(() => {
    if (!isLoading && shouldShowWizard && state) {
      setOpen(true);
    }
  }, [isLoading, shouldShowWizard, state]);

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Don't render if wizard shouldn't be shown
  if (!shouldShowWizard || !state) {
    return null;
  }

  return (
    <WelcomeWizard
      open={open}
      onOpenChange={setOpen}
      onComplete={completeOnboarding}
      onDismiss={dismissOnboarding}
      isMutating={isMutating}
      initialData={state}
    />
  );
}
