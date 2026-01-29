/**
 * Hook useEffectiveAuth
 * 
 * Retourne les données d'authentification effectives en tenant compte de l'impersonation.
 * Quand l'impersonation d'un utilisateur réel est active, les données de l'utilisateur
 * impersonné sont retournées à la place des vraies données.
 * 
 * Utiliser ce hook dans tous les composants/hooks qui doivent respecter l'impersonation
 * (notamment pour les modules qui filtrent par agence comme RH, Salariés, etc.)
 */

import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules } from '@/types/modules';

export interface EffectiveAuthData {
  // Données effectives (réelles ou impersonnées)
  agence: string | null;
  agencyId: string | null;
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;
  roleAgence: string | null;
  firstName: string | null;
  lastName: string | null;
  
  // Métadonnées
  isImpersonating: boolean;
  impersonatedUserName: string | null;
  
  // Données réelles toujours disponibles (pour l'admin)
  realAgencyId: string | null;
  realGlobalRole: GlobalRole | null;
}

export function useEffectiveAuth(): EffectiveAuthData {
  const auth = useAuth();
  const { isRealUserImpersonation, impersonatedUser } = useImpersonation();
  
  // Si impersonation active, utiliser les données de l'utilisateur impersonné
  if (isRealUserImpersonation && impersonatedUser) {
    return {
      // Données impersonnées
      agence: impersonatedUser.agence,
      agencyId: impersonatedUser.agencyId,
      globalRole: impersonatedUser.globalRole,
      enabledModules: impersonatedUser.enabledModules,
      roleAgence: impersonatedUser.roleAgence,
      firstName: impersonatedUser.firstName,
      lastName: impersonatedUser.lastName,
      
      // Métadonnées
      isImpersonating: true,
      impersonatedUserName: [impersonatedUser.firstName, impersonatedUser.lastName]
        .filter(Boolean)
        .join(' ') || impersonatedUser.email || 'Utilisateur inconnu',
      
      // Données réelles préservées
      realAgencyId: auth.agencyId,
      realGlobalRole: auth.globalRole,
    };
  }
  
  // Sinon, retourner les données réelles
  return {
    agence: auth.agence,
    agencyId: auth.agencyId,
    globalRole: auth.globalRole,
    enabledModules: auth.enabledModules,
    roleAgence: auth.roleAgence,
    firstName: auth.firstName,
    lastName: auth.lastName,
    
    // Métadonnées
    isImpersonating: false,
    impersonatedUserName: null,
    
    // Données réelles
    realAgencyId: auth.agencyId,
    realGlobalRole: auth.globalRole,
  };
}
