import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { logError } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules, ModuleKey } from '@/types/modules';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface ImpersonatedProfile {
  roleAgence: string | null;
  franchiseurRole: 'animateur' | 'directeur' | 'dg' | null;
  agence: string | null;
  hasIndicateursAccess: boolean;
  hasSupportRole: boolean;
  hasFranchiseurRole: boolean;
}

/**
 * Profil utilisateur réel pour l'impersonation
 * Contient toutes les données nécessaires pour reproduire l'expérience de cet utilisateur
 */
export interface RealUserProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;
  agence: string | null;
  agencyId: string | null;
  roleAgence: string | null;
}

interface ImpersonationContextType {
  // Mode simulation de rôles fictifs (ancien système)
  isImpersonating: boolean;
  impersonatedProfile: ImpersonatedProfile | null;
  startImpersonation: (profile: ImpersonatedProfile) => void;
  stopImpersonation: () => void;
  
  // Mode impersonation utilisateur réel (nouveau système)
  isRealUserImpersonation: boolean;
  impersonatedUser: RealUserProfile | null;
  startRealUserImpersonation: (userId: string) => Promise<boolean>;
  isLoadingRealUser: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ROLE_AGENCE_OPTIONS = [
  { value: 'dirigeant', label: 'Dirigeant' },
  { value: 'administratif', label: 'Administratif' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'technicien', label: 'Technicien' },
  { value: 'tete_de_reseau', label: 'Tête de réseau' },
  { value: 'externe', label: 'Externe' },
];

export const FRANCHISEUR_ROLE_OPTIONS = [
  { value: null, label: 'Aucun' },
  { value: 'animateur', label: 'Animateur réseau' },
  { value: 'directeur', label: 'Directeur réseau' },
  { value: 'dg', label: 'DG' },
];

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // État pour simulation de rôles fictifs
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState<ImpersonatedProfile | null>(null);
  
  // État pour impersonation utilisateur réel
  const [isRealUserImpersonation, setIsRealUserImpersonation] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<RealUserProfile | null>(null);
  const [isLoadingRealUser, setIsLoadingRealUser] = useState(false);

  // Démarrer simulation de rôles fictifs (ancien système)
  const startImpersonation = (profile: ImpersonatedProfile) => {
    // Arrêter d'abord toute impersonation réelle
    setIsRealUserImpersonation(false);
    setImpersonatedUser(null);
    
    setImpersonatedProfile(profile);
    setIsImpersonating(true);
  };

  // Arrêter toute impersonation
  const stopImpersonation = useCallback(() => {
    setImpersonatedProfile(null);
    setIsImpersonating(false);
    setIsRealUserImpersonation(false);
    setImpersonatedUser(null);
    
    // Invalider les caches pour forcer le rechargement avec les vraies données
    queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
    queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    queryClient.invalidateQueries({ queryKey: ['effective-modules'] });
  }, [queryClient]);

  // Démarrer impersonation utilisateur réel
  const startRealUserImpersonation = useCallback(async (userId: string): Promise<boolean> => {
    setIsLoadingRealUser(true);
    
    try {
      // Charger le profil utilisateur depuis la DB
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, global_role, agence, agency_id, role_agence')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        logError('[IMPERSONATION] Erreur chargement profil:', profileError);
        toast.error('Impossible de charger le profil utilisateur');
        return false;
      }
      
      // Charger les modules effectifs via RPC
      const { data: effectiveModules, error: modulesError } = await supabase.rpc(
        'get_user_effective_modules',
        { p_user_id: userId }
      );
      
      // Convertir les modules en EnabledModules
      let resolvedModules: EnabledModules = {};
      if (effectiveModules && Array.isArray(effectiveModules) && effectiveModules.length > 0) {
        for (const row of effectiveModules) {
          const moduleKey = row.module_key as ModuleKey;
          resolvedModules[moduleKey] = {
            enabled: row.enabled === true,
            options: (typeof row.options === 'object' && row.options !== null) 
              ? row.options as Record<string, boolean>
              : {},
          };
        }
      }
      
      // Arrêter toute simulation de rôle fictif
      setIsImpersonating(false);
      setImpersonatedProfile(null);
      
      // Définir l'utilisateur impersonné
      const realUserProfile: RealUserProfile = {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        globalRole: (profile.global_role as GlobalRole) || 'base_user',
        enabledModules: Object.keys(resolvedModules).length > 0 ? resolvedModules : null,
        agence: profile.agence,
        agencyId: profile.agency_id,
        roleAgence: profile.role_agence,
      };
      
      setImpersonatedUser(realUserProfile);
      setIsRealUserImpersonation(true);
      
      // Invalider les caches pour forcer le rechargement avec les données impersonnées
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['effective-modules'] });
      
      const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;
      toast.success(`Vous voyez maintenant l'application comme ${userName}`);
      
      return true;
    } catch (error) {
      logError('[IMPERSONATION] Erreur:', error);
      toast.error('Une erreur est survenue');
      return false;
    } finally {
      setIsLoadingRealUser(false);
    }
  }, []);

  return (
    <ImpersonationContext.Provider value={{
      // Mode simulation fictif
      isImpersonating,
      impersonatedProfile,
      startImpersonation,
      stopImpersonation,
      // Mode utilisateur réel
      isRealUserImpersonation,
      impersonatedUser,
      startRealUserImpersonation,
      isLoadingRealUser,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
