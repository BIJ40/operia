/**
 * Hook pour gérer l'état d'onboarding de l'utilisateur
 * Gère le fetch, le snooze (7j), et la completion
 */

import { useState, useEffect, useCallback } from 'react';
import { logError } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface OnboardingPayload {
  priorities?: string[];
  orientation_acknowledged?: boolean;
  [key: string]: unknown;
}

export interface OnboardingState {
  onboarding_completed_at: string | null;
  onboarding_dismissed_until: string | null;
  onboarding_version: number;
  onboarding_payload: OnboardingPayload;
  // Profile data for pre-fill
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_notifications_enabled: boolean;
  global_role: string | null;
  role_agence: string | null;
}

export interface OnboardingUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email_notifications_enabled?: boolean;
  preferred_home_route?: string;
  onboarding_payload?: OnboardingPayload;
}

export function useOnboardingState() {
  const { user, isAuthLoading } = useAuthCore();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Fetch onboarding state
  const fetchState = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          onboarding_completed_at,
          onboarding_dismissed_until,
          onboarding_version,
          onboarding_payload,
          first_name,
          last_name,
          phone,
          email_notifications_enabled,
          global_role,
          role_agence
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        logError('[Onboarding] Fetch error:', error);
        setIsLoading(false);
        return;
      }

      setState({
        onboarding_completed_at: data.onboarding_completed_at,
        onboarding_dismissed_until: data.onboarding_dismissed_until,
        onboarding_version: data.onboarding_version ?? 1,
        onboarding_payload: (data.onboarding_payload as OnboardingPayload) ?? {},
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email_notifications_enabled: data.email_notifications_enabled ?? true,
        global_role: data.global_role,
        role_agence: data.role_agence,
      });
    } catch (err) {
      logError('[Onboarding] Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthLoading && user?.id) {
      fetchState();
    } else if (!isAuthLoading && !user) {
      setIsLoading(false);
    }
  }, [isAuthLoading, user?.id, fetchState]);

  // Determine if wizard should be shown
  const shouldShowWizard = useCallback(() => {
    if (!state) return false;
    
    // Already completed
    if (state.onboarding_completed_at) return false;
    
    // Snoozed and not expired
    if (state.onboarding_dismissed_until) {
      const dismissedUntil = new Date(state.onboarding_dismissed_until);
      if (dismissedUntil > new Date()) return false;
    }
    
    return true;
  }, [state]);

  // Snooze for 7 days
  const dismissOnboarding = useCallback(async () => {
    if (!user?.id) return { success: false };
    
    setIsMutating(true);
    try {
      const dismissUntil = new Date();
      dismissUntil.setDate(dismissUntil.getDate() + 7);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_dismissed_until: dismissUntil.toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        logError('[Onboarding] Dismiss error:', error);
        toast.error('Erreur lors de la sauvegarde');
        return { success: false };
      }

      setState(prev => prev ? {
        ...prev,
        onboarding_dismissed_until: dismissUntil.toISOString(),
      } : null);
      
      return { success: true };
    } finally {
      setIsMutating(false);
    }
  }, [user?.id]);

  // Complete onboarding with all data
  const completeOnboarding = useCallback(async (data: OnboardingUpdateData) => {
    if (!user?.id) return { success: false };
    
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed_at: new Date().toISOString(),
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          email_notifications_enabled: data.email_notifications_enabled,
          preferred_home_route: data.preferred_home_route,
          onboarding_payload: (data.onboarding_payload ?? {}) as Json,
        })
        .eq('id', user.id);

      if (error) {
        logError('[Onboarding] Complete error:', error);
        toast.error('Erreur lors de la sauvegarde');
        return { success: false };
      }

      setState(prev => prev ? {
        ...prev,
        onboarding_completed_at: new Date().toISOString(),
        first_name: data.first_name ?? prev.first_name,
        last_name: data.last_name ?? prev.last_name,
        phone: data.phone ?? prev.phone,
        email_notifications_enabled: data.email_notifications_enabled ?? prev.email_notifications_enabled,
        onboarding_payload: data.onboarding_payload ?? prev.onboarding_payload,
      } : null);

      toast.success('Bienvenue ! Vos préférences ont été enregistrées.');
      return { success: true };
    } finally {
      setIsMutating(false);
    }
  }, [user?.id]);

  return {
    state,
    isLoading: isLoading || isAuthLoading,
    isMutating,
    shouldShowWizard: shouldShowWizard(),
    dismissOnboarding,
    completeOnboarding,
    refetch: fetchState,
  };
}
