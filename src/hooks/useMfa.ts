/**
 * useMfa — Hook for Supabase MFA (TOTP) operations.
 * 
 * Wraps supabase.auth.mfa.* APIs with React-friendly state management.
 * Provides enrollment, challenge/verify, and factor listing.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';
import { isRoleRequiringMfa, MFA_ENFORCEMENT_MODE } from '@/lib/mfa';
import type { Factor } from '@supabase/supabase-js';

export interface MfaState {
  /** Whether MFA data is still loading */
  isLoading: boolean;
  /** User's current AAL (aal1 or aal2) */
  currentLevel: 'aal1' | 'aal2' | null;
  /** Whether user has at least one verified TOTP factor */
  isEnrolled: boolean;
  /** Whether user's role requires MFA */
  isMfaRequired: boolean;
  /** Whether user needs to enroll (required but not enrolled) */
  needsEnrollment: boolean;
  /** Whether user needs to verify (enrolled but at aal1) */
  needsChallenge: boolean;
  /** List of user's TOTP factors */
  factors: Factor[];
  /** Current enforcement mode */
  enforcementMode: typeof MFA_ENFORCEMENT_MODE;
}

export interface MfaActions {
  /** Start TOTP enrollment — returns QR code URI and factor ID */
  enroll: () => Promise<{ factorId: string; qrCode: string; secret: string } | null>;
  /** Challenge + verify a TOTP code */
  verify: (factorId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  /** Unenroll a factor */
  unenroll: (factorId: string) => Promise<{ success: boolean; error?: string }>;
  /** Refresh factors list */
  refresh: () => Promise<void>;
}

export function useMfa(): MfaState & MfaActions {
  const { user } = useAuthCore();
  const { globalRole } = usePermissions();

  const [isLoading, setIsLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<'aal1' | 'aal2' | null>(null);
  const [factors, setFactors] = useState<Factor[]>([]);

  const isMfaRequired = isRoleRequiringMfa(globalRole);
  const verifiedFactors = factors.filter(f => f.status === 'verified' && f.factor_type === 'totp');
  const isEnrolled = verifiedFactors.length > 0;
  const needsEnrollment = isMfaRequired && !isEnrolled;
  const needsChallenge = isEnrolled && currentLevel === 'aal1';

  // Load MFA state
  const refresh = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get AAL level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setCurrentLevel(aalData?.currentLevel ?? null);

      // List factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      setFactors(factorsData?.totp ?? []);
    } catch (err) {
      console.error('[MFA] Error loading MFA state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Enroll a new TOTP factor
  const enroll = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Operia TOTP',
      });

      if (error || !data) {
        console.error('[MFA] Enroll error:', error);
        return null;
      }

      return {
        factorId: data.id,
        qrCode: data.totp.uri,
        secret: data.totp.secret,
      };
    } catch (err) {
      console.error('[MFA] Enroll exception:', err);
      return null;
    }
  }, []);

  // Challenge + verify
  const verify = useCallback(async (factorId: string, code: string) => {
    try {
      const { data: challengeData, error: challengeError } = 
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError || !challengeData) {
        return { success: false, error: challengeError?.message ?? 'Erreur de challenge MFA' };
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        return { success: false, error: verifyError.message };
      }

      // Refresh state after successful verification
      await refresh();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inattendue';
      return { success: false, error: message };
    }
  }, [refresh]);

  // Unenroll a factor
  const unenroll = useCallback(async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) return { success: false, error: error.message };
      await refresh();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inattendue';
      return { success: false, error: message };
    }
  }, [refresh]);

  return {
    isLoading,
    currentLevel,
    isEnrolled,
    isMfaRequired,
    needsEnrollment,
    needsChallenge,
    factors: verifiedFactors,
    enforcementMode: MFA_ENFORCEMENT_MODE,
    enroll,
    verify,
    unenroll,
    refresh,
  };
}
