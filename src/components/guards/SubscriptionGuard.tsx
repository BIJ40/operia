/**
 * SubscriptionGuard — Protège l'accès aux contenus payants
 * Vérifie l'abonnement de l'agence OU le statut admin plateforme
 */
import React from 'react';
import { useAgencySubscriptions, type PlanKey } from '@/hooks/useAgencySubscriptions';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';

interface SubscriptionGuardProps {
  plan: PlanKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SubscriptionGuard({ plan, children, fallback = null }: SubscriptionGuardProps) {
  const { globalRole } = usePermissionsBridge();
  const { hasPilotage, hasSuivi, isLoading } = useAgencySubscriptions();

  // Admin plateforme = accès total
  const isAdmin = globalRole === 'platform_admin' || globalRole === 'superadmin';
  if (isAdmin) return <>{children}</>;

  if (isLoading) return null;

  const hasAccess = plan === 'pilotage' ? hasPilotage : hasSuivi;
  if (!hasAccess) return <>{fallback}</>;

  return <>{children}</>;
}
