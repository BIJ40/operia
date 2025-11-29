import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { logAuth } from '@/lib/logger';

// ============================================================================
// SYSTÈME V2.0 - Imports des types et fonctions
// ============================================================================
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, ModuleKey, isModuleEnabled as checkModuleEnabled, isModuleOptionEnabled } from '@/types/modules';
import { 
  AccessControlContext,
  getGlobalRoleFromLegacy,
  getEnabledModulesFromLegacy,
  hasGlobalRole as hasGlobalRoleFn,
  hasModule as hasModuleFn,
  hasModuleOption as hasModuleOptionFn,
} from '@/types/accessControl';

interface AuthContextType {
  // État utilisateur
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: User | null;
  isLoggingOut: boolean;
  
  // Profil utilisateur
  agence: string | null;
  roleAgence: string | null;
  mustChangePassword: boolean;
  
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
  isAdmin: boolean;        // globalRole >= platform_admin (N5)
  isSupport: boolean;      // hasModule('support') ou capability support
  isFranchiseur: boolean;  // globalRole >= franchisor_user (N3)
  
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  
  // ============================================================================
  // COMPATIBILITÉ TEMPORAIRE - À SUPPRIMER PROGRESSIVEMENT
  // Ces méthodes retournent toujours true pour ne pas bloquer les fonctionnalités
  // ============================================================================
  /** @deprecated Utiliser hasGlobalRole() ou hasModule() */
  canViewScope: (scopeSlug: string) => boolean;
  /** @deprecated Utiliser hasGlobalRole('franchisee_admin') */
  canEditScope: (scopeSlug: string) => boolean;
  /** @deprecated Utiliser hasGlobalRole('franchisee_admin') */
  canCreateScope: (scopeSlug: string) => boolean;
  /** @deprecated Utiliser hasGlobalRole('franchisor_user') */
  canDeleteScope: (scopeSlug: string) => boolean;
  /** @deprecated Utiliser hasGlobalRole('platform_admin') */
  canAdminScope: (scopeSlug: string) => boolean;
  /** @deprecated Ne plus utiliser */
  getEffectivePermission: (scopeSlug: string) => { level: number; canView: boolean; canEdit: boolean; canCreate: boolean; canDelete: boolean; canAdmin: boolean; source: string };
  /** @deprecated Ne plus utiliser */
  hasCapability: (capability: string) => boolean;
  /** @deprecated Ne plus utiliser */
  hasAccessToBlock: (blockId: string) => boolean;
  /** @deprecated Ne plus utiliser */
  hasAccessToScope: (scope: string) => boolean;
  /** @deprecated Utiliser hasModule('support') */
  canManageTickets: () => boolean;
  /** @deprecated Ne plus utiliser */
  scopes: any[];
  /** @deprecated Ne plus utiliser */
  capabilities: any[];
  /** @deprecated Ne plus utiliser */
  role: any;
  /** @deprecated Ne plus utiliser */
  userPermissions: string[];
  /** @deprecated Ne plus utiliser - utiliser globalRole */
  suggestedGlobalRole: GlobalRole;
  /** @deprecated Ne plus utiliser - utiliser enabledModules */
  suggestedEnabledModules: EnabledModules;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Profil utilisateur
  const [agence, setAgence] = useState<string | null>(null);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  
  // ============================================================================
  // SYSTÈME V2.0 - États principaux
  // ============================================================================
  const [globalRole, setGlobalRole] = useState<GlobalRole | null>(null);
  const [enabledModules, setEnabledModules] = useState<EnabledModules | null>(null);
  const [hasSupportCapability, setHasSupportCapability] = useState(false);

  // ============================================================================
  // Calculs dérivés V2
  // ============================================================================
  const globalRoleLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
  const isAdmin = globalRoleLevel >= GLOBAL_ROLES.platform_admin; // N5+
  const isFranchiseur = globalRoleLevel >= GLOBAL_ROLES.franchisor_user; // N3+
  const isSupport = hasSupportCapability || checkModuleEnabled(enabledModules, 'support');

  // Contexte d'accès V2.0
  const accessContext: AccessControlContext = {
    globalRole: globalRole ?? 'base_user',
    enabledModules: enabledModules ?? {},
    legacyIsAdmin: isAdmin,
    legacyIsSupport: isSupport,
    legacyIsFranchiseur: isFranchiseur,
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
      // 1. Charger le profil avec les champs V2
      const { data: profile } = await supabase
        .from('profiles')
        .select('agence, role_agence, must_change_password, global_role, enabled_modules, system_role, support_level')
        .eq('id', userId)
        .single();
      
      setAgence(profile?.agence || null);
      setRoleAgence(profile?.role_agence || null);
      setMustChangePassword(profile?.must_change_password || false);

      // 2. Charger les rôles système pour le mapping legacy
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      const hasAdminRole = roles?.some(r => r.role === 'admin') || false;
      const hasFranchiseurRole = roles?.some(r => r.role === 'franchiseur') || false;

      // 3. Charger les capabilities (support)
      const { data: capabilitiesData } = await supabase
        .from('user_capabilities')
        .select('capability, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      const supportCapability = capabilitiesData?.some(
        (c: { capability: string }) => c.capability === 'support'
      ) || false;
      setHasSupportCapability(supportCapability);

      // 4. Charger le rôle franchiseur si applicable
      let userFranchiseurRole: string | null = null;
      if (hasFranchiseurRole) {
        const { data: franchiseurRoleData } = await supabase
          .from('franchiseur_roles')
          .select('franchiseur_role')
          .eq('user_id', userId)
          .single();
        userFranchiseurRole = franchiseurRoleData?.franchiseur_role || null;
      }

      // ========================================================================
      // V2.0 - Détermination du global_role et enabled_modules
      // ========================================================================
      const dbGlobalRole = profile?.global_role as GlobalRole | null;
      const dbEnabledModules = profile?.enabled_modules as EnabledModules | null;

      // Si les valeurs V2 sont en DB, les utiliser directement
      // Sinon, calculer depuis le legacy
      if (dbGlobalRole) {
        setGlobalRole(dbGlobalRole);
      } else {
        // Fallback: calculer depuis legacy
        const computedRole = getGlobalRoleFromLegacy({
          systemRole: profile?.system_role,
          roleAgence: profile?.role_agence,
          hasAdminRole,
          hasSupportRole: supportCapability,
          hasFranchiseurRole,
          franchiseurRole: userFranchiseurRole,
          supportLevel: profile?.support_level,
        });
        setGlobalRole(computedRole);
      }

      if (dbEnabledModules) {
        setEnabledModules(dbEnabledModules);
      } else {
        // Fallback: calculer depuis legacy
        const effectiveRole = dbGlobalRole || getGlobalRoleFromLegacy({
          systemRole: profile?.system_role,
          roleAgence: profile?.role_agence,
          hasAdminRole,
          hasSupportRole: supportCapability,
          hasFranchiseurRole,
          franchiseurRole: userFranchiseurRole,
          supportLevel: profile?.support_level,
        });
        const computedModules = getEnabledModulesFromLegacy({
          globalRole: effectiveRole,
          hasAdminRole,
          hasSupportRole: supportCapability,
          hasFranchiseurRole,
          supportLevel: profile?.support_level,
        });
        setEnabledModules(computedModules);
      }

      // Logging en dev
      if (import.meta.env.DEV) {
        logAuth.info('[AUTH][V2] User loaded:', {
          userId,
          dbGlobalRole,
          dbEnabledModules: dbEnabledModules ? 'defined' : 'null',
          effectiveGlobalRole: dbGlobalRole || 'computed from legacy',
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
          setRoleAgence(null);
          setMustChangePassword(false);
          setGlobalRole(null);
          setEnabledModules(null);
          setHasSupportCapability(false);
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
      setRoleAgence(null);
      setMustChangePassword(false);
      setGlobalRole(null);
      setEnabledModules(null);
      setHasSupportCapability(false);
      setUser(null);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      window.location.href = '/';
    }
  };

  // ============================================================================
  // WRAPPERS DE COMPATIBILITÉ - Retournent des valeurs par défaut non-bloquantes
  // À terme, les composants doivent migrer vers hasGlobalRole/hasModule
  // ============================================================================
  const canViewScope = useCallback((scopeSlug: string): boolean => {
    // V2: Vérifier via le système de modules
    if (isAdmin) return true;
    
    // Mapping scope -> module
    if (['apogee', 'apporteurs', 'helpconfort', 'documents'].includes(scopeSlug)) {
      return checkModuleEnabled(enabledModules, 'help_academy');
    }
    if (['mes_indicateurs', 'actions_a_mener', 'diffusion'].includes(scopeSlug)) {
      return checkModuleEnabled(enabledModules, 'pilotage_agence');
    }
    if (['support_tickets', 'mes_demandes', 'support'].includes(scopeSlug)) {
      return checkModuleEnabled(enabledModules, 'support');
    }
    if (scopeSlug.startsWith('franchiseur_')) {
      return checkModuleEnabled(enabledModules, 'reseau_franchiseur');
    }
    if (scopeSlug.startsWith('admin_')) {
      return checkModuleEnabled(enabledModules, 'admin_plateforme');
    }
    
    // Par défaut, autoriser (ne pas bloquer)
    return true;
  }, [isAdmin, enabledModules]);

  const canEditScope = useCallback((_scopeSlug: string): boolean => {
    return globalRoleLevel >= GLOBAL_ROLES.franchisee_admin;
  }, [globalRoleLevel]);

  const canCreateScope = useCallback((_scopeSlug: string): boolean => {
    return globalRoleLevel >= GLOBAL_ROLES.franchisee_admin;
  }, [globalRoleLevel]);

  const canDeleteScope = useCallback((_scopeSlug: string): boolean => {
    return globalRoleLevel >= GLOBAL_ROLES.franchisor_user;
  }, [globalRoleLevel]);

  const canAdminScope = useCallback((_scopeSlug: string): boolean => {
    return globalRoleLevel >= GLOBAL_ROLES.platform_admin;
  }, [globalRoleLevel]);

  const getEffectivePermission = useCallback((_scopeSlug: string) => {
    // Wrapper de compatibilité - retourne permissions basées sur globalRole
    const level = isAdmin ? 4 : isFranchiseur ? 3 : globalRoleLevel >= 2 ? 2 : 1;
    return {
      level,
      canView: level >= 1,
      canEdit: level >= 2,
      canCreate: level >= 2,
      canDelete: level >= 3,
      canAdmin: level >= 4,
      source: 'v2_compat',
    };
  }, [isAdmin, isFranchiseur, globalRoleLevel]);

  const hasCapability = useCallback((capability: string): boolean => {
    if (isAdmin) return true;
    if (capability === 'support') return hasSupportCapability;
    return false;
  }, [isAdmin, hasSupportCapability]);

  const hasAccessToBlock = useCallback((_blockId: string): boolean => true, []);
  const hasAccessToScope = useCallback((_scope: string): boolean => true, []);
  const canManageTickets = useCallback((): boolean => {
    return isAdmin || isSupport || isFranchiseur;
  }, [isAdmin, isSupport, isFranchiseur]);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user,
      isAuthLoading,
      user,
      isLoggingOut,
      
      // Profil
      agence,
      roleAgence,
      mustChangePassword,
      
      // ========================================================================
      // V2.0 - Source de vérité
      // ========================================================================
      globalRole,
      enabledModules,
      accessContext,
      hasGlobalRole: hasGlobalRoleGuard,
      hasModule: hasModuleGuard,
      hasModuleOption: hasModuleOptionGuard,
      
      // Helpers dérivés V2
      isAdmin,
      isSupport,
      isFranchiseur,
      
      // Auth
      login, 
      logout,
      signup,
      
      // Compatibilité (deprecated)
      canViewScope,
      canEditScope,
      canCreateScope,
      canDeleteScope,
      canAdminScope,
      getEffectivePermission,
      hasCapability,
      hasAccessToBlock,
      hasAccessToScope,
      canManageTickets,
      scopes: [],
      capabilities: [],
      role: null,
      userPermissions: [],
      suggestedGlobalRole: globalRole ?? 'base_user',
      suggestedEnabledModules: enabledModules ?? {},
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
