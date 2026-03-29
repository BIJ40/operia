import React from 'react';
import { usePermissionsV2 } from '@/contexts/PermissionsContextV2';
import { ModulePreconditionEmpty } from './ModulePreconditionEmpty';

interface ModuleGuardV2Props {
  moduleKey: string;
  option?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Si true, passe readOnly={true} aux enfants quand access_level = 'read' */
  passReadOnly?: boolean;
}

/**
 * Guard V2 — Constitution Règle 3 :
 * Ne jamais passer une section comme moduleKey.
 * Toujours passer le module feuille (screen ou feature).
 * Ex: "pilotage.statistiques.general" pas "pilotage"
 */
export function ModuleGuardV2({
  moduleKey,
  option,
  children,
  fallback = null,
  passReadOnly = false,
}: ModuleGuardV2Props) {
  const { hasModule, hasModuleOption, preconditionsOk, getAccessLevel } =
    usePermissionsV2();

  // Pas d'accès au module
  if (!hasModule(moduleKey)) {
    return <>{fallback}</>;
  }

  // Option requise mais absente
  if (option && !hasModuleOption(moduleKey, option)) {
    return <>{fallback}</>;
  }

  // Module accordé mais précondition manquante
  if (!preconditionsOk(moduleKey)) {
    return <ModulePreconditionEmpty moduleKey={moduleKey} />;
  }

  // access_level = read — passer readOnly aux enfants si demandé
  if (passReadOnly && getAccessLevel(moduleKey) === 'read') {
    return (
      <>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { readOnly: true } as Record<string, unknown>);
          }
          return child;
        })}
      </>
    );
  }

  return <>{children}</>;
}
