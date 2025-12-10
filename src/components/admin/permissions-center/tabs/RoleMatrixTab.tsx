/**
 * Onglet 1 - Matrice des Rôles (lecture seule)
 * Affiche la matrice rôles × capacités
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Minus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GLOBAL_ROLE_LABELS, GlobalRole } from '@/types/globalRoles';
import { ROLE_HIERARCHY, AGENCY_ROLES, BYPASS_ROLES } from '@/permissions';

// Définition des capacités à afficher dans la matrice
const MATRIX_CAPABILITIES = [
  { 
    id: 'bypass_all', 
    label: 'Bypass Total', 
    description: 'Accès absolu à toutes les fonctionnalités sans restriction',
    category: 'Général'
  },
  { 
    id: 'requires_agency', 
    label: 'Nécessite Agence', 
    description: 'Ce rôle DOIT avoir une agence assignée',
    category: 'Général'
  },
  { 
    id: 'access_pilotage', 
    label: 'Pilotage Agence', 
    description: 'Statistiques, KPIs et actions à mener de l\'agence',
    category: 'Modules'
  },
  { 
    id: 'access_rh', 
    label: 'Module RH', 
    description: 'Gestion des collaborateurs et documents RH',
    category: 'Modules'
  },
  { 
    id: 'access_reseau', 
    label: 'Réseau Franchiseur', 
    description: 'Vue multi-agences et statistiques réseau',
    category: 'Modules'
  },
  { 
    id: 'access_admin', 
    label: 'Administration', 
    description: 'Paramètres de la plateforme',
    category: 'Modules'
  },
  { 
    id: 'can_be_support_agent', 
    label: 'Agent Support', 
    description: 'Peut être activé comme agent support (SA1-SA3)',
    category: 'Support'
  },
  { 
    id: 'can_manage_users', 
    label: 'Gérer Utilisateurs', 
    description: 'Créer, modifier et désactiver des utilisateurs',
    category: 'Gestion'
  },
];

// Rôles dans l'ordre hiérarchique
const ROLES_ORDER: GlobalRole[] = [
  'base_user',
  'franchisee_user', 
  'franchisee_admin',
  'franchisor_user',
  'franchisor_admin',
  'platform_admin',
  'superadmin'
];

// Matrice de capacités par rôle
const CAPABILITY_MATRIX: Record<GlobalRole, Record<string, 'yes' | 'no' | 'conditional'>> = {
  base_user: {
    bypass_all: 'no',
    requires_agency: 'no',
    access_pilotage: 'no',
    access_rh: 'conditional', // coffre seulement
    access_reseau: 'no',
    access_admin: 'no',
    can_be_support_agent: 'conditional',
    can_manage_users: 'no',
  },
  franchisee_user: {
    bypass_all: 'no',
    requires_agency: 'yes',
    access_pilotage: 'no',
    access_rh: 'conditional', // coffre seulement
    access_reseau: 'no',
    access_admin: 'no',
    can_be_support_agent: 'conditional',
    can_manage_users: 'no',
  },
  franchisee_admin: {
    bypass_all: 'no',
    requires_agency: 'yes',
    access_pilotage: 'yes',
    access_rh: 'yes',
    access_reseau: 'no',
    access_admin: 'no',
    can_be_support_agent: 'conditional',
    can_manage_users: 'yes',
  },
  franchisor_user: {
    bypass_all: 'no',
    requires_agency: 'no',
    access_pilotage: 'conditional', // si agence assignée
    access_rh: 'conditional', // si agence assignée
    access_reseau: 'yes',
    access_admin: 'no',
    can_be_support_agent: 'yes',
    can_manage_users: 'yes',
  },
  franchisor_admin: {
    bypass_all: 'no',
    requires_agency: 'no',
    access_pilotage: 'conditional', // si agence assignée
    access_rh: 'conditional', // si agence assignée
    access_reseau: 'yes',
    access_admin: 'yes',
    can_be_support_agent: 'yes',
    can_manage_users: 'yes',
  },
  platform_admin: {
    bypass_all: 'yes',
    requires_agency: 'no',
    access_pilotage: 'yes',
    access_rh: 'yes',
    access_reseau: 'yes',
    access_admin: 'yes',
    can_be_support_agent: 'yes',
    can_manage_users: 'yes',
  },
  superadmin: {
    bypass_all: 'yes',
    requires_agency: 'no',
    access_pilotage: 'yes',
    access_rh: 'yes',
    access_reseau: 'yes',
    access_admin: 'yes',
    can_be_support_agent: 'yes',
    can_manage_users: 'yes',
  },
};

function CapabilityCell({ value }: { value: 'yes' | 'no' | 'conditional' }) {
  if (value === 'yes') {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="h-4 w-4 text-green-600" />
        </div>
      </div>
    );
  }
  if (value === 'conditional') {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <Minus className="h-4 w-4 text-yellow-600" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        <X className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export function RoleMatrixTab() {
  return (
    <div className="space-y-6">
      {/* Légende */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Matrice des Capacités par Rôle</CardTitle>
          <CardDescription>
            Vue d'ensemble des permissions natives de chaque niveau de rôle (lecture seule)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-sm">Activé par défaut</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Minus className="h-3 w-3 text-yellow-600" />
              </div>
              <span className="text-sm">Conditionnel / Sur option</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <X className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-sm">Non disponible</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrice */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium sticky left-0 bg-muted/50 min-w-[200px]">
                    Capacité
                  </th>
                  {ROLES_ORDER.map(role => (
                    <th key={role} className="text-center p-4 font-medium min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <Badge 
                          variant={BYPASS_ROLES.includes(role) ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          N{ROLE_HIERARCHY[role]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {GLOBAL_ROLE_LABELS[role]}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX_CAPABILITIES.map((cap, idx) => (
                  <tr 
                    key={cap.id} 
                    className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                  >
                    <td className="p-4 sticky left-0 bg-inherit">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <span className="font-medium">{cap.label}</span>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[300px]">
                            <p>{cap.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="text-xs text-muted-foreground">{cap.category}</span>
                    </td>
                    {ROLES_ORDER.map(role => (
                      <td key={role} className="p-4">
                        <CapabilityCell value={CAPABILITY_MATRIX[role][cap.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes importantes */}
      <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600" />
            Règles métier importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>N5+ (Platform Admin, Superadmin)</strong> : Bypass total de tous les contrôles de modules.</p>
          <p><strong>N1/N2 (Franchisé)</strong> : DOIVENT avoir une agence assignée pour fonctionner correctement.</p>
          <p><strong>N3/N4 (Franchiseur)</strong> : N'ont PAS d'agence par défaut, accèdent au réseau multi-agences.</p>
          <p><strong>Modules Agence</strong> (Pilotage, RH, Parc) : Nécessitent une agence pour être accessibles.</p>
        </CardContent>
      </Card>
    </div>
  );
}
