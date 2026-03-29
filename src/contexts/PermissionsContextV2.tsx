import React, { createContext, useContext, useMemo } from 'react';
import { useUserPermissionsV2 } from '@/hooks/useUserPermissionsV2';
import { PermissionEntry, AccessLevel, PermissionSource, SOURCE_LABELS } from '@/types/permissions-v2';

interface PermissionsContextV2Value {
  // Vérifications principales
  hasModule: (key: string) => boolean;
  hasModuleOption: (key: string, option: string) => boolean;
  getAccessLevel: (key: string) => AccessLevel;
  getSourceSummary: (key: string) => PermissionSource | null;
  getSourceLabel: (key: string) => string;
  isDeployed: (key: string) => boolean;
  preconditionsOk: (key: string) => boolean;

  // Données brutes
  entries: PermissionEntry[];
  isLoaded: boolean;
  userId: string | null;
}

const PermissionsContextV2 = createContext<PermissionsContextV2Value | null>(null);

interface Props {
  userId: string | null;
  children: React.ReactNode;
}

export function PermissionsProviderV2({ userId, children }: Props) {
  const { data: entries = [], isSuccess } = useUserPermissionsV2(userId);

  const value = useMemo<PermissionsContextV2Value>(() => {
    const map = new Map<string, PermissionEntry>();
    for (const entry of entries) {
      map.set(entry.module_key, entry);
    }

    return {
      hasModule: (key: string) => {
        // RÈGLE CONSTITUTION R3 : ne jamais tester une section comme droit
        // hasModule retourne true uniquement si granted=true ET access_level != 'none'
        const entry = map.get(key);
        if (!entry) return false;
        return entry.granted && entry.access_level !== 'none';
      },

      hasModuleOption: (key: string, option: string) => {
        const entry = map.get(key);
        if (!entry || !entry.granted) return false;
        return entry.options?.[option] === true;
      },

      getAccessLevel: (key: string): AccessLevel => {
        return map.get(key)?.access_level ?? 'none';
      },

      getSourceSummary: (key: string): PermissionSource | null => {
        return (map.get(key)?.source_summary as PermissionSource) ?? null;
      },

      getSourceLabel: (key: string): string => {
        const source = map.get(key)?.source_summary as PermissionSource | undefined;
        if (!source) return '';
        return SOURCE_LABELS[source] ?? source;
      },

      isDeployed: (key: string): boolean => {
        // Un module présent dans les résultats est par définition déployé
        // Un module absent est soit non déployé soit non accordé
        return map.has(key);
      },

      preconditionsOk: (key: string): boolean => {
        return map.get(key)?.preconditions_ok ?? false;
      },

      entries,
      isLoaded: isSuccess,
      userId,
    };
  }, [entries, isSuccess, userId]);

  return (
    <PermissionsContextV2.Provider value={value}>
      {children}
    </PermissionsContextV2.Provider>
  );
}

export function usePermissionsV2(): PermissionsContextV2Value {
  const ctx = useContext(PermissionsContextV2);
  if (!ctx) {
    throw new Error(
      'usePermissionsV2 doit être utilisé dans un PermissionsProviderV2. ' +
      'Vérifier que USE_PERMISSIONS_V2 est activé.'
    );
  }
  return ctx;
}

export { PermissionsContextV2 };

/**
 * Version safe de usePermissionsV2 — retourne null si le contexte est absent.
 * Utiliser uniquement dans usePermissionsBridge pour éviter la violation des règles des hooks.
 * Ne jamais utiliser dans les composants — utiliser usePermissionsV2() directement.
 */
export function usePermissionsV2Safe() {
  return useContext(PermissionsContextV2);
}
