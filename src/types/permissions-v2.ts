export type AccessLevel = 'none' | 'read' | 'full';

export type PermissionSource =
  | 'bypass'
  | 'is_core'
  | 'plan'
  | 'option_agence'
  | 'agency_delegation'
  | 'platform_assignment'
  | 'pack_grant'
  | 'job_preset'
  | 'manual_exception'
  | 'auto_section'
  | 'not_granted';  // Module déployé mais non accordé — pour la logique 3 états UI

export interface PermissionEntry {
  module_key: string;
  granted: boolean;
  access_level: AccessLevel;
  options: Record<string, boolean> | null;
  node_type: 'section' | 'screen' | 'feature';
  source_summary: PermissionSource;
  preconditions_ok: boolean;
}

export interface PermissionsV2State {
  entries: PermissionEntry[];
  isLoaded: boolean;
  userId: string | null;
}

export const SOURCE_LABELS: Record<PermissionSource, string> = {
  bypass:              'Accès administrateur',
  is_core:             'Module de base',
  plan:                'Inclus dans votre plan',
  option_agence:       'Option activée',
  agency_delegation:   'Accordé par votre dirigeant',
  platform_assignment: 'Assigné par la plateforme',
  pack_grant:          'Inclus dans un pack',
  job_preset:          'Profil de poste',
  manual_exception:    'Exception accordée',
  auto_section:        'Navigation',
  not_granted:         'Non accordé',
};
