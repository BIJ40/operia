import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';

// ============================================================================
// SYSTÈME V2.0 - Imports des types et fonctions
// ============================================================================
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, ModuleKey, isModuleEnabled as checkModuleEnabled } from '@/types/modules';
import { 
  AccessControlContext,
  hasGlobalRole as hasGlobalRoleFn,
  hasModule as hasModuleFn,
  hasModuleOption as hasModuleOptionFn,
} from '@/types/accessControl';
import { getRoleCapabilities } from '@/config/roleMatrix';

// Types pour le module Support
interface SupportModuleOptions {
  user?: boolean;   // Portail Mes Demandes
  agent?: boolean;  // Accès console support
  admin?: boolean;  // Admin support
}

interface AuthContextType {
  // État utilisateur
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: User | null;
  isLoggingOut: boolean;
  
  // Profil utilisateur
  agence: string | null;
  agencyId: string | null; // UUID de l'agence
  roleAgence: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  
  // ============================================================================
  // SYSTÈME V2.0 - Source de vérité unique
  // ============================================================================
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;
  accessContext: AccessControlContext;
  
  // Guards V2.0 - À UTILISER PARTOUT
  hasGlobalRole: (requiredRole: GlobalRole) => boolean;
  hasModule: (moduleKey: ModuleKey) => boolean;
  hasModuleOption: (moduleKey: ModuleKey, optionKey: string) => boolean;
  
  // Helpers de niveau V2
  isAdmin: boolean;
  isSupport: boolean;
  isFranchiseur: boolean;
  
  // ============================================================================
  // MODULE SUPPORT - Flags granulaires
  // ============================================================================
  canAccessSupportUser: boolean;    // Portail Mes Demandes (toujours true)
  isSupportAgent: boolean;          // Accès console support
  isSupportAdmin: boolean;          // Admin support
  canAccessSupportConsole: boolean; // Alias de isSupportAgent pour compatibilité
  canManageTickets: boolean;        // Alias de isSupportAgent
  
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  
  // Compatibilité minimale
  hasAccessToScope: (scope: string) => boolean;
  suggestedGlobalRole: GlobalRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Profil utilisateur
  const [agence, setAgence] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // ============================================================================
  // SYSTÈME V2.0 - États principaux
  // ============================================================================
  const [globalRole, setGlobalRole] = useState<GlobalRole | null>(null);
  const [enabledModules, setEnabledModules] = useState<EnabledModules | null>(null);

  // ============================================================================
  // Calculs dérivés V2
  // ============================================================================
  const globalRoleLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
  const isAdmin = globalRoleLevel >= GLOBAL_ROLES.platform_admin; // N5+
  const isFranchiseur = globalRoleLevel >= GLOBAL_ROLES.franchisor_user; // N3+
  const isSupport = checkModuleEnabled(enabledModules, 'support');

  // ============================================================================
  // MODULE SUPPORT - Logique granulaire
  // ============================================================================
  const isSuperAdmin = globalRole === 'superadmin';
  
  // Parser le module support depuis enabled_modules
  const supportModule: SupportModuleOptions = 
    (typeof enabledModules?.support === 'object' && enabledModules?.support !== null)
      ? (enabledModules.support as SupportModuleOptions)
      : {};
  
  // Flags support - superadmin a toujours tous les accès
  const canAccessSupportUser = true; // Tous les utilisateurs peuvent accéder au portail
  const isSupportAgent = isSuperAdmin || supportModule.agent === true;
  const isSupportAdmin = isSuperAdmin || supportModule.admin === true;
  
  // Aliases pour compatibilité
  const canAccessSupportConsole = isSupportAgent;
  const canManageTickets = isSupportAgent;

  // Contexte d'accès V2.0
  const accessContext: AccessControlContext = {
    globalRole: globalRole ?? 'base_user',
    enabledModules: enabledModules ?? {},
  };

  // ============================================================================
  // Guards V2.0 - À utiliser partout
  // ============================================================================
  const hasGlobalRoleGuard = useCallback((requiredRole: GlobalRole): boolean => {
    return hasGlobalRoleFn(accessContext, requiredRole);
  }, [accessContext]);

  const hasModuleGuard = useCallback((moduleKey: ModuleKey): boolean => {
    return hasModuleFn(accessContext, moduleKey);
  }, [accessContext]);

  const hasModuleOptionGuard = useCallback((moduleKey: ModuleKey, optionKey: string): boolean => {
    return hasModuleOptionFn(accessContext, moduleKey, optionKey);
  }, [accessContext]);

  // ============================================================================
  // Chargement des données utilisateur (V2 ONLY)
  // ============================================================================
  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Charger le profil avec les champs V2
      const { data: profile } = await supabase
        .from('profiles')
        .select('agence, agency_id, role_agence, must_change_password, global_role, enabled_modules, is_active')
        .eq('id', userId)
        .single();
      
      setAgence(profile?.agence || null);
      setAgencyId(profile?.agency_id || null);
      setRoleAgence(profile?.role_agence || null);
      setMustChangePassword(profile?.must_change_password || false);
      
      // Vérifier si le compte est actif
      const accountActive = profile?.is_active !== false; // true par défaut
      setIsActive(accountActive);
      
      // Si le compte est désactivé, forcer la déconnexion
      if (!accountActive) {
        logAuth.warn('[AUTH] Compte désactivé, déconnexion forcée');
        await supabase.auth.signOut();
        toast.error('Votre compte a été désactivé. Contactez votre responsable ou le support.', {
          duration: 8000,
        });
        return;
      }

      // V2.0 - Utiliser directement les valeurs de la DB
      const dbGlobalRole = profile?.global_role as GlobalRole | null;
      const dbEnabledModules = profile?.enabled_modules as EnabledModules | null;

      // Définir le rôle global (valeur par défaut si non défini)
      setGlobalRole(dbGlobalRole || 'base_user');
      
      // Définir les modules activés (objet vide si non défini)
      setEnabledModules(dbEnabledModules || {});

      // Logging en dev
      if (import.meta.env.DEV) {
        logAuth.info('[AUTH][V2] User loaded:', {
          userId,
          globalRole: dbGlobalRole || 'base_user (default)',
          modulesCount: dbEnabledModules ? Object.keys(dbEnabledModules).length : 0,
        });
      }

    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    }
  }, []);

  // ============================================================================
  // Gestion de l'authentification Supabase
  // ============================================================================
  useEffect(() => {
    let isLoadingUserData = false;
    let isMounted = true;
    
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            if (!isMounted || isLoadingUserData) return;
            isLoadingUserData = true;
            setIsAuthLoading(true);
            await loadUserData(session.user.id);
            if (isMounted) {
              setIsAuthLoading(false);
            }
            isLoadingUserData = false;
          }, 0);
        } else {
          setIsAuthLoading(false);
        }
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };
    
    init();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            if (!isMounted || isLoadingUserData) return;
            isLoadingUserData = true;
            setIsAuthLoading(true);
            try {
              await loadUserData(session.user.id);
            } catch (error) {
              console.error('Erreur chargement données utilisateur:', error);
            }
            if (isMounted) {
              setIsAuthLoading(false);
            }
            isLoadingUserData = false;
          }, 0);
        } else {
          // Reset state on logout
          setAgence(null);
          setAgencyId(null);
          setRoleAgence(null);
          setMustChangePassword(false);
          setIsActive(true);
          setGlobalRole(null);
          setEnabledModules(null);
          setIsAuthLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // ============================================================================
  // Actions d'authentification
  // ============================================================================
  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      console.error('Erreur connexion:', err);
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await supabase.auth.signOut();

      Object.keys(localStorage)
        .filter((key) => key.startsWith('sb-'))
        .forEach((key) => localStorage.removeItem(key));

      localStorage.removeItem('editMode');
      
      // Reset V2 state
      setAgence(null);
      setAgencyId(null);
      setRoleAgence(null);
      setMustChangePassword(false);
      setIsActive(true);
      setGlobalRole(null);
      setEnabledModules(null);
      setUser(null);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      window.location.href = '/';
    }
  };

  // Wrappers minimaux de compatibilité
  const hasAccessToScope = useCallback((_scope: string): boolean => true, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user,
      isAuthLoading,
      user,
      isLoggingOut,
      agence,
      agencyId,
      roleAgence,
      mustChangePassword,
      isActive,
      globalRole,
      enabledModules,
      accessContext,
      hasGlobalRole: hasGlobalRoleGuard,
      hasModule: hasModuleGuard,
      hasModuleOption: hasModuleOptionGuard,
      isAdmin,
      isSupport,
      isFranchiseur,
      // Support module flags
      canAccessSupportUser,
      isSupportAgent,
      isSupportAdmin,
      canAccessSupportConsole,
      canManageTickets,
      // Auth actions
      login, 
      logout,
      signup,
      hasAccessToScope,
      suggestedGlobalRole: globalRole ?? 'base_user',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
