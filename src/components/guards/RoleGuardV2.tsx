import React from 'react';
import { usePermissionsV2 } from '@/contexts/PermissionsContextV2';

interface RoleGuardV2Props {
  minLevel: number; // 0 à 6
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard V2 basé sur le niveau de rôle global.
 * minLevel=5 → N5+ uniquement (admin plateforme)
 * minLevel=2 → N2+ (franchisee_admin et au-dessus)
 *
 * Note : détecte N5+ via la présence de source_summary='bypass' dans les entries.
 * Pour les niveaux < 5, ce guard laisse passer — utiliser ModuleGuardV2 avec min_role
 * pour un contrôle plus granulaire sur les niveaux intermédiaires.
 */
export function RoleGuardV2({
  minLevel,
  children,
  fallback = null,
}: RoleGuardV2Props) {
  const { entries } = usePermissionsV2();

  // bypass dans les entries = N5+
  const hasBypass = entries.some((e) => e.source_summary === 'bypass');

  if (minLevel >= 5 && !hasBypass) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
